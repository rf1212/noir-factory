# Backend Features Added - Noir Factory

Three new backend features have been successfully implemented:

## Feature 1: Content Repurposing Engine

**Purpose:** When a content job is created for one platform, auto-generate platform-specific versions with correct sizing for all other selected platforms.

### Files Created/Modified:
- `src/services/repurpose.service.js` - New service file
- `src/routes/content-jobs.js` - Updated with new endpoints

### Service Functions:
- `repurposeForPlatforms(parentJob, platforms, companyId)` - Creates child jobs for each platform with platform-specific dimensions
- `getPlatformSpecs(platform, contentType)` - Queries platform_specs table for correct dimensions
- `adjustCaptionForPlatform(platform, caption)` - Adjusts captions for platform constraints (character limits, hashtags, etc)
- `getRepurposedJobs(parentJobId)` - Retrieves all repurposed versions of a parent job

### New API Routes:

#### POST /api/content-jobs/:id/repurpose
Creates repurposed versions of a content job for multiple platforms.

**Request:**
```json
{
  "platforms": ["instagram", "facebook", "tiktok", "threads"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Created 4 repurposed job(s)",
  "parent_job_id": "uuid",
  "child_jobs": [
    {
      "id": "uuid",
      "parent_job_id": "uuid",
      "platforms": ["instagram"],
      "platform_specs": {
        "width": 1080,
        "height": 1350,
        "format": "jpg",
        "aspectRatio": "4:5"
      },
      "status": "queued"
    }
  ]
}
```

#### GET /api/content-jobs/:id/repurposed
Retrieves all repurposed versions of a content job.

**Response:**
```json
{
  "success": true,
  "parent_job_id": "uuid",
  "count": 4,
  "data": [...]
}
```

### Default Platform Specs:
- **Instagram:** 1080x1350 (4:5) for images, 1080x1920 (9:16) for reels
- **Facebook:** 1200x628 (1.91:1)
- **TikTok:** 1080x1920 (9:16)
- **Threads:** 1080x1350 (4:5)
- **Twitter/X:** 1024x512 (2:1)
- **LinkedIn:** 1200x627 (1.91:1)
- **Reddit:** 1200x630 (1.91:1)

---

## Feature 2: Performance Feedback Loop

**Purpose:** Track and analyze which content types, layouts, platforms, and job types perform best. Provides AI-style recommendations for content strategy optimization.

### Files Created/Modified:
- `src/services/performance.service.js` - New service file
- `src/routes/analytics.js` - New routes file
- `src/server.js` - Updated to mount analytics routes

### Service Functions:
- `getPerformanceReport(companyId, period)` - Returns comprehensive performance data aggregated by:
  - Platform (engagement rates, impressions, CTR)
  - Layout type (average engagement per layout)
  - Job type (video/static/carousel/story performance)
  - Cost analysis (cost per engagement by platform)
  - Posting time analysis (best hours for engagement)

- `getRecommendations(companyId)` - Returns AI-style recommendations:
  - Best performing platform to focus on
  - Top-performing layout type
  - Best job type for engagement
  - Cost-efficiency insights
  - Optimal posting time recommendations
  - Low performers to reduce or test

### New API Routes:

#### GET /api/analytics/performance?period=week|month|all
Returns detailed performance metrics.

**Query Parameters:**
- `period` - Time period: 'week', 'month', or 'all' (default: 'month')

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "startDate": "2026-02-18",
    "endDate": "2026-03-18",
    "totalJobs": 45,
    "totalPosts": 150,
    "platformPerformance": {
      "instagram": {
        "count": 50,
        "avgEngagement": 245.3,
        "avgCtr": "3.2"
      },
      "facebook": {
        "count": 40,
        "avgEngagement": 180.5,
        "avgCtr": "2.1"
      }
    },
    "layoutPerformance": {
      "hook": {
        "count": 30,
        "avgEngagement": 320.5
      },
      "carousel": {
        "count": 25,
        "avgEngagement": 195.2
      }
    },
    "jobTypePerformance": {
      "video": {
        "count": 60,
        "avgEngagement": 285.3
      },
      "static": {
        "count": 40,
        "avgEngagement": 165.2
      }
    },
    "costAnalysis": {
      "totalCost": "1250.50",
      "avgCostPerEngagement": "0.0045",
      "costPerPlatform": {
        "instagram": 18.75,
        "facebook": 22.50
      }
    },
    "timingAnalysis": {
      "bestHour": 18,
      "peakEngagement": "320",
      "hourlyBreakdown": {...}
    },
    "topPerformers": [...],
    "engagementMetrics": {
      "totalEngagement": 24563,
      "totalLikes": 18450,
      "totalComments": 3200,
      "totalShares": 2913,
      "engagementRate": "4.2",
      "ctr": "2.8"
    }
  }
}
```

#### GET /api/analytics/recommendations
Returns AI-style recommendations for content strategy.

**Response:**
```json
{
  "success": true,
  "count": 6,
  "data": [
    {
      "type": "summary",
      "priority": "high",
      "title": "Your Content Strategy Summary",
      "description": "In the past month, you published 150 posts across 2 platforms.",
      "actionable": "Follow the recommendations below to optimize your content strategy."
    },
    {
      "type": "platform",
      "priority": "high",
      "title": "Focus on instagram",
      "description": "instagram drives 245 avg engagement. This is your strongest platform.",
      "metric": 245,
      "actionable": "Increase posting frequency on instagram to capitalize on this performance."
    },
    {
      "type": "layout",
      "priority": "high",
      "title": "hook layout is your winner",
      "description": "The hook layout gets 320 avg engagement, 30 posts analyzed.",
      "metric": 320,
      "actionable": "Prioritize creating content with the hook layout for better performance."
    },
    {
      "type": "job_type",
      "priority": "medium",
      "title": "video content performs best",
      "description": "video posts get 285 avg engagement.",
      "metric": 285,
      "actionable": "Increase production of video content type."
    },
    {
      "type": "timing",
      "priority": "medium",
      "title": "Post at 18:00 for peak engagement",
      "description": "Posts published around 18:00 get 320 avg engagement.",
      "metric": 320,
      "actionable": "Schedule posts for 18:00 to maximize visibility and engagement."
    },
    {
      "type": "cost",
      "priority": "medium",
      "title": "instagram is most cost-efficient",
      "description": "Costs $18.75 per engagement on instagram.",
      "metric": 18.75,
      "actionable": "Shift budget toward instagram campaigns for better ROI."
    }
  ]
}
```

---

## Feature 3: Competitor Monitoring (Feed Types)

**Purpose:** Support competitor account monitoring in feeds. When feed type is 'competitor', the URL field accepts a social media profile URL that can later be scraped/API-fetched.

### Files Modified:
- `src/routes/feeds.js` - Updated POST and PUT endpoints

### Changes:
- Added 'competitor' as a valid feed type (alongside 'generic', 'rss', 'reddit', 'twitter', 'instagram', 'tiktok', 'linkedin')
- Added validation to ensure competitor feeds have a URL provided
- Feed system now supports social media profile URLs for competitor accounts

### New Feed Types Supported:
```javascript
const validTypes = ['generic', 'rss', 'reddit', 'twitter', 'instagram', 'tiktok', 'linkedin', 'competitor'];
```

### Updated API Routes:

#### POST /api/feeds
Now supports creating competitor feeds.

**Request (Competitor Feed):**
```json
{
  "name": "Competitor Feed - Brand X",
  "url": "https://instagram.com/brandx",
  "type": "competitor"
}
```

**Request (RSS Feed - existing):**
```json
{
  "name": "Tech News RSS",
  "url": "https://techcrunch.com/feed",
  "type": "rss"
}
```

#### PUT /api/feeds/:id
Updated to validate competitor feed types.

---

## Database Schema Notes

### Parent Job ID Column (Pending Migration)
To support the repurposing feature, the `content_jobs` table should have:

```sql
ALTER TABLE content_jobs
ADD COLUMN parent_job_id UUID REFERENCES content_jobs(id) ON DELETE CASCADE;

-- Index for performance
CREATE INDEX idx_content_jobs_parent_job_id ON content_jobs(parent_job_id);
```

### Platform Specs Table (Required for Repurposing)
For full functionality, a `platform_specs` table is recommended:

```sql
CREATE TABLE IF NOT EXISTS platform_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform VARCHAR(50) NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  format VARCHAR(20) DEFAULT 'jpg',
  aspect_ratio VARCHAR(20),
  max_duration_seconds INTEGER,
  recommended_frame_rate INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(platform, content_type)
);
```

### Post Metrics Table (Required for Analytics)
For performance analytics, ensure `post_metrics` table exists:

```sql
CREATE TABLE IF NOT EXISTS post_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES social_posts(id),
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Implementation Summary

All three features are fully implemented with:
- ✅ Complete service layer with core business logic
- ✅ API endpoints with proper request/response handling
- ✅ Company-scoped access control via X-Company-ID headers
- ✅ Comprehensive error handling and logging
- ✅ Support for both authentication and non-auth flows
- ✅ All JavaScript files pass Node syntax validation

### File Locations:
- **Services:** `/src/services/repurpose.service.js`, `/src/services/performance.service.js`
- **Routes:** `/src/routes/analytics.js` (new), `/src/routes/content-jobs.js` (updated), `/src/routes/feeds.js` (updated)
- **Server:** `/src/server.js` (updated with analytics route mounting)

### No Frontend Changes Required
As requested, no frontend changes were made. All changes are backend-only and fully integrated with the existing Express server.
