/**
 * Automation Routes — Noir Factory
 * Manages the 4 automation services ported from Cloudflare Worker:
 *   engagement_bot, health_monitor, token_monitor, dead_letter_queue
 *
 * All routes require X-Auth-Token and X-Company-ID headers.
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { getSupabaseAdmin } = require('../db/supabase');
const { getAutomationConfig, updateAutomationStatus } = require('../services/automation-engine');
const { runEngagementBot } = require('../services/engagement-bot-v2');
const { runHealthMonitor } = require('../services/health-monitor');
const { runTokenMonitor } = require('../services/token-monitor');
const { runDeadLetterQueue } = require('../services/dead-letter-queue');

const VALID_TYPES = ['engagement_bot', 'health_monitor', 'token_monitor', 'dead_letter_queue'];

/**
 * GET /api/automation/status
 * Returns status of all 4 automations
 */
router.get('/status', async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: statuses, error } = await supabase
      .from('automation_status')
      .select('*')
      .order('automation_type', { ascending: true });

    if (error) {
      // Table might not exist — return defaults
      return res.json({
        success: true,
        automations: VALID_TYPES.map(type => ({
          automation_type: type,
          enabled: type !== 'engagement_bot',
          last_status: 'never_run',
          last_run_at: null,
          config: {},
          last_result: null
        })),
        table_missing: true
      });
    }

    // Fill defaults for any missing types
    const result = VALID_TYPES.map(type => {
      const existing = statuses.find(s => s.automation_type === type);
      return existing || {
        automation_type: type,
        enabled: type !== 'engagement_bot',
        last_status: 'never_run',
        last_run_at: null,
        config: {},
        last_result: null
      };
    });

    res.json({ success: true, automations: result });
  } catch (err) {
    logger.error('Automation status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/automation/toggle
 * Enable/disable an automation
 * Body: { automation_type, enabled }
 */
router.post('/toggle', async (req, res) => {
  try {
    const { automation_type, enabled } = req.body;

    if (!automation_type) {
      return res.status(400).json({ success: false, error: 'Missing automation_type' });
    }
    if (!VALID_TYPES.includes(automation_type)) {
      return res.status(400).json({ success: false, error: 'Invalid automation_type' });
    }

    await updateAutomationStatus(automation_type, { enabled: !!enabled });

    res.json({ success: true, automation_type, enabled: !!enabled });
  } catch (err) {
    logger.error('Automation toggle error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/automation/config
 * Update schedule config for an automation
 * Body: { automation_type, config: { schedule: { ... } } }
 */
router.post('/config', async (req, res) => {
  try {
    const { automation_type, enabled, config } = req.body;

    if (!automation_type) {
      return res.status(400).json({ success: false, error: 'Missing automation_type' });
    }
    if (!VALID_TYPES.includes(automation_type)) {
      return res.status(400).json({ success: false, error: 'Invalid automation_type' });
    }

    const updates = {};
    if (enabled !== undefined) updates.enabled = enabled;
    if (config !== undefined) updates.config = config;

    await updateAutomationStatus(automation_type, updates);

    res.json({ success: true, automation_type, ...updates });
  } catch (err) {
    logger.error('Automation config error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/automation/trigger
 * Manually trigger one automation run
 * Body: { automation_type }
 */
router.post('/trigger', async (req, res) => {
  try {
    const { automation_type } = req.body;

    if (!automation_type) {
      return res.status(400).json({ success: false, error: 'Missing automation_type' });
    }

    let result;
    switch (automation_type) {
      case 'engagement_bot':
        result = await runEngagementBot();
        break;
      case 'health_monitor':
        result = await runHealthMonitor();
        break;
      case 'token_monitor':
        result = await runTokenMonitor();
        break;
      case 'dead_letter_queue':
        result = await runDeadLetterQueue();
        break;
      default:
        return res.status(400).json({ success: false, error: 'Invalid automation_type' });
    }

    res.json({ success: true, triggered: true, automation_type, result });
  } catch (err) {
    logger.error('Automation trigger error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
