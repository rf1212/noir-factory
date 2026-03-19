/**
 * RSS Feed Fetcher
 * Fetches content from all active RSS feeds and stores as content_items
 * Runs on startup and every 15 minutes
 */

const cron = require('node-cron');
const Parser = require('rss-parser');
const { getSupabaseAdmin } = require('../db/supabase');
const logger = require('../utils/logger');

const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['description', 'descriptionRaw']
    ]
  }
});

let isProcessing = false;

/**
 * Fetch all active feeds and import new content items
 */
async function fetchAllFeeds() {
  if (isProcessing) {
    logger.debug('Feed fetcher already running, skipping');
    return;
  }

  isProcessing = true;

  try {
    const db = getSupabaseAdmin();

    // Get all active feeds from rss_feeds table
    const { data: feeds, error: feedsError } = await db
      .from('rss_feeds')
      .select('id, company_id, feed_name, feed_url, is_active')
      .eq('is_active', true);

    if (feedsError) {
      logger.error('Error fetching RSS feeds:', feedsError);
      return;
    }

    if (!feeds || feeds.length === 0) {
      logger.debug('No active RSS feeds found');
      return;
    }

    logger.info(`Found ${feeds.length} active RSS feeds to process`);

    let totalNew = 0;
    let totalSkipped = 0;

    for (const feed of feeds) {
      try {
        logger.debug(`Fetching feed: ${feed.feed_name} (${feed.feed_url})`);

        let parsedFeed;
        let rawXml = '';
        try {
          // Fetch raw XML first for image extraction
          const https = require('https');
          const http = require('http');
          const mod = feed.feed_url.startsWith('https') ? https : http;
          rawXml = await new Promise((resolve, reject) => {
            mod.get(feed.feed_url, { headers: { 'User-Agent': 'Noir-Factory/1.0' } }, (res) => {
              let data = '';
              res.on('data', chunk => data += chunk);
              res.on('end', () => resolve(data));
            }).on('error', reject);
          });
          parsedFeed = await parser.parseString(rawXml);
        } catch (parseError) {
          logger.warn(`Failed to parse feed "${feed.feed_name}": ${parseError.message}`);
          continue;
        }

        // Build image map from raw XML — extract media:content url for each item
        const imageMap = {};
        const itemBlocks = rawXml.split('<item>');
        logger.debug(`Image extraction: ${itemBlocks.length - 1} item blocks found`);
        for (const block of itemBlocks) {
          const guidMatch = block.match(/<guid[^>]*>([^<]+)<\/guid>/i) || block.match(/<link>([^<]+)<\/link>/i);
          const mediaMatch = block.match(/media:content[^>]*url=["']([^"']+)["']/i);
          if (guidMatch && mediaMatch) {
            const cleanUrl = mediaMatch[1].replace(/&amp;/g, '&');
            imageMap[guidMatch[1].trim()] = cleanUrl;
          }
        }
        logger.info(`Image map: ${Object.keys(imageMap).length} images found for "${feed.feed_name}"`);

        if (!parsedFeed.items || parsedFeed.items.length === 0) {
          logger.debug(`Feed "${feed.feed_name}" has no items`);
          continue;
        }

        logger.debug(`Feed "${feed.feed_name}" has ${parsedFeed.items.length} items`);

        // Process each item
        for (const item of parsedFeed.items) {
          const title = (item.title || '').trim();
          if (!title) continue;

          // Extract fields
          const url = item.link || item.guid || '';
          const guid = item.guid || item.id || url;
          const sourceGuid = `feed-${feed.id}-${guid}`;

          // Check if already exists (dedup by source_guid)
          const { data: existing } = await db
            .from('content_items')
            .select('id')
            .eq('source_guid', sourceGuid)
            .limit(1);

          if (existing && existing.length > 0) {
            totalSkipped++;
            continue;
          }

          // Extract content — try multiple fields, strip HTML tags for plain text
          const rawHtml = item.descriptionRaw || item.contentEncoded || item.content || item.description || '';
          const plainText = rawHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          const content = plainText || item.contentSnippet || '';
          const author = item['dc:creator'] || item.creator || item.author || 'unknown';
          const publishedAt = item.pubDate || item.isoDate || new Date().toISOString();

          // Extract image — try every possible source
          let imageUrl = null;

          // 0. Check imageMap from raw XML parsing (most reliable for media:content)
          const itemGuid = item.guid || item.link || url;
          if (imageMap[itemGuid]) {
            imageUrl = imageMap[itemGuid];
          }

          // 1. media:content parsed by rss-parser (returns {$: {url: '...'}})
          if (!imageUrl && item.mediaContent) {
            if (item.mediaContent.$ && item.mediaContent.$.url) {
              imageUrl = item.mediaContent.$.url;
            } else if (typeof item.mediaContent === 'object' && item.mediaContent.url) {
              imageUrl = item.mediaContent.url;
            }
          }

          // 1b. media:content from imageMap (backup)
          if (!imageUrl && item.mediaContent) {
            const mc = item.mediaContent;
            if (typeof mc === 'string') imageUrl = mc;
            else if (mc.$ && mc.$.url) imageUrl = mc.$.url;
            else if (mc.url) imageUrl = mc.url;
          }

          // 2. media:thumbnail
          if (!imageUrl && item.mediaThumbnail) {
            const mt = item.mediaThumbnail;
            if (typeof mt === 'string') imageUrl = mt;
            else if (mt.$ && mt.$.url) imageUrl = mt.$.url;
            else if (mt.url) imageUrl = mt.url;
          }

          // 3. Extract from raw XML — media:content url attribute
          if (!imageUrl && rawHtml) {
            const mediaMatch = rawHtml.match(/media:content[^>]*url=["']([^"']+)["']/i);
            if (mediaMatch) imageUrl = mediaMatch[1];
          }

          // 4. Extract <img> tags from HTML content
          if (!imageUrl && rawHtml) {
            const imgMatch = rawHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (imgMatch) imageUrl = imgMatch[1];
          }

          // 5. Enclosures
          if (!imageUrl && item.enclosures) {
            const imgEnc = item.enclosures.find(e => e.type && e.type.startsWith('image/'));
            if (imgEnc) imageUrl = imgEnc.url;
          }

          // 6. Decode HTML entities in image URL
          if (imageUrl) {
            imageUrl = imageUrl.replace(/&amp;/g, '&');
          }

          // 7. Fallback placeholder
          if (!imageUrl) {
            imageUrl = `https://picsum.photos/seed/${encodeURIComponent(sourceGuid).substring(0,30)}/600/400`;
          }

          // Insert new content item
          const { data: newItem, error: insertError } = await db
            .from('content_items')
            .insert([{
              company_id: feed.company_id,
              feed_id: feed.id,
              source_guid: sourceGuid,
              source_url: url,
              source_title: title,
              source_content: content,
              source_author: author,
              source_image_url: imageUrl,
              source_published_at: publishedAt,
              review_status: 'pending'
            }])
            .select()
            .single();

          if (insertError) {
            logger.warn(`Failed to insert content from feed "${feed.feed_name}": ${insertError.message}`);
            continue;
          }

          logger.debug(`Added new content: "${title.substring(0, 60)}"`);
          totalNew++;

          // Rate limit
          await sleep(100);
        }

      } catch (feedErr) {
        logger.error(`Error processing feed "${feed.feed_name}":`, feedErr.message);
      }
    }

    logger.info(`Feed fetch complete: ${totalNew} new items, ${totalSkipped} skipped`);

  } catch (error) {
    logger.error('Feed fetcher error:', error.message);
  } finally {
    isProcessing = false;
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Start the feed fetcher job
 * Runs on startup and every 15 minutes
 */
function startFeedFetcher() {
  const schedule = process.env.FEED_FETCH_INTERVAL || '*/15 * * * *';

  if (!cron.validate(schedule)) {
    throw new Error(`Invalid FEED_FETCH_INTERVAL: ${schedule}`);
  }

  logger.info(`Feed fetcher scheduled: ${schedule}`);

  // Run immediately on startup
  logger.info('Running initial feed fetch...');
  fetchAllFeeds().catch(err => logger.error('Initial feed fetch error:', err.message));

  // Schedule recurring runs
  const task = cron.schedule(schedule, () => {
    logger.debug('Triggering scheduled feed fetch...');
    fetchAllFeeds().catch(err => logger.error('Scheduled feed fetch error:', err.message));
  });

  return task;
}

/**
 * Manually trigger feed fetch
 */
async function triggerManualFetch() {
  logger.info('Manual feed fetch triggered');
  return fetchAllFeeds();
}

module.exports = {
  startFeedFetcher,
  triggerManualFetch,
  fetchAllFeeds
};
