/**
 * Health Monitor — Ported from Cloudflare Worker
 * Checks: Supabase connectivity, Cloudflare Analytics API, Facebook token
 */

const logger = require('../utils/logger');
const { getSupabaseAdmin } = require('../db/supabase');
const { updateAutomationStatus } = require('./automation-engine');

const CF_ANALYTICS_TOKEN = process.env.CF_ANALYTICS_TOKEN;
const CF_ZONES = {
  proxitap: process.env.CF_ZONE_PROXITAP,
  alladre: process.env.CF_ZONE_ALLADRE
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function runHealthMonitor() {
  const checks = [];
  const now = new Date().toISOString();

  // 1. Check Supabase connectivity
  try {
    const start = Date.now();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/companies?limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    checks.push({
      service: 'supabase',
      status: res.ok ? 'healthy' : 'unhealthy',
      response_ms: Date.now() - start,
      http_status: res.status
    });
  } catch (err) {
    checks.push({ service: 'supabase', status: 'down', error: err.message });
  }

  // 2. Check Cloudflare Analytics API
  if (CF_ANALYTICS_TOKEN) {
    try {
      const start = Date.now();
      const zoneTag = CF_ZONES.proxitap || CF_ZONES.alladre;
      const query = zoneTag
        ? `{ viewer { zones(filter: {zoneTag: "${zoneTag}"}) { httpRequests1dGroups(limit:1, orderBy:[date_DESC]) { dimensions { date } } } } }`
        : '{ viewer { zones(filter: {}) { id } } }';

      const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CF_ANALYTICS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });
      checks.push({
        service: 'cloudflare_analytics',
        status: res.ok ? 'healthy' : 'unhealthy',
        response_ms: Date.now() - start,
        http_status: res.status
      });
    } catch (err) {
      checks.push({ service: 'cloudflare_analytics', status: 'down', error: err.message });
    }
  } else {
    checks.push({ service: 'cloudflare_analytics', status: 'not_configured' });
  }

  // 3. Check Facebook token — use /{page_id} NOT /me
  try {
    const start = Date.now();
    const supabase = getSupabaseAdmin();
    const { data: integrations } = await supabase
      .from('company_integrations')
      .select('credentials,account_id')
      .eq('platform', 'facebook')
      .eq('status', 'active')
      .limit(1);

    if (integrations?.[0]?.credentials?.access_token) {
      const integ = integrations[0];
      const pageId = integ.credentials.page_id || integ.account_id;
      const fbRes = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}?fields=id,name&access_token=${encodeURIComponent(integ.credentials.access_token)}`
      );
      checks.push({
        service: 'facebook_api',
        status: fbRes.ok ? 'healthy' : 'unhealthy',
        response_ms: Date.now() - start,
        http_status: fbRes.status
      });
    } else {
      checks.push({ service: 'facebook_api', status: 'no_token' });
    }
  } catch (err) {
    checks.push({ service: 'facebook_api', status: 'down', error: err.message });
  }

  const allHealthy = checks.every(c => c.status === 'healthy');
  await updateAutomationStatus('health_monitor', {
    last_status: allHealthy ? 'healthy' : 'degraded',
    last_result: { checks, timestamp: now }
  });

  logger.info(`[Health Monitor] ${allHealthy ? 'All healthy' : 'Degraded'}:`, checks.map(c => `${c.service}=${c.status}`).join(', '));
  return { checks, overall: allHealthy ? 'healthy' : 'degraded' };
}

module.exports = { runHealthMonitor };
