/**
 * Dead Letter Queue — Ported from Cloudflare Worker
 * Retries failed engagement_log entries (up to 3 attempts)
 *
 * engagement_log columns:
 *   id, company_id, platform, action_type, target_post_id, target_username,
 *   template_id, comment_text, success, error_message, retry_count, created_at
 *
 * action_type constraint values:
 *   like, comment, follow, unfollow, dm, reply, first_comment, comment_reply, cycle_run
 */

const logger = require('../utils/logger');
const { getSupabaseAdmin } = require('../db/supabase');
const { updateAutomationStatus } = require('./automation-engine');
const { executePlatformAction } = require('./engagement-bot-v2');

async function runDeadLetterQueue() {
  const results = { retried: 0, succeeded: 0, permanently_failed: 0, errors: [] };

  try {
    const supabase = getSupabaseAdmin();
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    // Find failed entries from the last 24 hours with retry_count < 3
    const { data: failedEntries, error } = await supabase
      .from('engagement_log')
      .select('id,company_id,platform,action_type,target_post_id,target_username,template_id,comment_text,error_message,retry_count')
      .eq('success', false)
      .lt('retry_count', 3)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(20);

    if (error) throw new Error('Failed to fetch failed entries: ' + error.message);

    for (const entry of (failedEntries || [])) {
      const retryCount = entry.retry_count || 0;

      // Max 3 retries — mark permanently failed
      if (retryCount >= 3) {
        results.permanently_failed++;
        await supabase
          .from('engagement_log')
          .update({
            error_message: (entry.error_message || '') + ' [permanently_failed]'
          })
          .eq('id', entry.id);
        continue;
      }

      results.retried++;

      try {
        // Get the integration for this company+platform to re-attempt
        const { data: integrations } = await supabase
          .from('company_integrations')
          .select('id,platform,credentials,token_expires_at')
          .eq('company_id', entry.company_id)
          .eq('platform', entry.platform)
          .eq('status', 'active')
          .limit(1);

        const integration = integrations?.[0];
        let retrySuccess = false;

        if (integration?.credentials?.access_token) {
          // Build a minimal template/item for re-attempt
          const template = { template_text: entry.comment_text, template_type: entry.action_type };
          const item = { id: entry.target_post_id };
          const actionResult = await executePlatformAction(entry.platform, integration, template, item);
          retrySuccess = actionResult.success;
        }

        // Update original entry with incremented retry_count
        await supabase
          .from('engagement_log')
          .update({
            retry_count: retryCount + 1,
            success: retrySuccess,
            error_message: retrySuccess ? null : (entry.error_message || 'Retry failed')
          })
          .eq('id', entry.id);

        if (retrySuccess) {
          results.succeeded++;
        }
      } catch (err) {
        results.errors.push(`Retry failed for ${entry.id}: ${err.message}`);
        // Still increment retry_count even on exception
        await supabase
          .from('engagement_log')
          .update({ retry_count: retryCount + 1 })
          .eq('id', entry.id);
      }
    }
  } catch (err) {
    results.errors.push(`DLQ error: ${err.message}`);
    logger.error('[DLQ] Error:', err.message);
  }

  await updateAutomationStatus('dead_letter_queue', {
    last_status: results.errors.length > 0 ? 'partial' : 'success',
    last_result: results
  });

  logger.info(`[DLQ] Retried ${results.retried}, succeeded ${results.succeeded}, permanently failed ${results.permanently_failed}`);
  return results;
}

module.exports = { runDeadLetterQueue };
