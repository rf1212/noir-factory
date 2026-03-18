/**
 * Analytics Routes
 * Performance metrics, recommendations, and insights
 */

const express = require('express');
const router = express.Router();
const { getPerformanceReport, getRecommendations } = require('../services/performance.service');
const { requireAuth } = require('../middleware/auth');
const { requireCompanyContext } = require('../middleware/companyContext');
const logger = require('../utils/logger');

/**
 * GET /api/analytics/performance?period=week|month|all
 * Returns performance report with breakdowns by platform, layout, and job type
 */
router.get('/performance', requireAuth, requireCompanyContext, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const companyId = req.company.id;

    // Validate period
    if (!['week', 'month', 'all'].includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Period must be one of: week, month, all'
      });
    }

    const report = await getPerformanceReport(companyId, period);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('GET /analytics/performance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/recommendations
 * Returns AI-style recommendations for content strategy optimization
 */
router.get('/recommendations', requireAuth, requireCompanyContext, async (req, res) => {
  try {
    const companyId = req.company.id;

    const recommendations = await getRecommendations(companyId);

    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length
    });
  } catch (error) {
    logger.error('GET /analytics/recommendations error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
