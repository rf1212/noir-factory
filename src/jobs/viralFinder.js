/**
 * Viral Content Finder Job
 * Automatically finds viral/trending content for each company
 * Runs every hour, searches for keywords, and stores in content_items table
 */

const { getSupabaseAdmin } = require('../db/supabase');
const logger = require('../utils/logger');

// Default keywords based on company name
const DEFAULT_KEYWORDS_BY_COMPANY = {
  'RawFunds': ['personal finance', 'credit repair', 'investing'],
  'Proxitap': ['airport wifi', 'travel security', 'cybersecurity']
};

/**
 * Fetch Reddit hot posts for a keyword
 */
async function fetchRedditHotPosts(keyword) {
  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&sort=hot&t=day&limit=5`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Noir-Factory/1.0 (Educational Research)'
      }
    });

    if (!response.ok) {
      logger.warn(`Reddit API error for "${keyword}": ${response.status}`);
      return [];
    }

    const data = await response.json();
    const posts = data.data?.children || [];

    return posts
      .filter(post => post.data && post.data.title)
      .map(post => {
        const p = post.data;
        return {
          title: p.title,
          excerpt: (p.selftext || '').substring(0, 300),
          source: `r/${p.subreddit}`,
          platform: 'reddit',
          url: `https://reddit.com${p.permalink}`,
          image_url: p.thumbnail && p.thumbnail.startsWith('http')
            ? p.thumbnail
            : null,
          score: p.ups || 0,
          created_at: new Date(p.created_utc * 1000).toISOString()
        };
      });
  } catch (error) {
    logger.warn(`Failed to fetch Reddit posts for "${keyword}":`, error.message);
    return [];
  }
}

/**
 * Fetch Google News RSS for a keyword
 */
async function fetchGoogleNewsRSS(keyword) {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=en-US&gl=US&ceid=US:en`;
    const response = await fetch(url);

    if (!response.ok) {
      logger.warn(`Google News RSS error for "${keyword}": ${response.status}`);
      return [];
    }

    const text = await response.text();

    // Simple XML parsing for RSS (extracting items)
    const itemRegex = /<item>[\s\S]*?<\/item>/g;
    const items = text.match(itemRegex) || [];

    return items.slice(0, 5).map((item, idx) => {
      // Extract title
      const titleMatch = item.match(/<title>([^<]+)<\/title>/);
      const title = titleMatch ? titleMatch[1] : `News Item ${idx}`;

      // Extract description/excerpt
      const descMatch = item.match(/<description>([^<]+)<\/description>/);
      const excerpt = descMatch ? descMatch[1].substring(0, 300) : '';

      // Extract link
      const linkMatch = item.match(/<link>([^<]+)<\/link>/);
      const url = linkMatch ? linkMatch[1] : '';

      // Extract source (usually in description or title)
      const sourceMatch = item.match(/by ([^<]+) -/);
      const source = sourceMatch ? sourceMatch[1] : 'Google News';

      // Extract publication date
      const pubDateMatch = item.match(/<pubDate>([^<]+)<\/pubDate>/);
      const created_at = pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString();

      return {
        title,
        excerpt,
        source,
        platform: 'news',
        url,
        image_url: null,
        score: 100,
        created_at
      };
    });
  } catch (error) {
    logger.warn(`Failed to fetch Google News RSS for "${keyword}":`, error.message);
    return [];
  }
}

/**
 * Get keywords for a company
 */
async function getCompanyKeywords(companyId, companyName) {
  const client = getSupabaseAdmin();

  try {
    // Fetch saved search keywords from app_config
    const { data: configItems, error } = await client
      .from('app_config')
      .select('*')
      .eq('company_id', companyId)
      .like('key', 'saved_search_%');

    if (error) {
      logger.warn(`Failed to fetch keywords for company ${companyId}:`, error.message);
      return [];
    }

    const savedKeywords = (configItems || []).map(item => item.value).filter(Boolean);

    // Combine with default keywords
    const defaultKeywords = DEFAULT_KEYWORDS_BY_COMPANY[companyName] || [];
    const allKeywords = [...new Set([...savedKeywords, ...defaultKeywords])];

    return allKeywords.filter(k => k && k.trim().length > 0);
  } catch (error) {
    logger.warn(`Error getting keywords for company ${companyId}:`, error.message);
    return [];
  }
}

/**
 * Store viral content in content_items table
 */
async function storeViralContent(companyId, viralItems) {
  if (viralItems.length === 0) return;

  const client = getSupabaseAdmin();

  try {
    const itemsToInsert = viralItems.map(item => ({
      company_id: companyId,
      source_title: item.title,
      source_content: item.excerpt,
      source_url: item.url,
      source_author: item.source,
      source_image_url: item.image_url,
      source_guid: `viral-${item.platform}-${item.score}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      review_status: 'pending',
      created_at: item.created_at
    }));

    const { error } = await client
      .from('content_items')
      .insert(itemsToInsert);

    if (error) {
      logger.warn(`Failed to store viral content for company ${companyId}:`, error.message);
    } else {
      logger.info(`Stored ${itemsToInsert.length} viral content items for company ${companyId}`);
    }
  } catch (error) {
    logger.warn(`Error storing viral content for company ${companyId}:`, error.message);
  }
}

/**
 * Process viral content for a single company
 */
async function processCompanyViralContent(companyId, companyName) {
  try {
    logger.info(`Processing viral content for ${companyName} (${companyId})`);

    // Get keywords for this company
    const keywords = await getCompanyKeywords(companyId, companyName);
    if (keywords.length === 0) {
      logger.warn(`No keywords found for company ${companyId}`);
      return;
    }

    logger.info(`Found ${keywords.length} keywords for ${companyName}: ${keywords.join(', ')}`);

    // Collect all viral content for this company
    const allViralContent = [];

    for (const keyword of keywords) {
      logger.info(`Fetching viral content for keyword: "${keyword}"`);

      // Fetch from Reddit and Google News in parallel
      const [redditPosts, newsPosts] = await Promise.all([
        fetchRedditHotPosts(keyword),
        fetchGoogleNewsRSS(keyword)
      ]);

      allViralContent.push(...redditPosts, ...newsPosts);
    }

    // Deduplicate by title
    const seenTitles = new Set();
    const uniqueContent = allViralContent.filter(item => {
      if (seenTitles.has(item.title)) return false;
      seenTitles.add(item.title);
      return true;
    });

    logger.info(`Found ${uniqueContent.length} unique viral content items for ${companyName}`);

    // Store in database
    await storeViralContent(companyId, uniqueContent);
  } catch (error) {
    logger.error(`Error processing viral content for company ${companyId}:`, error);
  }
}

/**
 * Main job: Process viral content for all companies
 */
async function runViralFinder() {
  try {
    logger.info('🔥 Starting viral content finder job');

    const client = getSupabaseAdmin();

    // Get all companies
    const { data: companies, error } = await client
      .from('companies')
      .select('id, name');

    if (error) {
      logger.error('Failed to fetch companies:', error);
      return;
    }

    if (!companies || companies.length === 0) {
      logger.warn('No companies found');
      return;
    }

    logger.info(`Processing ${companies.length} companies`);

    // Process each company sequentially to avoid rate limiting
    for (const company of companies) {
      await processCompanyViralContent(company.id, company.name);
      // Small delay between companies to avoid rate limiting
      await new Promise(r => setTimeout(r, 2000));
    }

    logger.info('✅ Viral content finder job completed');
  } catch (error) {
    logger.error('❌ Viral content finder job failed:', error);
  }
}

/**
 * Start the viral finder as a recurring job (every hour)
 */
function startViralFinder() {
  logger.info('🔥 Initializing viral content finder (runs every hour)');

  // Run immediately on startup
  runViralFinder().catch(err => {
    logger.error('Initial viral finder run failed:', err.message);
  });

  // Then run every hour
  const HOUR_MS = 60 * 60 * 1000;
  setInterval(() => {
    runViralFinder().catch(err => {
      logger.error('Scheduled viral finder run failed:', err.message);
    });
  }, HOUR_MS);
}

module.exports = { startViralFinder, runViralFinder };
