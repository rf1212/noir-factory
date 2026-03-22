/**
 * Token Monitor — Ported from Cloudflare Worker
 * Checks company_integrations for tokens expiring within 7 days
 * Attempts Facebook token refresh when app_secret is available
 */

const logger = require('../utils/logger');
const { getSupabaseAdmin } = require('../db/supabase');
const { updateAutomationStatus } = require('./automation-engine');

const FB_APP_ID = process.env.META_APP_ID || '26625326990404743';

async function runTokenMonitor() {
  const results = { tokens_checked: 0, expiring_soon: [], expired: [], healthy: [], refreshed: [] };

  try {
    const supabase = getSupabaseAdmin();

    const { data: integrations, error } = await supabase
      .from('company_integrations')
      .select('id,company_id,platform,account_name,status,token_expires_at,credentials');

    if (error) throw new Error('Failed to fetch integrations: ' + error.message);

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

    for (const integ of (integrations || [])) {
      if (!integ.token_expires_at) continue;
      results.tokens_checked++;

      const expiresAt = new Date(integ.token_expires_at);
      const info = { id: integ.id, platform: integ.platform, account: integ.account_name };

      if (expiresAt < now) {
        // Token already expired
        results.expired.push({ ...info, expired_at: integ.token_expires_at });
        await supabase
          .from('company_integrations')
          .update({ status: 'expired' })
          .eq('id', integ.id);

      } else if (expiresAt < sevenDaysFromNow) {
        // Token expiring within 7 days
        const daysRemaining = Math.ceil((expiresAt - now) / (24 * 3600 * 1000));
        results.expiring_soon.push({ ...info, expires_at: integ.token_expires_at, days_remaining: daysRemaining });

        // Try to refresh Facebook long-lived tokens
        if (integ.platform === 'facebook' && integ.credentials?.access_token && integ.credentials?.app_secret) {
          try {
            const refreshRes = await fetch(
              `https://graph.facebook.com/v19.0/oauth/access_token?` +
              `grant_type=fb_exchange_token` +
              `&client_id=${encodeURIComponent(FB_APP_ID)}` +
              `&client_secret=${encodeURIComponent(integ.credentials.app_secret)}` +
              `&fb_exchange_token=${encodeURIComponent(integ.credentials.access_token)}`
            );

            if (refreshRes.ok) {
              const tokenData = await refreshRes.json();
              if (tokenData.access_token) {
                const newExpiry = new Date(now.getTime() + 60 * 24 * 3600 * 1000).toISOString();
                await supabase
                  .from('company_integrations')
                  .update({
                    credentials: { ...integ.credentials, access_token: tokenData.access_token },
                    token_expires_at: newExpiry,
                    status: 'active'
                  })
                  .eq('id', integ.id);

                results.refreshed.push({ platform: integ.platform, account: integ.account_name, new_expiry: newExpiry });
              }
            }
          } catch (err) {
            logger.warn(`[Token Monitor] Refresh failed for ${integ.account_name}:`, err.message);
          }
        }
      } else {
        results.healthy.push(info);
      }
    }
  } catch (err) {
    results.error = err.message;
    logger.error('[Token Monitor] Error:', err.message);
  }

  const hasIssues = results.expired.length > 0 || results.expiring_soon.length > 0;
  await updateAutomationStatus('token_monitor', {
    last_status: results.error ? 'error' : (hasIssues ? 'warning' : 'healthy'),
    last_result: results
  });

  logger.info(`[Token Monitor] Checked ${results.tokens_checked} tokens: ${results.expired.length} expired, ${results.expiring_soon.length} expiring soon, ${results.refreshed.length} refreshed`);
  return results;
}

module.exports = { runTokenMonitor };
