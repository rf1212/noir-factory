/**
 * Engagement Bot v2 — Ported from Cloudflare Worker
 * Per-company, multi-platform engagement automation
 *
 * Platforms:
 * - Facebook: OAuth via company_integrations
 * - Instagram: OAuth via company_integrations
 * - Threads: OAuth via company_integrations
 * - Twitter/X: MCP stub (not yet configured)
 * - TikTok: MCP stub (not yet configured)
 */

const logger = require('../utils/logger');
const { getSupabaseAdmin } = require('../db/supabase');
const { ALL_COMPANY_IDS, getAutomationConfig, updateAutomationStatus } = require('./automation-engine');

const FB_APP_ID = process.env.META_APP_ID || '26625326990404743';

/**
 * Execute a Facebook engagement action
 */
async function executeFacebookAction(integration, template, item) {
  const { access_token, page_id } = integration.credentials || {};
  if (!access_token || !page_id) {
    return { success: false, error: 'Missing Facebook credentials (access_token or page_id)' };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${page_id}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: template.template_text || template.content,
        access_token
      })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error?.message || 'Facebook API error' };
    }
    return { success: true, post_id: data.id };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Execute an Instagram engagement action (two-step: create media container, then publish)
 */
async function executeInstagramAction(integration, template, item) {
  const { instagram_user_id, access_token } = integration.credentials || {};
  if (!access_token || !instagram_user_id) {
    return { success: false, error: 'Missing Instagram credentials (instagram_user_id or access_token)' };
  }

  try {
    // Step 1: Create media container
    const createRes = await fetch(`https://graph.facebook.com/v19.0/${instagram_user_id}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: template.template_text || template.content,
        access_token
      })
    });
    const createData = await createRes.json();
    if (!createRes.ok) {
      return { success: false, error: createData.error?.message || 'Instagram create error' };
    }

    // Step 2: Publish
    const publishRes = await fetch(`https://graph.facebook.com/v19.0/${instagram_user_id}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: createData.id,
        access_token
      })
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok) {
      return { success: false, error: publishData.error?.message || 'Instagram publish error' };
    }
    return { success: true, post_id: publishData.id };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Execute a Threads engagement action (two-step: create thread, then publish)
 */
async function executeThreadsAction(integration, template, item) {
  const { threads_user_id, access_token } = integration.credentials || {};
  if (!access_token || !threads_user_id) {
    return { success: false, error: 'Missing Threads credentials (threads_user_id or access_token)' };
  }

  try {
    // Step 1: Create thread container
    const createRes = await fetch(`https://graph.threads.net/v1.0/${threads_user_id}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: template.template_text || template.content,
        media_type: 'TEXT',
        access_token
      })
    });
    const createData = await createRes.json();
    if (!createRes.ok) {
      return { success: false, error: createData.error?.message || 'Threads create error' };
    }

    // Step 2: Publish
    const publishRes = await fetch(`https://graph.threads.net/v1.0/${threads_user_id}/threads_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: createData.id,
        access_token
      })
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok) {
      return { success: false, error: publishData.error?.message || 'Threads publish error' };
    }
    return { success: true, post_id: publishData.id };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Execute platform action — routes to correct platform handler
 */
async function executePlatformAction(platform, integration, template, item) {
  switch (platform) {
    case 'facebook':
      return executeFacebookAction(integration, template, item);
    case 'instagram':
      return executeInstagramAction(integration, template, item);
    case 'threads':
      return executeThreadsAction(integration, template, item);
    case 'twitter':
    case 'x':
      // TODO: Twitter requires MCP integration — not yet configured
      return { success: false, error: 'Twitter requires MCP integration — not yet configured' };
    case 'tiktok':
      // TODO: TikTok requires MCP integration — not yet configured
      return { success: false, error: 'TikTok requires MCP integration — not yet configured' };
    default:
      return { success: false, error: `Unsupported platform: ${platform}` };
  }
}

/**
 * Run the engagement bot for all companies
 */
async function runEngagementBot() {
  const config = await getAutomationConfig('engagement_bot');
  if (config && !config.enabled) {
    return { skipped: true, reason: 'disabled' };
  }

  // Check schedule constraints
  const schedule = config?.config?.schedule || {};
  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentDay = now.getUTCDay(); // 0=Sun

  if (schedule.days_of_week && schedule.days_of_week.length > 0) {
    if (!schedule.days_of_week.includes(currentDay)) {
      return { skipped: true, reason: 'not_scheduled_day' };
    }
  }

  const startHour = schedule.active_hours_start ?? schedule.start_hour;
  const endHour = schedule.active_hours_end ?? schedule.end_hour;
  if (startHour !== undefined && endHour !== undefined) {
    if (currentHour < startHour || currentHour >= endHour) {
      return { skipped: true, reason: 'outside_scheduled_hours' };
    }
  }

  const results = { actions: 0, successes: 0, failures: 0, errors: [] };

  try {
    const supabase = getSupabaseAdmin();

    for (const companyId of ALL_COMPANY_IDS) {
      // Get active integrations with valid tokens
      const { data: integrations, error: integErr } = await supabase
        .from('company_integrations')
        .select('id,platform,credentials,token_expires_at')
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (integErr || !integrations) continue;

      const validIntegrations = integrations.filter(i => {
        if (!i.credentials?.access_token) return false;
        if (i.token_expires_at && new Date(i.token_expires_at) < now) return false;
        return true;
      });
      if (validIntegrations.length === 0) continue;

      // Get high-scoring content not yet engaged
      const { data: content } = await supabase
        .from('content_items')
        .select('*')
        .eq('company_id', companyId)
        .gte('engagement_score', 5)
        .eq('review_status', 'pending')
        .order('engagement_score', { ascending: false })
        .limit(5);

      if (!content || content.length === 0) continue;

      // Get active templates
      const { data: templates } = await supabase
        .from('engagement_templates')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .limit(10);

      if (!templates || templates.length === 0) continue;

      // Process engagement actions
      const maxActions = schedule.max_actions_per_run || 3;
      for (let i = 0; i < Math.min(content.length, maxActions); i++) {
        const item = content[i];
        const template = templates[Math.floor(Math.random() * templates.length)];
        results.actions++;

        for (const integration of validIntegrations) {
          const actionResult = await executePlatformAction(
            integration.platform, integration, template, item
          );

          // Log to engagement_log
          await supabase.from('engagement_log').insert({
            company_id: companyId,
            platform: integration.platform,
            action_type: template.template_type || 'comment',
            target_post_id: item.id,
            template_id: template.id,
            comment_text: template.template_text || template.content,
            success: actionResult.success,
            error_message: actionResult.error || null,
            retry_count: 0,
            created_at: new Date().toISOString()
          });

          if (actionResult.success) {
            results.successes++;
            // Mark content as engaged
            await supabase
              .from('content_items')
              .update({ review_status: 'engaged' })
              .eq('id', item.id);
          } else {
            results.failures++;
            results.errors.push(`${integration.platform}: ${actionResult.error}`);
          }
        }
      }
    }
  } catch (err) {
    results.errors.push(`Bot error: ${err.message}`);
    logger.error('[Engagement Bot] Error:', err.message);
  }

  await updateAutomationStatus('engagement_bot', {
    last_status: results.failures > 0 ? 'partial' : 'success',
    last_result: results
  });

  logger.info(`[Engagement Bot] Completed: ${results.successes} successes, ${results.failures} failures`);
  return results;
}

module.exports = { runEngagementBot, executePlatformAction };
