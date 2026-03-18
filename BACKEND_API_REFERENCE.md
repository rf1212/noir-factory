# Backend API Reference - New Features

## Feature 1: Content Repurposing

### POST /api/content-jobs/:id/repurpose
Create platform-specific versions of a content job.

**Headers:**
```
X-Company-ID: [company-uuid]
Content-Type: application/json
```

**Request Body:**
```json
{
  "platforms": ["instagram", "facebook", "tiktok", "threads"]
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Created 4 repurposed job(s)",
  "parent_job_id": "550e8400-e29b-41d4-a716-446655440000",
  "child_jobs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "company_id": "550e8400-e29b-41d4-a716-446655440000",
      "content_item_id": "550e8400-e29b-41d4-a716-446655440002",
      "parent_job_id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "image",
      "platforms": ["instagram"],
      "platform_specs": {
        "width": 1080,
        "height": 1350,
        "format": "jpg",
        "aspectRatio": "4:5",
        "maxDuration": null,
        "recommendedFrameRate": 30
      },
      "caption": "Original caption optimized for Instagram",
      "status": "queued",
      "queue_priority": 100,
      "created_at": "2026-03-18T04:18:00.000Z",
      "updated_at": "2026-03-18T04:18:00.000Z"
    }
  ]
}
```

**Error Responses:**
- 400: Missing or invalid platforms array
- 404: Parent job not found
- 500: Repurposing failed

---

### GET /api/content-jobs/:id/repurposed
Get all repurposed versions of a content job.

**Headers:**
```
X-Company-ID: [company-uuid]
```

**Success Response (200):**
```json
{
  "success": true,
  "parent_job_id": "550e8400-e29b-41d4-a716-446655440000",
  "count": 4,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "parent_job_id": "550e8400-e29b-41d4-a716-446655440000",
      "platforms": ["instagram"],
      "status": "queued"
    }
  ]
}
```

**Error Responses:**
- 404: Parent job not found
- 500: Failed to retrieve repurposed jobs

---

## Feature 2: Performance Analytics

### GET /api/analytics/performance?period=month
Get comprehensive performance metrics.

**Headers:**
```
Authorization: Bearer [token]
X-Company-ID: [company-uuid]
```

**Query Parameters:**
| Parameter | Type | Required | Values | Default |
|-----------|------|----------|--------|---------|
| period | string | No | 'week', 'month', 'all' | 'month' |

**Success Response (200):**
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
        "totalEngagement": 12265,
        "totalImpressions": 382000,
        "totalClicks": 7250,
        "avgEngagement": 245.3,
        "avgCtr": "1.90"
      },
      "facebook": {
        "count": 40,
        "totalEngagement": 7220,
        "totalImpressions": 340000,
        "totalClicks": 5100,
        "avgEngagement": 180.5,
        "avgCtr": "1.50"
      },
      "tiktok": {
        "count": 60,
        "totalEngagement": 18900,
        "totalImpressions": 450000,
        "totalClicks": 12000,
        "avgEngagement": 315.0,
        "avgCtr": "2.67"
      }
    },

    "layoutPerformance": {
      "hook": {
        "count": 30,
        "totalEngagement": 9615,
        "avgEngagement": 320.5
      },
      "carousel": {
        "count": 25,
        "totalEngagement": 4880,
        "avgEngagement": 195.2
      },
      "default": {
        "count": 45,
        "totalEngagement": 9225,
        "avgEngagement": 205.0
      }
    },

    "jobTypePerformance": {
      "video": {
        "count": 60,
        "totalEngagement": 17118,
        "avgEngagement": 285.3
      },
      "static": {
        "count": 40,
        "totalEngagement": 6610,
        "avgEngagement": 165.25
      }
    },

    "costAnalysis": {
      "totalCost": "1250.50",
      "avgCostPerEngagement": "0.0045",
      "costPerPlatform": {
        "instagram": 18.75,
        "facebook": 22.50,
        "tiktok": 15.25
      }
    },

    "timingAnalysis": {
      "bestHour": 18,
      "peakEngagement": "320",
      "hourlyBreakdown": {
        "6": 45,
        "9": 180,
        "12": 225,
        "15": 290,
        "18": 320,
        "21": 310,
        "23": 150
      }
    },

    "topPerformers": [
      {
        "id": "post-uuid-1",
        "platform": "tiktok",
        "engagement": 1250
      },
      {
        "id": "post-uuid-2",
        "platform": "instagram",
        "engagement": 1050
      }
    ],

    "engagementMetrics": {
      "totalEngagement": 24563,
      "totalLikes": 18450,
      "totalComments": 3200,
      "totalShares": 2913,
      "totalImpressions": 1172000,
      "totalClicks": 24350,
      "engagementRate": "2.10",
      "ctr": "2.08"
    }
  }
}
```

**Error Responses:**
- 400: Invalid period parameter
- 401: Unauthorized
- 500: Failed to generate report

---

### GET /api/analytics/recommendations
Get AI-style recommendations for content strategy.

**Headers:**
```
Authorization: Bearer [token]
X-Company-ID: [company-uuid]
```

**Success Response (200):**
```json
{
  "success": true,
  "count": 7,
  "data": [
    {
      "type": "summary",
      "priority": "high",
      "title": "Your Content Strategy Summary",
      "description": "In the past month, you published 150 posts across 3 platforms.",
      "actionable": "Follow the recommendations below to optimize your content strategy."
    },
    {
      "type": "platform",
      "priority": "high",
      "title": "Focus on tiktok",
      "description": "tiktok drives 315 avg engagement. This is your strongest platform.",
      "metric": 315,
      "actionable": "Increase posting frequency on tiktok to capitalize on this performance."
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
      "title": "tiktok is most cost-efficient",
      "description": "Costs $15.25 per engagement on tiktok.",
      "metric": 15.25,
      "actionable": "Shift budget toward tiktok campaigns for better ROI."
    },
    {
      "type": "avoid",
      "priority": "low",
      "title": "Consider reducing carousel content",
      "description": "carousel only gets 195 avg engagement.",
      "metric": 195,
      "actionable": "Reduce production of carousel layout or test variations."
    }
  ]
}
```

**Recommendation Types:**
| Type | Description |
|------|-------------|
| summary | Overall content strategy summary |
| platform | Best performing platform |
| layout | Most effective layout type |
| job_type | Best performing content type |
| timing | Optimal posting time |
| cost | Most cost-efficient platform |
| avoid | Underperforming content type |

**Priority Levels:**
- high: Immediate actionable insight
- medium: Moderate importance
- low: Nice-to-have optimization

**Error Responses:**
- 401: Unauthorized
- 500: Failed to generate recommendations

---

## Feature 3: Competitor Feed Monitoring

### POST /api/feeds (Create Competitor Feed)
Create a feed to monitor competitor social accounts.

**Headers:**
```
Authorization: Bearer [token]
X-Company-ID: [company-uuid]
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Competitor Feed - Brand X",
  "url": "https://instagram.com/brandx",
  "type": "competitor"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "feed": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Competitor Feed - Brand X",
    "url": "https://instagram.com/brandx",
    "type": "competitor",
    "is_active": true,
    "created_at": "2026-03-18T04:18:00.000Z"
  }
}
```

**Valid Feed Types:**
- `rss` - RSS feed
- `reddit` - Reddit subreddit
- `twitter` - Twitter/X account
- `instagram` - Instagram profile
- `tiktok` - TikTok profile
- `linkedin` - LinkedIn profile
- `competitor` - Competitor social profile (any platform)
- `generic` - Generic/custom feed

**Error Responses:**
- 400: Invalid feed type or missing URL for competitor feeds
- 401: Unauthorized
- 500: Failed to create feed

---

### PUT /api/feeds/:id (Update Feed Type to Competitor)
Update an existing feed to competitor type.

**Headers:**
```
Authorization: Bearer [token]
X-Company-ID: [company-uuid]
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "competitor",
  "url": "https://instagram.com/newcompetitor"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "feed": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Competitor Feed - Brand X",
    "url": "https://instagram.com/newcompetitor",
    "type": "competitor",
    "is_active": true,
    "updated_at": "2026-03-18T04:18:00.000Z"
  }
}
```

**Error Responses:**
- 400: Invalid feed type
- 401: Unauthorized
- 404: Feed not found
- 500: Failed to update feed

---

## Common Error Responses

All endpoints use standard HTTP status codes:

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (invalid parameters) |
| 401 | Unauthorized (missing/invalid token) |
| 404 | Not Found |
| 500 | Internal Server Error |

Standard error response format:
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

---

## Authentication

All routes requiring authentication use:
```
Authorization: Bearer [JWT_TOKEN]
```

Company context is provided via:
```
X-Company-ID: [company-uuid]
```

## Platform Specifications Used

Default dimensions built into repurpose service:

| Platform | Image Size | Video Size | Aspect Ratio |
|----------|------------|------------|--------------|
| Instagram | 1080x1350 | 1080x1920 | 4:5 / 9:16 |
| Facebook | 1200x628 | 1280x720 | 1.91:1 / 16:9 |
| TikTok | 1080x1920 | 1080x1920 | 9:16 |
| Threads | 1080x1350 | 1080x1920 | 4:5 / 9:16 |
| Twitter/X | 1024x512 | 1920x1080 | 2:1 / 16:9 |
| LinkedIn | 1200x627 | 1920x1080 | 1.91:1 / 16:9 |
| Reddit | 1200x630 | 1920x1080 | 1.91:1 / 16:9 |
