# Noir Factory — Consolidation Plan

## Goal
Port 4 automation features from `rf1212/dashboard-central` Cloudflare Worker into `rf1212/noir-factory` Express backend. Then strip dashboard-central to traffic-only "The Collective".

## TASK 2: Merge Into Noir Factory

### A. Engagement Bot (`src/services/engagement-bot.js`)
- Per-company on/off toggle + configurable schedule from `automation_status` table
- Schedule config: `active_hours_start`, `active_hours_end`, `days_of_week`, `max_actions_per_run`
- Independent per company: RawFunds, ProxiTap, Alladre
- Platform implementations:
  - **Facebook**: OAuth via `company_integrations` → `POST https://graph.facebook.com/v19.0/{page_id}/feed`
  - **Instagram**: OAuth → `POST .../v19.0/{ig_user_id}/media` then `/media_publish`
  - **Threads**: OAuth → `POST https://graph.threads.net/v1.0/{user_id}/threads` then `/threads_publish`
  - **Twitter/X**: MCP stub — log error `'Twitter requires MCP integration — not yet configured'`
  - **TikTok**: MCP stub — log error `'TikTok requires MCP integration — not yet configured'`
- Cron: `*/5 * * * *`

### B. Health Monitor (`src/services/health-monitor.js`)
- Check Supabase: `GET /rest/v1/companies?limit=1`
- Check Cloudflare Analytics: POST GraphQL with zone IDs
- Check Facebook token: `GET /{page_id}?fields=id,name` (NOT `/me`)
- Cron: `*/15 * * * *`

### C. Token Monitor (`src/services/token-monitor.js`)
- Query `company_integrations` for tokens expiring within 7 days
- Attempt Facebook token refresh if `app_secret` available
- Store `{ expired: [], expiring_soon: [], healthy: [] }`
- Cron: `0 2 * * *`

### D. Dead Letter Queue (`src/services/dead-letter-queue.js`)
- Query `engagement_log` where `success=false AND retry_count < 3 AND created_at > NOW() - 24h`
- Re-attempt via engagement bot service
- On permanent failure (retry_count >= 3): append `[permanently_failed]` to error_message
- Cron: `*/5 * * * *`

### E. Automation Routes (`src/routes/automation.js`)
- `GET  /api/automation/status` — all automation statuses (requires X-Company-ID)
- `POST /api/automation/toggle` — enable/disable bot for company+platform
- `POST /api/automation/config` — update schedule config for company
- `POST /api/automation/trigger` — manually trigger one automation run

### F. Environment Variables
- `CF_ANALYTICS_TOKEN`
- `CF_ZONE_PROXITAP`
- `CF_ZONE_ALLADRE`

## TASK 3: Strip dashboard-central to "The Collective"
- Replace worker.js with minimal: `/api/traffic`, `/`, `/manifest.json` only
- Traffic endpoint: Cloudflare Analytics GraphQL for both zones
- Root: "The Collective" HTML with Chart.js traffic charts
- Remove all other endpoints

## TASK 4: Update CLAUDE.md files
- noir-factory: document 4 new automation endpoints, confirm rf1212 canonical
- dashboard-central: rename to "The Collective", document traffic-only scope

## TASK 5: Verify
- Noir Factory health, automation status, trigger endpoints
- The Collective traffic, root page, removed endpoints return 404
