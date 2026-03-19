/**
 * Engagement Routes
 * Manage engagement bot configs, templates, and activity logs
 */

const express = require('express');
const router = express.Router();
const { getSupabaseAdmin } = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');
const { requireCompanyContext } = require('../middleware/companyContext');
const logger = require('../utils/logger');

/**
 * GET /api/engagement/config
 * Get bot config for current company + platform
 */
router.get('/config', requireAuth, requireCompanyContext, async (req, res) => {
  try {
    const { platform } = req.query;

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('engagement_bot_configs')
      .select('*')
      .eq('company_id', req.company.id);

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data: configs, error } = await query;

    if (error) {
      logger.error('Get engagement config error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      configs: configs || []
    });
  } catch (error) {
    logger.error('Get engagement config error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/engagement/config
 * Update bot config
 */
router.put('/config', requireAuth, requireCompanyContext, async (req, res) => {
  try {
    const { id, platform, enabled, settings } = req.body;

    if (!id || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, platform'
      });
    }

    const supabase = getSupabaseAdmin();

    // Verify config belongs to this company
    const { data: existing } = await supabase
      .from('engagement_bot_configs')
      .select('id')
      .eq('id', id)
      .eq('company_id', req.company.id)
      .single();

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Config not found'
      });
    }

    const { data: config, error } = await supabase
      .from('engagement_bot_configs')
      .update({
        ...(typeof enabled === 'boolean' && { enabled }),
        ...(settings && { settings }),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Update engagement config error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      config
    });
  } catch (error) {
    logger.error('Update engagement config error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engagement/templates
 * List comment/reply templates
 */
router.get('/templates', requireAuth, requireCompanyContext, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: templates, error } = await supabase
      .from('engagement_templates')
      .select('*')
      .eq('company_id', req.company.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('List templates error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      templates: templates || []
    });
  } catch (error) {
    logger.error('List templates error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/engagement/templates
 * Add template
 */
router.post('/templates', requireAuth, requireCompanyContext, async (req, res) => {
  try {
    const { name, content, type } = req.body;

    if (!name || !content || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, content, type'
      });
    }

    const supabase = getSupabaseAdmin();
    const { data: template, error } = await supabase
      .from('engagement_templates')
      .insert({
        company_id: req.company.id,
        name,
        content,
        type,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error('Create template error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    res.status(201).json({
      success: true,
      template
    });
  } catch (error) {
    logger.error('Create template error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/engagement/templates/:id
 * Update template
 */
router.put('/templates/:id', requireAuth, requireCompanyContext, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, content, type } = req.body;

    const supabase = getSupabaseAdmin();

    // Verify template belongs to this company
    const { data: existing } = await supabase
      .from('engagement_templates')
      .select('id')
      .eq('id', id)
      .eq('company_id', req.company.id)
      .single();

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const { data: template, error } = await supabase
      .from('engagement_templates')
      .update({
        ...(name && { name }),
        ...(content && { content }),
        ...(type && { type })
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Update template error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    logger.error('Update template error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/engagement/templates/:id
 * Deactivate template
 */
router.delete('/templates/:id', requireAuth, requireCompanyContext, async (req, res) => {
  try {
    const { id } = req.params;

    const supabase = getSupabaseAdmin();

    // Verify template belongs to this company
    const { data: existing } = await supabase
      .from('engagement_templates')
      .select('id')
      .eq('id', id)
      .eq('company_id', req.company.id)
      .single();

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const { error } = await supabase
      .from('engagement_templates')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      logger.error('Delete template error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Template deactivated'
    });
  } catch (error) {
    logger.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engagement/log
 * Paginated engagement activity log
 */
router.get('/log', requireAuth, requireCompanyContext, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const supabase = getSupabaseAdmin();
    const limitNum = Math.min(parseInt(limit) || 50, 500);
    const offsetNum = parseInt(offset) || 0;

    const { data: logs, error, count } = await supabase
      .from('engagement_log')
      .select('*', { count: 'exact' })
      .eq('company_id', req.company.id)
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (error) {
      logger.error('List engagement log error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      logs: logs || [],
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: count
      }
    });
  } catch (error) {
    logger.error('List engagement log error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engagement/stats
 * Summary stats (likes/comments/follows today)
 */
router.get('/stats', requireAuth, requireCompanyContext, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get engagement stats from log (this is a simple implementation)
    // In production, you might want to calculate these from actual social media APIs
    const { data: logs } = await supabase
      .from('engagement_log')
      .select('action_type, action_count')
      .eq('company_id', req.company.id)
      .gte('created_at', today.toISOString());

    // Aggregate the data
    const stats = {
      likes: 0,
      comments: 0,
      follows: 0,
      timestamp: new Date().toISOString(),
      isDemoData: false
    };

    (logs || []).forEach(log => {
      if (log.action_type === 'like') stats.likes += log.action_count || 0;
      if (log.action_type === 'comment') stats.comments += log.action_count || 0;
      if (log.action_type === 'follow') stats.follows += log.action_count || 0;
    });

    // If all stats are zero, return demo data with indicator
    if (stats.likes === 0 && stats.comments === 0 && stats.follows === 0) {
      stats.likes = 47;
      stats.comments = 12;
      stats.follows = 8;
      stats.isDemoData = true;
      stats.message = 'Demo data — connect accounts to see real stats';
    }

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Get engagement stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engagement/stats/detailed
 * Detailed stats by platform, by company, and aggregate
 * Query params: ?period=today|week|month|all  &company_id=xxx  &platform=instagram
 */
router.get('/stats/detailed', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { period, company_id, platform } = req.query;

    // Calculate date range
    const now = new Date();
    let since = new Date();
    if (period === 'week') since.setDate(now.getDate() - 7);
    else if (period === 'month') since.setDate(now.getDate() - 30);
    else if (period === 'all') since = new Date('2020-01-01');
    else since.setHours(0, 0, 0, 0); // today

    // Build query
    let query = supabase.from('engagement_log').select('*').gte('created_at', since.toISOString());
    if (company_id) query = query.eq('company_id', company_id);
    if (platform) query = query.eq('platform', platform);

    const { data: logs } = await query.order('created_at', { ascending: false });
    const items = logs || [];

    // Aggregate by platform
    const byPlatform = {};
    items.forEach(l => {
      if (!byPlatform[l.platform]) byPlatform[l.platform] = { likes: 0, comments: 0, follows: 0, dms: 0, replies: 0, total: 0 };
      const p = byPlatform[l.platform];
      if (l.action_type === 'like') p.likes++;
      else if (l.action_type === 'comment' || l.action_type === 'first_comment') p.comments++;
      else if (l.action_type === 'follow') p.follows++;
      else if (l.action_type === 'dm') p.dms++;
      else if (l.action_type === 'reply') p.replies++;
      p.total++;
    });

    // Aggregate by company
    const byCompany = {};
    items.forEach(l => {
      if (!byCompany[l.company_id]) byCompany[l.company_id] = { likes: 0, comments: 0, follows: 0, total: 0 };
      const c = byCompany[l.company_id];
      if (l.action_type === 'like') c.likes++;
      else if (l.action_type === 'comment' || l.action_type === 'first_comment') c.comments++;
      else if (l.action_type === 'follow') c.follows++;
      c.total++;
    });

    // Overall totals
    const totals = { likes: 0, comments: 0, follows: 0, dms: 0, replies: 0, first_comments: 0, total: items.length };
    items.forEach(l => {
      if (l.action_type === 'like') totals.likes++;
      else if (l.action_type === 'comment') totals.comments++;
      else if (l.action_type === 'first_comment') totals.first_comments++;
      else if (l.action_type === 'follow') totals.follows++;
      else if (l.action_type === 'dm') totals.dms++;
      else if (l.action_type === 'reply') totals.replies++;
    });

    // Success rate
    const successCount = items.filter(l => l.success).length;
    totals.success_rate = items.length > 0 ? Math.round((successCount / items.length) * 100) : 0;

    // Recent activity (last 20)
    const recent = items.slice(0, 20).map(l => ({
      id: l.id,
      platform: l.platform,
      action: l.action_type,
      target: l.target_username || l.target_post_id,
      text: l.comment_text,
      success: l.success,
      error: l.error_message,
      time: l.created_at
    }));

    res.json({
      success: true,
      period: period || 'today',
      totals,
      by_platform: byPlatform,
      by_company: byCompany,
      recent
    });
  } catch (error) {
    logger.error('Detailed engagement stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/engagement/status
 * Alias for /api/engagement/config - Frontend compatibility
 */
router.get('/status', requireAuth, requireCompanyContext, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();

    const { data: configs, error } = await supabase
      .from('engagement_bot_configs')
      .select('*')
      .eq('company_id', req.company.id);

    if (error) {
      logger.error('Get engagement status error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      data: {
        enabled: configs && configs.length > 0 && (configs[0].is_active || configs[0].enabled),
        configs: configs || []
      }
    });
  } catch (error) {
    logger.error('Get engagement status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/engagement/status
 * Alias for updating bot enabled status - Frontend compatibility
 */
router.put('/status', requireAuth, requireCompanyContext, async (req, res) => {
  try {
    const { enabled } = req.body;
    const supabase = getSupabaseAdmin();

    // Get or create config for primary platform
    const { data: existing } = await supabase
      .from('engagement_bot_configs')
      .select('*')
      .eq('company_id', req.company.id)
      .limit(1)
      .single();

    if (!existing) {
      // Create new config
      const { data: config, error } = await supabase
        .from('engagement_bot_configs')
        .insert([{
          company_id: req.company.id,
          platform: 'instagram',
          is_active: enabled !== undefined ? enabled : true
        }])
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, data: { ...config, enabled: config.is_active } });
    }

    // Update existing config
    const { data: config, error } = await supabase
      .from('engagement_bot_configs')
      .update({
        is_active: enabled !== undefined ? enabled : existing.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data: { ...config, enabled: config.is_active } });
  } catch (error) {
    logger.error('Update engagement status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engagement/hashtags
 * Get hashtags for engagement automation
 */
router.get('/hashtags', requireAuth, requireCompanyContext, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();

    // For now, return empty hashtags. In production, fetch from DB or config
    res.json({
      success: true,
      data: {
        hashtags: [],
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get engagement hashtags error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/engagement/hashtags
 * Update hashtags for engagement automation
 */
router.put('/hashtags', requireAuth, requireCompanyContext, async (req, res) => {
  try {
    const { hashtags } = req.body;

    // In production, save to config/DB
    res.json({
      success: true,
      data: {
        hashtags: hashtags || [],
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Update engagement hashtags error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engagement/activities
 * Alias for /api/engagement/log - Frontend compatibility
 */
router.get('/activities', requireAuth, requireCompanyContext, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();

    const { data: activities, error } = await supabase
      .from('engagement_log')
      .select('*')
      .eq('company_id', req.company.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('Get engagement activities error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      data: activities || []
    });
  } catch (error) {
    logger.error('Get engagement activities error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
