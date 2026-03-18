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
      title: 'Claude 4 Releases New Features for Code Generation',
      excerpt: 'Anthropic unveils latest version with improved reasoning and faster inference. Developers report 40% improvement in code quality. Open discussion on r/MachineLearning about training methods.',
      image_url: 'https://picsum.photos/seed/trend1/600/400',
      source: 'r/MachineLearning',
      url: 'https://reddit.com/r/MachineLearning/comments/ai_claude_release',
      score: 9500,
      volume: 1200,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-2',
      platform: 'twitter',
      topic: 'Web3 Development',
      hashtag: '#Web3',
      title: 'Major Crypto Exchange Reports Record Trading Volume',
      excerpt: 'Bitcoin hits new milestone as institutional investors enter market. Solana ecosystem sees surge in developer activity. Industry leaders discuss regulatory implications.',
      image_url: 'https://picsum.photos/seed/trend2/600/400',
      source: '@CryptoNews',
      url: 'https://twitter.com/CryptoNews/status/web3_trend',
      score: 8700,
      volume: 950,
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-3',
      platform: 'tiktok',
      topic: 'Viral Dance Challenge',
      hashtag: '#DanceChallenge2026',
      title: 'Spring Move Challenge Takes Over TikTok',
      excerpt: '500M+ views as creators worldwide participate in new dance trend. Music producer releases official remix. Celebrity influencers join the movement with unique spins.',
      image_url: 'https://picsum.photos/seed/trend3/600/400',
      source: '@TikTokCreators',
      url: 'https://tiktok.com/@trending/dance_challenge_2026',
      score: 12000,
      volume: 2500,
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-4',
      platform: 'instagram',
      topic: 'Sustainable Fashion',
      hashtag: '#SustainableFashion',
      title: 'Eco-Friendly Fashion Week Draws Millions of Followers',
      excerpt: 'Top designers showcase sustainable collections using recycled materials. Influencers highlight zero-waste production methods. Movement toward circular fashion grows exponentially.',
      image_url: 'https://picsum.photos/seed/trend4/600/400',
      source: '@VogueInsider',
      url: 'https://instagram.com/p/sustainable_fashion_week',
      score: 7200,
      volume: 680,
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-5',
      platform: 'twitter',
      topic: 'Climate Action',
      hashtag: '#ClimateAction',
      title: 'Global Climate Summit Announces New Carbon Neutral Initiative',
      excerpt: '150+ countries commit to aggressive emissions targets. Tech companies pledge $50B in green investments. Scientists praise momentum but call for faster implementation.',
      image_url: 'https://picsum.photos/seed/trend5/600/400',
      source: '@Reuters',
      url: 'https://twitter.com/Reuters/status/climate_summit_2026',
      score: 9100,
      volume: 1100,
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-6',
      platform: 'reddit',
      topic: 'Gaming Industry News',
      hashtag: '#Gaming',
      title: 'Next-Gen Console Wars Heat Up With Exclusive Game Reveals',
      excerpt: 'Three major publishers announce blockbuster titles. Gaming community speculates on hardware capabilities. Industry analysts predict record sales quarter.',
      image_url: 'https://picsum.photos/seed/trend6/600/400',
      source: 'r/gaming',
      url: 'https://reddit.com/r/gaming/comments/next_gen_console_wars',
      score: 8900,
      volume: 1050,
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-7',
      platform: 'tiktok',
      topic: 'Fitness and Wellness',
      hashtag: '#FitnessGoals',
      title: 'Viral Workout Routine Gets 800M Views in One Week',
      excerpt: 'Personal trainer shares 10-minute workout that fits any schedule. Millions share transformations after following the program. Health experts validate effectiveness.',
      image_url: 'https://picsum.photos/seed/trend7/600/400',
      source: '@FitnessInfluencer',
      url: 'https://tiktok.com/@fitness_trending/viral_workout',
      score: 11200,
      volume: 2100,
      timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-8',
      platform: 'instagram',
      topic: 'Travel Destinations',
      hashtag: '#TravelGram',
      title: 'Hidden Caribbean Island Becomes Instagram\'s Most Wanted Destination',
      excerpt: 'Influencers discover pristine beaches with crystal waters. Local economy booming from tourism surge. Travel agencies report bookings up 300% year-over-year.',
      image_url: 'https://picsum.photos/seed/trend8/600/400',
      source: '@TravelandLeisure',
      url: 'https://instagram.com/p/hidden_caribbean_island',
      score: 6800,
      volume: 620,
      timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-9',
      platform: 'news',
      topic: 'Airport WiFi Security Risks',
      hashtag: '#CyberSecurity',
      title: 'Security Researchers Uncover Major Vulnerability in Airport Networks',
      excerpt: 'Study reveals travelers at major airports exposed to data theft. Airlines announce emergency patching across global network. Privacy advocates demand stricter regulations.',
      image_url: 'https://picsum.photos/seed/trend9/600/400',
      source: 'TechCrunch',
      url: 'https://techcrunch.com/security/airport_wifi_vulnerability_2026',
      score: 8200,
      volume: 890,
      timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-10',
      platform: 'news',
      topic: 'TSA Changes Travel Rules for 2026',
      hashtag: '#Travel',
      title: 'TSA Implements New Security Protocols to Reduce Airport Wait Times',
      excerpt: 'Biometric screening system accelerates boarding process significantly. Airlines report 45% faster processing during peak hours. Travelers praise smoother experience at major hubs.',
      image_url: 'https://picsum.photos/seed/trend10/600/400',
      source: 'CNN Travel',
      url: 'https://cnn.com/travel/tsa_new_protocols_2026',
      score: 7500,
      volume: 720,
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-11',
      platform: 'news',
      topic: 'Data Privacy Laws Expand to Cover Public WiFi',
      hashtag: '#Privacy',
      title: 'EU Expands GDPR to Require Encryption on All Public Networks',
      excerpt: 'New regulation mandates end-to-end encryption for coffee shops and public spaces. Tech companies scramble to implement compliance. Digital rights groups celebrate major win.',
      image_url: 'https://picsum.photos/seed/trend11/600/400',
      source: 'Wired',
      url: 'https://wired.com/privacy/eu_gdpr_wifi_2026',
      score: 6900,
      volume: 550,
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-12',
      platform: 'twitter',
      topic: 'AI Safety and Ethics',
      hashtag: '#AIEthics',
      title: 'Industry Leaders Sign AI Safety Charter at Tech Summit',
      excerpt: 'Major AI companies commit to responsible development practices. Research consortium launches safety testing framework. Governments praise industry self-regulation efforts.',
      image_url: 'https://picsum.photos/seed/trend12/600/400',
      source: '@TechSummit2026',
      url: 'https://twitter.com/TechSummit2026/status/ai_safety_charter',
      score: 8500,
      volume: 820,
      timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-13',
      platform: 'reddit',
      topic: 'Remote Work Innovation',
      hashtag: '#RemoteWork',
      title: 'AI Collaboration Tools Make Remote Teams More Productive Than Ever',
      excerpt: 'Study shows distributed teams outperforming office workers by 30%. New tools simplify async communication across time zones. Companies report employee satisfaction at all-time high.',
      image_url: 'https://picsum.photos/seed/trend13/600/400',
      source: 'r/remotework',
      url: 'https://reddit.com/r/remotework/comments/ai_productivity_tools',
      score: 7800,
      volume: 745,
      timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-14',
      platform: 'instagram',
      topic: 'Home Wellness Trends',
      hashtag: '#WellnessAtHome',
      title: 'Biophilic Design Takes Over Interior Decoration Scene',
      excerpt: 'Nature-inspired interiors boost mental health and productivity. Influencers showcase stunning plant-filled spaces. Garden centers report historic sales growth in urban areas.',
      image_url: 'https://picsum.photos/seed/trend14/600/400',
      source: '@InteriorDesignMag',
      url: 'https://instagram.com/p/biophilic_wellness_design',
      score: 7100,
      volume: 680,
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'trend-15',
      platform: 'tiktok',
      topic: 'Budget Travel Hacks',
      hashtag: '#BudgetTravel',
      title: '22-Year-Old Travels World on $15 Per Day Challenge',
      excerpt: 'Travel creator shares survival strategies and hidden gems across continents. Community follows journey in real-time with 6M+ daily viewers. Tourism boards offer collaboration deals.',
      image_url: 'https://picsum.photos/seed/trend15/600/400',
      source: '@BudgetTravelTok',
      url: 'https://tiktok.com/@budget_travel/world_challenge',
      score: 10800,
      volume: 1950,
      timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString()
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
