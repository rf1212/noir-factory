/**
 * Trending Routes
 * Handles trending topics and hashtags from various social media platforms
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Mock trending data for now - will be replaced with real API integrations
const MOCK_TRENDING_DATA = {
  all: [
    {
      id: 'trend-1',
      platform: 'reddit',
      topic: 'AI and Machine Learning',
      hashtag: '#AI',
      score: 9500,
      volume: 1200,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-2',
      platform: 'twitter',
      topic: 'Web3 Development',
      hashtag: '#Web3',
      score: 8700,
      volume: 950,
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-3',
      platform: 'tiktok',
      topic: 'Viral Dance Challenge',
      hashtag: '#DanceChallenge2026',
      score: 12000,
      volume: 2500,
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-4',
      platform: 'instagram',
      topic: 'Sustainable Fashion',
      hashtag: '#SustainableFashion',
      score: 7200,
      volume: 680,
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-5',
      platform: 'twitter',
      topic: 'Climate Action',
      hashtag: '#ClimateAction',
      score: 9100,
      volume: 1100,
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-6',
      platform: 'reddit',
      topic: 'Gaming Industry News',
      hashtag: '#Gaming',
      score: 8900,
      volume: 1050,
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-7',
      platform: 'tiktok',
      topic: 'Fitness and Wellness',
      hashtag: '#FitnessGoals',
      score: 11200,
      volume: 2100,
      timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-8',
      platform: 'instagram',
      topic: 'Travel Destinations',
      hashtag: '#TravelGram',
      score: 6800,
      volume: 620,
      timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-9',
      platform: 'news',
      topic: 'Airport WiFi Security Risks',
      hashtag: '#CyberSecurity',
      score: 8200,
      volume: 890,
      timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-10',
      platform: 'news',
      topic: 'TSA Changes Travel Rules for 2026',
      hashtag: '#Travel',
      score: 7500,
      volume: 720,
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-11',
      platform: 'news',
      topic: 'Data Privacy Laws Expand to Cover Public WiFi',
      hashtag: '#Privacy',
      score: 6900,
      volume: 550,
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    }
  ]
};

/**
 * GET /api/trending
 * Get trending topics from specified platform
 * Query params:
 *   - platform: 'all' | 'reddit' | 'twitter' | 'tiktok' | 'instagram' (default: 'all')
 */
router.get('/', async (req, res) => {
  try {
    const { platform = 'all' } = req.query;

    // Accept any platform — filter what we have, return empty for unknown
    const validPlatforms = ['all', 'reddit', 'twitter', 'x_twitter', 'tiktok', 'instagram', 'facebook', 'youtube', 'linkedin', 'threads', 'news'];
    const normalizedPlatform = (!platform || platform === '') ? 'all' : platform.toLowerCase();

    let trendingData = MOCK_TRENDING_DATA.all;

    // Filter by platform if specified
    if (normalizedPlatform !== 'all') {
      trendingData = trendingData.filter(item => item.platform === normalizedPlatform);
    }

    // Sort by score descending
    trendingData = trendingData.sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      data: trendingData,
      platform,
      count: trendingData.length
    });

  } catch (error) {
    logger.error('GET /trending error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
