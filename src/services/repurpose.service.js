/**
 * Content Repurposing Service
 * Takes one content item + generates platform-specific versions
 * Each platform gets correct dimensions from platform_specs table
 */

const { getSupabaseAdmin } = require('../db/supabase');
const logger = require('../utils/logger');

/**
 * Get platform specifications (dimensions, format, etc)
 * @param {string} platform - Platform name (instagram, facebook, tiktok, threads, etc)
 * @param {string} contentType - Content type (image, video, carousel, story)
 * @returns {Promise<Object>} Platform specs {width, height, format, aspectRatio}
 */
async function getPlatformSpecs(platform, contentType = 'image') {
  try {
    const client = getSupabaseAdmin();

    const { data, error } = await client
      .from('platform_specs')
      .select('*')
      .eq('platform', platform.toLowerCase())
      .eq('content_type', contentType.toLowerCase())
      .single();

    if (error || !data) {
      logger.warn(`Platform specs not found for ${platform}/${contentType}, using defaults`);
      return getDefaultSpecs(platform, contentType);
    }

    return {
      width: data.width,
      height: data.height,
      format: data.format || 'jpg',
      aspectRatio: data.aspect_ratio,
      maxDuration: data.max_duration_seconds || null,
      recommendedFrameRate: data.recommended_frame_rate || 30
    };
  } catch (error) {
    logger.error('Failed to get platform specs:', error);
    return getDefaultSpecs(platform, contentType);
  }
}

/**
 * Default specs for common platforms
 */
function getDefaultSpecs(platform, contentType) {
  const specs = {
    instagram: {
      image: { width: 1080, height: 1350, format: 'jpg', aspectRatio: '4:5' },
      video: { width: 1080, height: 1920, format: 'mp4', aspectRatio: '9:16', maxDuration: 60, recommendedFrameRate: 30 },
      carousel: { width: 1080, height: 1350, format: 'jpg', aspectRatio: '4:5' },
      story: { width: 1080, height: 1920, format: 'jpg', aspectRatio: '9:16' }
    },
    facebook: {
      image: { width: 1200, height: 628, format: 'jpg', aspectRatio: '1.91:1' },
      video: { width: 1280, height: 720, format: 'mp4', aspectRatio: '16:9', maxDuration: 240, recommendedFrameRate: 30 },
      carousel: { width: 1200, height: 628, format: 'jpg', aspectRatio: '1.91:1' }
    },
    tiktok: {
      image: { width: 1080, height: 1920, format: 'jpg', aspectRatio: '9:16' },
      video: { width: 1080, height: 1920, format: 'mp4', aspectRatio: '9:16', maxDuration: 600, recommendedFrameRate: 24 }
    },
    threads: {
      image: { width: 1080, height: 1350, format: 'jpg', aspectRatio: '4:5' },
      video: { width: 1080, height: 1920, format: 'mp4', aspectRatio: '9:16', maxDuration: 300, recommendedFrameRate: 30 },
      carousel: { width: 1080, height: 1350, format: 'jpg', aspectRatio: '4:5' }
    },
    twitter: {
      image: { width: 1024, height: 512, format: 'jpg', aspectRatio: '2:1' },
      video: { width: 1920, height: 1080, format: 'mp4', aspectRatio: '16:9', maxDuration: 140, recommendedFrameRate: 30 }
    },
    linkedin: {
      image: { width: 1200, height: 627, format: 'jpg', aspectRatio: '1.91:1' },
      video: { width: 1920, height: 1080, format: 'mp4', aspectRatio: '16:9', maxDuration: 600, recommendedFrameRate: 30 }
    },
    reddit: {
      image: { width: 1200, height: 630, format: 'jpg', aspectRatio: '1.91:1' },
      video: { width: 1920, height: 1080, format: 'mp4', aspectRatio: '16:9', maxDuration: 15, recommendedFrameRate: 30 }
    }
  };

  return specs[platform.toLowerCase()]?.[contentType.toLowerCase()] || {
    width: 1080,
    height: 1080,
    format: 'jpg',
    aspectRatio: '1:1'
  };
}

/**
 * Generate platform-specific caption with hashtags and platform formatting
 * @param {string} platform - Platform name
 * @param {string} originalCaption - Original caption text
 * @returns {string} Platform-specific caption
 */
function adjustCaptionForPlatform(platform, originalCaption) {
  const maxLengths = {
    twitter: 280,
    instagram: 2200,
    tiktok: 2200,
    facebook: 63206,
    linkedin: 3000,
    threads: 500,
    reddit: 10000
  };

  const platform_lower = platform.toLowerCase();
  const maxLength = maxLengths[platform_lower] || 2200;

  let caption = originalCaption;

  // Truncate if needed
  if (caption.length > maxLength) {
    caption = caption.substring(0, maxLength - 3) + '...';
  }

  // Add platform-specific formatting
  if (platform_lower === 'threads') {
    // Threads supports hashtags similar to Instagram
    if (!caption.includes('#')) {
      caption += '\n\n#threadsapp';
    }
  }

  if (platform_lower === 'twitter' && !caption.includes('#')) {
    caption += '\n\n#ContentCreation';
  }

  if (platform_lower === 'linkedin' && !caption.includes('#')) {
    caption += '\n\n#socialmedia';
  }

  return caption;
}

/**
 * Create child jobs for each platform (repurposed versions)
 * @param {Object} parentJob - The original content job
 * @param {Array} platforms - Array of platform names to repurpose for
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Array of created child jobs
 */
async function repurposeForPlatforms(parentJob, platforms, companyId) {
  try {
    if (!parentJob || !parentJob.id) {
      throw new Error('Parent job is required and must have an id');
    }

    if (!Array.isArray(platforms) || platforms.length === 0) {
      throw new Error('Platforms array is required and cannot be empty');
    }

    const client = getSupabaseAdmin();
    const childJobs = [];
    const timestamp = new Date().toISOString();

    // Get platform specs for each platform
    for (const platform of platforms) {
      try {
        const specs = await getPlatformSpecs(platform, parentJob.type || 'image');

        const childJob = {
          company_id: companyId,
          content_item_id: parentJob.content_item_id,
          parent_job_id: parentJob.id,
          type: parentJob.type || 'image',
          platforms: [platform],
          platform_specs: specs,
          caption: adjustCaptionForPlatform(platform, parentJob.first_comment || ''),
          status: 'queued',
          queue_priority: parentJob.queue_priority || 100,
          created_at: timestamp,
          updated_at: timestamp
        };

        childJobs.push(childJob);
      } catch (platformError) {
        logger.error(`Failed to create specs for platform ${platform}:`, platformError);
        // Continue with next platform instead of failing entirely
      }
    }

    if (childJobs.length === 0) {
      throw new Error('Failed to create jobs for any of the requested platforms');
    }

    // Insert all child jobs at once
    const { data, error } = await client
      .from('content_jobs')
      .insert(childJobs)
      .select();

    if (error) {
      logger.error('Failed to insert child jobs:', error);
      throw error;
    }

    logger.info(`Successfully created ${data.length} repurposed jobs for ${platforms.join(', ')}`);

    return data || [];
  } catch (error) {
    logger.error('repurposeForPlatforms error:', error);
    throw error;
  }
}

/**
 * Get all repurposed jobs for a parent job
 * @param {string} parentJobId - Parent job ID
 * @returns {Promise<Array>} Array of child jobs
 */
async function getRepurposedJobs(parentJobId) {
  try {
    const client = getSupabaseAdmin();

    const { data, error } = await client
      .from('content_jobs')
      .select('*')
      .eq('parent_job_id', parentJobId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to get repurposed jobs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('getRepurposedJobs error:', error);
    return [];
  }
}

module.exports = {
  repurposeForPlatforms,
  getPlatformSpecs,
  adjustCaptionForPlatform,
  getRepurposedJobs,
  getDefaultSpecs
};
