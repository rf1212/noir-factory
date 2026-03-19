/**
 * RSS Feed Fetcher
 * Fetches content from all active RSS feeds and stores as content_items
 * Runs on startup and every 15 minutes
 */

const cron = require('node-cron');
const Parser = require('rss-parser');
const { getSupabase } = require('../db/local-adapter');
const logger = require('../utils/logger');

const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'content'],
      ['id', 'redditId'],
      ['media:thumbnail', 'image']
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
    const db = getSupabase();

    // Get all active feeds from rss_feeds table
    const { data: feeds, error: feedsError } = await db
      .from('rss_feeds')
      .select('id, company_id, name, url, is_active')
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
        logger.debug(`Fetching feed: ${feed.name} (${feed.url})`);

        let parsedFeed;
        try {
          parsedFeed = await parser.parseURL(feed.url);
        } catch (parseError) {
          logger.warn(`Failed to parse feed "${feed.name}": ${parseError.message}`);
          continue;
        }

        if (!parsedFeed.items || parsedFeed.items.length === 0) {
          logger.debug(`Feed "${feed.name}" has no items`);
          continue;
        }

        logger.debug(`Feed "${feed.name}" has ${parsedFeed.items.length} items`);

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

          // Extract content
          const content = item.contentSnippet || item.content || item.description || '';
          const author = item['dc:creator'] || item.creator || item.author || 'unknown';
          const publishedAt = item.pubDate || item.isoDate || new Date().toISOString();

          // Try to extract image URL from various possible fields
          let imageUrl = null;
          if (item.image) {
            imageUrl = typeof item.image === 'string' ? item.image : item.image.url;
          } else if (item['media:thumbnail']) {
            imageUrl = typeof item['media:thumbnail'] === 'string'
              ? item['media:thumbnail']
              : item['media:thumbnail'].url;
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
            logger.warn(`Failed to insert content from feed "${feed.name}": ${insertError.message}`);
            continue;
          }

          logger.debug(`Added new content: "${title.substring(0, 60)}"`);
          totalNew++;

          // Rate limit
          await sleep(100);
        }

      } catch (feedErr) {
        logger.error(`Error processing feed "${feed.name}":`, feedErr.message);
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
