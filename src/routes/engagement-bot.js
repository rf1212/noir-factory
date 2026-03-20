/**
 * Engagement Bot Routes — Noir Factory Frontend
 *
 * Architecture:
 * Noir Factory /bot dashboard (UI) → these routes → Supabase (data layer)
 * n8n scheduled workflow (every 5 min) → reads configs from Supabase →
 *   executes engagement actions via Meta Graph API → logs results to engagement_log
 * Dashboard reads engagement_log → displays results
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { getSupabaseAdmin } = require('../db/supabase');

/**
 * POST /api/engagement/run-cycle
 * Log a manual trigger request — n8n scheduled bot picks up active configs automatically
 */
router.post('/run-cycle', async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { platform, company_id } = req.body;
    const companyId = company_id || req.headers['x-company-id'] || 'default-company';

    logger.info(`[Engagement Bot] Manual cycle trigger | company: ${companyId} | platform: ${platform || 'all'}`);

    // Log the manual trigger
    await supabase.from('engagement_log').insert({
      company_id: companyId,
      platform: platform || 'all',
      action_type: 'manual_trigger',
      success: true,
      created_at: new Date().toISOString()
    });

    // Get current config status
    let query = supabase
      .from('engagement_bot_configs')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true);
    if (platform) query = query.eq('platform', platform);
    const { data: configs } = await query;

    // Check token status
    const { data: integrations } = await supabase
      .from('company_integrations')
      .select('platform, page_id, expires_at')
      .eq('company_id', companyId)
      .eq('is_active', true);

    const hasToken = integrations && integrations.length > 0;

    res.json({
      success: true,
      message: 'Engagement cycle acknowledged. n8n scheduled bot runs every 5 minutes and will pick up active configs.',
      company_id: companyId,
      platform: platform || 'all',
      active_configs: configs?.length || 0,
      token_status: hasToken ? 'present' : 'MISSING — Chairman must refresh Facebook token from Meta Business Suite',
      backend: 'n8n_scheduled',
      next_run: 'Within 5 minutes (n8n cron)'
    });

  } catch (error) {
    logger.error('Error in manual engagement trigger:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/engagement/bot/status
 * Get engagement bot status directly from Supabase
 */
router.get('/bot/status', async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const companyId = req.headers['x-company-id'] || 'default-company';

    // Get active configs
    const { data: configs } = await supabase
      .from('engagement_bot_configs')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true);

    // Get recent activity
    const { data: recentLogs } = await supabase
      .from('engagement_log')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get template count
    const { data: templates } = await supabase
      .from('engagement_templates')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_active', true);

    // Check token status
    const { data: integrations } = await supabase
      .from('company_integrations')
      .select('platform, page_id, expires_at')
      .eq('company_id', companyId)
      .eq('is_active', true);

    const fbIntegration = integrations?.find(i => i.platform === 'facebook');
    const tokenExpired = fbIntegration?.expires_at ? new Date(fbIntegration.expires_at) < new Date() : true;

    res.json({
      success: true,
      status: {
        is_running: true,
        backend: 'n8n_scheduled',
        schedule: 'Every 5 minutes',
        active_configs: configs?.length || 0,
        platforms: [...new Set(configs?.map(c => c.platform) || [])],
        template_count: templates?.length || 0,
        facebook_token_status: fbIntegration ? (tokenExpired ? 'EXPIRED' : 'VALID') : 'MISSING',
        recent_activity: recentLogs?.slice(0, 5) || [],
        total_actions_logged: recentLogs?.length || 0,
        message: fbIntegration && !tokenExpired
          ? 'Engagement bot operational'
          : 'Bot ready but Facebook token needs refresh from Meta Business Suite'
      }
    });

  } catch (error) {
    logger.error('Error getting bot status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/engagement/log
 * Get engagement action log from Supabase (populated by n8n)
 */
router.get('/log', async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const companyId = req.headers['x-company-id'] || 'default-company';
    const limit = parseInt(req.query.limit) || 50;
    const platform = req.query.platform;

    let query = supabase
      .from('engagement_log')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (platform) query = query.eq('platform', platform);

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      count: data?.length || 0,
      logs: data || [],
      source: 'n8n_backend'
    });

  } catch (error) {
    logger.error('Error fetching engagement log:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/engagement/config
 * Get engagement bot config from Supabase
 */
router.get('/config', async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const companyId = req.headers['x-company-id'] || 'default-company';

    const { data: configs, error } = await supabase
      .from('engagement_bot_configs')
      .select('*')
      .eq('company_id', companyId);

    if (error) throw error;

    res.json({ success: true, configs: configs || [], backend: 'n8n' });

  } catch (error) {
    logger.error('Error fetching engagement config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/engagement/config
 * Update engagement bot config — stored in Supabase, read by n8n
 */
router.put('/config', async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const companyId = req.headers['x-company-id'] || 'default-company';
    const { platform, ...configData } = req.body;

    const { data, error } = await supabase
      .from('engagement_bot_configs')
      .upsert({
        company_id: companyId,
        platform: platform || 'instagram',
        ...configData,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) throw error;

    // n8n reads configs directly from Supabase on its schedule — no webhook notify needed

    res.json({ success: true, config: data?.[0], backend: 'n8n_scheduled' });

  } catch (error) {
    logger.error('Error updating engagement config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
