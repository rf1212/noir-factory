import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, AlertCircle, Loader, Zap, Share2 } from 'lucide-react';
import * as api from '../lib/api';
import type { TrendingItem } from '../types';

type Platform = 'all' | 'news' | 'reddit' | 'twitter' | 'tiktok' | 'instagram';

const PLATFORM_COLORS = {
  reddit: { bg: 'bg-red-500/10', icon: 'text-red-500', border: 'border-red-500/30' },
  twitter: { bg: 'bg-sky-500/10', icon: 'text-sky-500', border: 'border-sky-500/30' },
  tiktok: { bg: 'bg-black/10', icon: 'text-white/80', border: 'border-white/30' },
  instagram: { bg: 'bg-pink-500/10', icon: 'text-pink-500', border: 'border-pink-500/30' },
  news: { bg: 'bg-purple-500/10', icon: 'text-purple-500', border: 'border-purple-500/30' },
};

const PLATFORM_LABELS = {
  reddit: 'Reddit',
  twitter: 'X/Twitter',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  news: 'News',
};

export function TrendingPage() {
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('all');
  const [capturingId, setCapturingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTrending();
  }, [selectedPlatform]);

  const fetchTrending = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getTrending(selectedPlatform === 'all' ? undefined : selectedPlatform);
      setTrendingItems(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trending topics');
      setTrendingItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTrending();
    setRefreshing(false);
  };

  const handleCapture = async (item: TrendingItem) => {
    setCapturingId(item.id);
    try {
      console.log('Capturing trend:', item);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error('Failed to capture trend:', err);
    } finally {
      setCapturingId(null);
    }
  };

  const timeAgoFormatter = (timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const hours = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Skeleton loading card
  const SkeletonCard = () => (
    <motion.div
      className="bg-noir-surface rounded-2xl overflow-hidden border border-noir-border"
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <div className="aspect-video bg-noir-bg" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-noir-bg rounded w-3/4" />
        <div className="h-3 bg-noir-bg rounded w-1/2" />
        <div className="flex gap-2">
          <div className="h-10 bg-noir-bg rounded flex-1" />
          <div className="h-10 bg-noir-bg rounded flex-1" />
        </div>
      </div>
    </motion.div>
  );

  if (loading && trendingItems.length === 0) {
    return (
      <div className="min-h-screen bg-noir-bg pb-24">
        <div className="sticky top-20 z-20 bg-noir-bg/95 backdrop-blur-sm border-b border-noir-border px-4 py-4">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-accent-primary" />
              <h1 className="text-lg font-black text-text-primary">Explore</h1>
            </div>
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-noir-bg flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-noir-surface border border-noir-border flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-accent-danger" />
          </div>
          <p className="text-text-secondary">{error}</p>
          <motion.button
            onClick={fetchTrending}
            className="px-6 py-2 bg-accent-primary hover:shadow-lg hover:shadow-accent-primary/30 text-noir-bg rounded-lg font-semibold transition-all duration-200 min-h-[44px]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Try Again
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-noir-bg">
      {/* Header */}
      <div className="sticky top-20 z-20 bg-noir-bg/95 backdrop-blur-sm border-b border-noir-border px-4 py-4">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-accent-primary" />
              <h1 className="text-lg font-black text-text-primary">Explore</h1>
            </div>
            <motion.button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-noir-surface rounded-lg transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px]"
              whileHover={{ rotate: refreshing ? 0 : 10 }}
              whileTap={{ scale: 0.95 }}
            >
              <Loader className={`w-5 h-5 text-accent-primary ${refreshing ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>

          {/* Platform Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {(['all', 'news', 'reddit', 'twitter', 'tiktok', 'instagram'] as Platform[]).map((platform) => (
              <motion.button
                key={platform}
                onClick={() => setSelectedPlatform(platform)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all duration-200 min-h-[44px] ${
                  selectedPlatform === platform
                    ? 'bg-accent-primary text-noir-bg shadow-lg shadow-accent-primary/30'
                    : 'bg-noir-surface border border-noir-border text-text-secondary hover:border-accent-primary/50'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {platform === 'all' ? 'All' : PLATFORM_LABELS[platform as keyof typeof PLATFORM_LABELS]}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="p-4 pb-24">
        {trendingItems.length === 0 ? (
          <div className="text-center space-y-4 py-12">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-noir-surface border border-noir-border flex items-center justify-center">
              <Flame className="w-8 h-8 text-text-muted" />
            </div>
            <p className="text-text-secondary">No trending topics found</p>
            <p className="text-text-muted text-sm">Try selecting a different platform or check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingItems.map((item, index) => {
              const platformColor =
                PLATFORM_COLORS[item.platform as keyof typeof PLATFORM_COLORS] ||
                PLATFORM_COLORS.reddit;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-noir-surface border border-noir-border rounded-2xl overflow-hidden hover:border-accent-primary/50 transition-all duration-200 flex flex-col h-full"
                >
                  {/* Image */}
                  <div className={`aspect-video ${platformColor.bg} flex items-center justify-center border-b ${platformColor.border}`}>
                    <div className={`text-4xl ${platformColor.icon}`}>
                      {item.platform === 'reddit' && 'R'}
                      {item.platform === 'twitter' && 'X'}
                      {item.platform === 'tiktok' && '♪'}
                      {item.platform === 'instagram' && '📷'}
                      {item.platform === 'news' && '📰'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-1 flex flex-col">
                    {/* Source and Date */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`text-xs font-black px-2 py-1 rounded ${platformColor.bg} border ${platformColor.border}`}>
                          {PLATFORM_LABELS[item.platform as keyof typeof PLATFORM_LABELS]}
                        </div>
                        <span className="text-xs text-text-muted">{timeAgoFormatter(item.timestamp)}</span>
                      </div>
                    </div>

                    {/* Headline */}
                    <h3 className="text-sm font-black text-text-primary mb-2 line-clamp-2">
                      {item.hashtag ? `#${item.hashtag}` : item.topic}
                    </h3>

                    {/* Excerpt */}
                    <p className="text-xs text-text-secondary mb-4 flex-1 line-clamp-2">
                      Trending with {item.volume.toLocaleString()} posts and {item.score.toLocaleString()} engagement score
                    </p>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t border-noir-border">
                      <motion.button
                        onClick={() => handleCapture(item)}
                        disabled={capturingId === item.id}
                        className="flex-1 px-3 py-2.5 bg-noir-bg hover:bg-noir-border text-text-primary rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs min-h-[40px]"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {capturingId === item.id ? (
                          <>
                            <Loader className="w-3 h-3 animate-spin" />
                            <span>Capture</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3 h-3" />
                            <span>Capture</span>
                          </>
                        )}
                      </motion.button>
                      <motion.button
                        onClick={() => console.log('Quick post:', item)}
                        className="flex-1 px-3 py-2.5 bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 text-xs min-h-[40px]"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Quick Post</span>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
