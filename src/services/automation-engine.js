/**
 * Automation Engine — Shared helpers for automation services
 * Reads/writes automation_status table in Supabase
 */

const { getSupabaseAdmin } = require('../db/supabase');
const logger = require('../utils/logger');

const COMPANIES = {
  rawfunds: '8b36e7e6-c942-41b1-81b7-a70204a37811',
  proxitap: 'cc1c8956-efbf-48d5-969c-ca58022fb76c',
  alladre: 'c24f54e5-ba20-46c2-aa73-765677419ce6'
};

const ALL_COMPANY_IDS = Object.values(COMPANIES);

/**
 * Get automation config from automation_status table
 */
async function getAutomationConfig(automationType) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('automation_status')
      .select('*')
      .eq('automation_type', automationType)
      .limit(1)
      .single();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Update automation status after a run
 */
async function updateAutomationStatus(automationType, updates) {
  try {
    const supabase = getSupabaseAdmin();
    const existing = await getAutomationConfig(automationType);

    const payload = {
      automation_type: automationType,
      last_run_at: new Date().toISOString(),
      ...updates
    };

    if (existing) {
      await supabase
        .from('automation_status')
        .update(payload)
        .eq('id', existing.id);
    } else {
      payload.enabled = updates.enabled !== undefined ? updates.enabled : true;
      payload.config = updates.config || {};
      await supabase
        .from('automation_status')
        .insert(payload);
    }
  } catch (err) {
    logger.error(`Failed to update automation_status for ${automationType}:`, err.message);
  }
}

/**
 * Seed automation_status rows if they don't exist
 */
async function seedAutomationStatus() {
  try {
    const supabase = getSupabaseAdmin();
    const seeds = [
      { automation_type: 'engagement_bot', enabled: false, config: { schedule: { start_hour: 8, end_hour: 22, days_of_week: [1, 2, 3, 4, 5], max_actions_per_run: 3 } } },
      { automation_type: 'health_monitor', enabled: true, config: {} },
      { automation_type: 'token_monitor', enabled: true, config: {} },
      { automation_type: 'dead_letter_queue', enabled: true, config: {} }
    ];

    for (const seed of seeds) {
      const existing = await getAutomationConfig(seed.automation_type);
      if (!existing) {
        await supabase.from('automation_status').insert(seed);
        logger.info(`Seeded automation_status: ${seed.automation_type}`);
      }
    }
  } catch (err) {
    logger.warn('Failed to seed automation_status:', err.message);
  }
}

module.exports = {
  COMPANIES,
  ALL_COMPANY_IDS,
  getAutomationConfig,
  updateAutomationStatus,
  seedAutomationStatus
};
