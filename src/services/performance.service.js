/**
 * Performance Tracking Service
 * Analyzes job outcomes to recommend optimal settings
 * Tracks engagement, layouts, job types, platforms, and cost efficiency
 */

const { getSupabaseAdmin } = require('../db/supabase');
const logger = require('../utils/logger');

/**
 * Get performance report for a company over a time period
 * @param {string} companyId - Company ID
 * @param {string} period - Time period: 'week', 'month', 'all'
 * @returns {Promise<Object>} Performance data with breakdowns by platform, layout, job type
 */
async function getPerformanceReport(companyId, period = 'month') {
  try {
    const client = getSupabaseAdmin();
    const startDate = getStartDate(period);

    // Fetch all content jobs for the period
    const { data: jobs, error: jobsError } = await client
      .from('content_jobs')
      .select('*')
      .eq('company_id', companyId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (jobsError) throw jobsError;

    // Fetch associated social posts with engagement metrics
    const jobIds = (jobs || []).map(j => j.id);
    let socialPosts = [];
    let metrics = [];

    if (jobIds.length > 0) {
      const { data: posts, error: postsError } = await client
        .from('social_posts')
        .select('*')
        .in('content_job_id', jobIds);

      if (!postsError) {
        socialPosts = posts || [];
      }

      // Fetch metrics for each post
      const { data: metricsData, error: metricsError } = await client
        .from('post_metrics')
        .select('*')
        .in('post_id', socialPosts.map(p => p.id));

      if (!metricsError) {
        metrics = metricsData || [];
      }
    }

    // Aggregate performance data
    const report = {
      period,
      startDate: startDate.toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      totalJobs: jobs?.length || 0,
      totalPosts: socialPosts.length,
      platformPerformance: aggregatePlatformPerformance(jobs, socialPosts, metrics),
      layoutPerformance: aggregateLayoutPerformance(jobs, socialPosts, metrics),
      jobTypePerformance: aggregateJobTypePerformance(jobs, socialPosts, metrics),
      costAnalysis: calculateCostAnalysis(jobs, socialPosts),
      timingAnalysis: analyzePostTiming(socialPosts, metrics),
      topPerformers: getTopPerformers(jobs, socialPosts, metrics),
      engagementMetrics: getEngagementMetrics(metrics)
    };

    return report;
  } catch (error) {
    logger.error('Failed to get performance report:', error);
    throw error;
  }
}

/**
 * Get AI-style recommendations for optimal content strategy
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Array of recommendations
 */
async function getRecommendations(companyId) {
  try {
    const report = await getPerformanceReport(companyId, 'month');
    const recommendations = [];

    // Recommend best performing platform
    const platforms = Object.entries(report.platformPerformance).sort(
      (a, b) => (b[1].avgEngagement || 0) - (a[1].avgEngagement || 0)
    );
    if (platforms.length > 0) {
      const topPlatform = platforms[0];
      recommendations.push({
        type: 'platform',
        priority: 'high',
        title: `Focus on ${topPlatform[0]}`,
        description: `${topPlatform[0]} drives ${topPlatform[1].avgEngagement?.toFixed(0) || 0} avg engagement. This is your strongest platform.`,
        metric: topPlatform[1].avgEngagement,
        actionable: `Increase posting frequency on ${topPlatform[0]} to capitalize on this performance.`
      });
    }

    // Recommend best layout
    const layouts = Object.entries(report.layoutPerformance).sort(
      (a, b) => (b[1].avgEngagement || 0) - (a[1].avgEngagement || 0)
    );
    if (layouts.length > 0) {
      const topLayout = layouts[0];
      recommendations.push({
        type: 'layout',
        priority: 'high',
        title: `${topLayout[0]} layout is your winner`,
        description: `The ${topLayout[0]} layout gets ${topLayout[1].avgEngagement?.toFixed(0) || 0} avg engagement, ${topLayout[1].count} posts analyzed.`,
        metric: topLayout[1].avgEngagement,
        actionable: `Prioritize creating content with the ${topLayout[0]} layout for better performance.`
      });
    }

    // Recommend best job type
    const jobTypes = Object.entries(report.jobTypePerformance).sort(
      (a, b) => (b[1].avgEngagement || 0) - (a[1].avgEngagement || 0)
    );
    if (jobTypes.length > 0) {
      const topJobType = jobTypes[0];
      recommendations.push({
        type: 'job_type',
        priority: 'medium',
        title: `${topJobType[0]} content performs best`,
        description: `${topJobType[0]} posts get ${topJobType[1].avgEngagement?.toFixed(0) || 0} avg engagement.`,
        metric: topJobType[1].avgEngagement,
        actionable: `Increase production of ${topJobType[0]} content type.`
      });
    }

    // Cost efficiency recommendation
    const costAnalysis = report.costAnalysis;
    if (costAnalysis.avgCostPerEngagement) {
      const mostCostEfficient = Object.entries(costAnalysis.costPerPlatform || {}).sort(
        (a, b) => (a[1] || 999) - (b[1] || 999)
      );
      if (mostCostEfficient.length > 0) {
        const platform = mostCostEfficient[0][0];
        const cost = mostCostEfficient[0][1];
        recommendations.push({
          type: 'cost',
          priority: 'medium',
          title: `${platform} is most cost-efficient`,
          description: `Costs $${cost?.toFixed(2) || 'N/A'} per engagement on ${platform}.`,
          metric: cost,
          actionable: `Shift budget toward ${platform} campaigns for better ROI.`
        });
      }
    }

    // Timing recommendation
    const timing = report.timingAnalysis;
    if (timing.bestHour !== null) {
      recommendations.push({
        type: 'timing',
        priority: 'medium',
        title: `Post at ${timing.bestHour}:00 for peak engagement`,
        description: `Posts published around ${timing.bestHour}:00 get ${timing.peakEngagement?.toFixed(0) || 0} avg engagement.`,
        metric: timing.peakEngagement,
        actionable: `Schedule posts for ${timing.bestHour}:00 to maximize visibility and engagement.`
      });
    }

    // Low performer recommendation
    if (layouts.length > 1) {
      const worstLayout = layouts[layouts.length - 1];
      recommendations.push({
        type: 'avoid',
        priority: 'low',
        title: `Consider reducing ${worstLayout[0]} content`,
        description: `${worstLayout[0]} only gets ${worstLayout[1].avgEngagement?.toFixed(0) || 0} avg engagement.`,
        metric: worstLayout[1].avgEngagement,
        actionable: `Reduce production of ${worstLayout[0]} layout or test variations.`
      });
    }

    // Overall recommendation summary
    if (recommendations.length > 0) {
      recommendations.unshift({
        type: 'summary',
        priority: 'high',
        title: 'Your Content Strategy Summary',
        description: `In the past month, you published ${report.totalPosts} posts across ${Object.keys(report.platformPerformance).length} platforms.`,
        actionable: 'Follow the recommendations below to optimize your content strategy.'
      });
    }

    return recommendations;
  } catch (error) {
    logger.error('Failed to get recommendations:', error);
    return [];
  }
}

/**
 * Aggregate performance by platform
 */
function aggregatePlatformPerformance(jobs, posts, metrics) {
  const platformData = {};

  posts.forEach(post => {
    const platform = post.platform || 'unknown';
    if (!platformData[platform]) {
      platformData[platform] = {
        count: 0,
        totalEngagement: 0,
        totalImpressions: 0,
        totalClicks: 0,
        avgEngagement: 0,
        avgCtr: 0
      };
    }

    const postMetrics = metrics.filter(m => m.post_id === post.id);
    const engagement = postMetrics.reduce((sum, m) => sum + (m.likes || 0) + (m.comments || 0) + (m.shares || 0), 0);
    const impressions = postMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
    const clicks = postMetrics.reduce((sum, m) => sum + (m.clicks || 0), 0);

    platformData[platform].count++;
    platformData[platform].totalEngagement += engagement;
    platformData[platform].totalImpressions += impressions;
    platformData[platform].totalClicks += clicks;
  });

  // Calculate averages
  Object.keys(platformData).forEach(platform => {
    const data = platformData[platform];
    data.avgEngagement = data.count > 0 ? data.totalEngagement / data.count : 0;
    data.avgCtr = data.totalImpressions > 0 ? (data.totalClicks / data.totalImpressions * 100).toFixed(2) : 0;
  });

  return platformData;
}

/**
 * Aggregate performance by layout type
 */
function aggregateLayoutPerformance(jobs, posts, metrics) {
  const layoutData = {};

  jobs.forEach(job => {
    const layoutType = job.layout_type || 'default';
    const jobPosts = posts.filter(p => p.content_job_id === job.id);

    jobPosts.forEach(post => {
      if (!layoutData[layoutType]) {
        layoutData[layoutType] = {
          count: 0,
          totalEngagement: 0,
          avgEngagement: 0
        };
      }

      const postMetrics = metrics.filter(m => m.post_id === post.id);
      const engagement = postMetrics.reduce((sum, m) => sum + (m.likes || 0) + (m.comments || 0) + (m.shares || 0), 0);

      layoutData[layoutType].count++;
      layoutData[layoutType].totalEngagement += engagement;
    });
  });

  // Calculate averages
  Object.keys(layoutData).forEach(layout => {
    const data = layoutData[layout];
    data.avgEngagement = data.count > 0 ? data.totalEngagement / data.count : 0;
  });

  return layoutData;
}

/**
 * Aggregate performance by job type (video, static, carousel, story)
 */
function aggregateJobTypePerformance(jobs, posts, metrics) {
  const typeData = {};

  jobs.forEach(job => {
    const jobType = job.type || 'unknown';
    const jobPosts = posts.filter(p => p.content_job_id === job.id);

    jobPosts.forEach(post => {
      if (!typeData[jobType]) {
        typeData[jobType] = {
          count: 0,
          totalEngagement: 0,
          avgEngagement: 0
        };
      }

      const postMetrics = metrics.filter(m => m.post_id === post.id);
      const engagement = postMetrics.reduce((sum, m) => sum + (m.likes || 0) + (m.comments || 0) + (m.shares || 0), 0);

      typeData[jobType].count++;
      typeData[jobType].totalEngagement += engagement;
    });
  });

  // Calculate averages
  Object.keys(typeData).forEach(type => {
    const data = typeData[type];
    data.avgEngagement = data.count > 0 ? data.totalEngagement / data.count : 0;
  });

  return typeData;
}

/**
 * Calculate cost analysis per platform
 */
function calculateCostAnalysis(jobs, posts) {
  const totalCost = jobs.reduce((sum, job) => sum + (job.generation_cost_estimate || 0), 0);
  const totalEngagement = posts.reduce((sum, post) => sum + (post.engagement_count || 0), 0);

  const costPerPlatform = {};
  const platformCosts = {};

  jobs.forEach(job => {
    const platform = job.platforms?.[0] || 'unknown';
    const cost = job.generation_cost_estimate || 0;

    if (!platformCosts[platform]) {
      platformCosts[platform] = { cost: 0, count: 0 };
    }
    platformCosts[platform].cost += cost;
    platformCosts[platform].count++;
  });

  Object.keys(platformCosts).forEach(platform => {
    const data = platformCosts[platform];
    costPerPlatform[platform] = data.count > 0 ? data.cost / data.count : 0;
  });

  return {
    totalCost: totalCost.toFixed(2),
    avgCostPerEngagement: totalEngagement > 0 ? (totalCost / totalEngagement).toFixed(4) : 0,
    costPerPlatform
  };
}

/**
 * Analyze best posting times
 */
function analyzePostTiming(posts, metrics) {
  const hourlyEngagement = {};
  const hourlyCount = {};

  posts.forEach(post => {
    if (!post.posted_at) return;

    const date = new Date(post.posted_at);
    const hour = date.getHours();

    if (!hourlyEngagement[hour]) {
      hourlyEngagement[hour] = 0;
      hourlyCount[hour] = 0;
    }

    const postMetrics = metrics.filter(m => m.post_id === post.id);
    const engagement = postMetrics.reduce((sum, m) => sum + (m.likes || 0) + (m.comments || 0) + (m.shares || 0), 0);

    hourlyEngagement[hour] += engagement;
    hourlyCount[hour]++;
  });

  let bestHour = null;
  let peakEngagement = 0;

  Object.keys(hourlyEngagement).forEach(hour => {
    const avgEngagement = hourlyCount[hour] > 0 ? hourlyEngagement[hour] / hourlyCount[hour] : 0;
    if (avgEngagement > peakEngagement) {
      peakEngagement = avgEngagement;
      bestHour = parseInt(hour);
    }
  });

  return {
    bestHour,
    peakEngagement: peakEngagement.toFixed(0),
    hourlyBreakdown: hourlyEngagement
  };
}

/**
 * Get top performing content
 */
function getTopPerformers(jobs, posts, metrics) {
  const topPosts = posts
    .map(post => ({
      id: post.id,
      platform: post.platform,
      engagement: metrics
        .filter(m => m.post_id === post.id)
        .reduce((sum, m) => sum + (m.likes || 0) + (m.comments || 0) + (m.shares || 0), 0)
    }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 5);

  return topPosts;
}

/**
 * Get overall engagement metrics
 */
function getEngagementMetrics(metrics) {
  const totalLikes = metrics.reduce((sum, m) => sum + (m.likes || 0), 0);
  const totalComments = metrics.reduce((sum, m) => sum + (m.comments || 0), 0);
  const totalShares = metrics.reduce((sum, m) => sum + (m.shares || 0), 0);
  const totalImpressions = metrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
  const totalClicks = metrics.reduce((sum, m) => sum + (m.clicks || 0), 0);

  return {
    totalEngagement: totalLikes + totalComments + totalShares,
    totalLikes,
    totalComments,
    totalShares,
    totalImpressions,
    totalClicks,
    engagementRate: totalImpressions > 0 ? ((totalLikes + totalComments + totalShares) / totalImpressions * 100).toFixed(2) : 0,
    ctr: totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : 0
  };
}

/**
 * Helper: Get start date based on period
 */
function getStartDate(period) {
  const now = new Date();
  const start = new Date();

  switch (period.toLowerCase()) {
    case 'week':
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'all':
      start.setFullYear(2000); // Very old date
      break;
    default:
      start.setMonth(now.getMonth() - 1);
  }

  start.setHours(0, 0, 0, 0);
  return start;
}

module.exports = {
  getPerformanceReport,
  getRecommendations,
  aggregatePlatformPerformance,
  aggregateLayoutPerformance,
  aggregateJobTypePerformance,
  calculateCostAnalysis,
  analyzePostTiming
};
