/**
 * Engagement Bot Routes — Noir Factory Frontend
 * 
 * Architecture:
 * Noir Factory /bot dashboard (UI) → these routes → n8n webhook (backend)
 * n8n executes engagement actions → logs results to Supabase engagement_log
 * Dashboard reads engagement_log → displays results
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { getSupabaseAdmin } = require('../db/supabase');

const N8N_WEBHOOK_URL = process.env.N8N_ENGAGEMENT_WEBHOOK_URL || 
  'https://n8n.autogrowthhub.com/webhook/noir-engagement-bot';

/**
 * Forward request to n8n backend and return response
 */
async function callN8nEngagementBot(payload) {
  const response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000)
  });
  
  if (!response.ok) {
    throw new Error(`n8n webhook returned ${response.status}: ${await response.text()}`);
  }
  
  return response.json();
}

/**
 * POST /api/engagement/run-cycle
 * Noir Factory dashboard triggers engagement cycle → sends to n8n backend
 */
router.post('/run-cycle', async (req, res) => {
  try {
    const { platform, company_id } = req.body;
    const companyId = company_id || req.headers['x-company-id'] || 'default-company';

    logger.info(`[Engagement Bot] Triggering cycle via n8n | company: ${companyId} | platform: ${platform || 'all'}`);

    const result = await callN8nEngagementBot({
      action: 'run_cycle',
      company_id: companyId,
      platform: platform || null,
      triggered_from: 'noir_factory_dashboard',
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Engagement cycle triggered via n8n`,
      company_id: companyId,
      platform: platform || 'all',
      n8n_result: result
    });

  } catch (error) {
    logger.error('Error triggering engagement cycle via n8n:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/engagement/bot/status
 * Get engagement bot status from n8n
 */
router.get('/bot/status', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default-company';

    const result = await callN8nEngagementBot({
      action: 'get_status',
      company_id: companyId
    });

    res.json({
      success: true,
      status: result.bot_status || {
        is_running: true,
        backend: 'n8n',
        webhook_url: N8N_WEBHOOK_URL,
        message: 'Engagement bot running via n8n'
      },
      n8n_result: result
    });

  } catch (error) {
    logger.error('Error getting bot status from n8n:', error);
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

    // Notify n8n of config update
    await callN8nEngagementBot({
      action: 'update_config',
      company_id: companyId,
      platform,
      config: configData
    }).catch(e => logger.warn('n8n config update notify failed:', e.message));

    res.json({ success: true, config: data?.[0], backend: 'n8n' });

  } catch (error) {
    logger.error('Error updating engagement config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
