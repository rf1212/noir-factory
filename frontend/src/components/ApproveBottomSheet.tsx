import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Sparkles } from 'lucide-react';
import * as api from '../lib/api';
import type { ContentItem } from '../types';

interface Avatar {
  id: string;
  name: string;
  image_url: string;
  voice_url: string;
}

interface ApproveBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  contentItem: ContentItem;
}

const LAYOUTS = [
  { id: 'reddit-bg-pip', name: 'Reddit BG+PiP', icon: '📱' },
  { id: 'split-screen', name: 'Split Screen', icon: '▢▢' },
  { id: 'hook-reddit', name: 'Hook→Reddit', icon: '⭐', badge: 'Top Performer' },
  { id: 'text-first', name: 'Text-First', icon: '📝' },
  { id: 'faceless', name: 'Faceless', icon: '💰', badge: 'Lowest Cost' },
  { id: 'news-overlay', name: 'News Overlay', icon: '📰' },
  { id: 'quote-card', name: 'Quote Card', icon: '💬' },
  { id: 'reaction', name: 'Reaction', icon: '😂' },
  { id: 'scroll-through', name: 'Scroll-Through', icon: '⭐', badge: 'High Watch Time' },
  { id: 'duet', name: 'Duet', icon: '🎬' },
  { id: 'word-by-word', name: 'Word-by-Word', icon: '⭐', badge: 'Highest Engagement' },
];

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: '📷', dimensions: '1080×1350' },
  { id: 'facebook', name: 'Facebook', icon: '👍', dimensions: '1200×628' },
  { id: 'threads', name: 'Threads', icon: '🧵', dimensions: '1080×1080' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', dimensions: '1080×1920' },
  { id: 'youtube', name: 'YouTube', icon: '▶️', dimensions: '1280×720' },
  { id: 'twitter', name: 'Twitter/X', icon: '𝕏', dimensions: '1024×512' },
];

export function ApproveBottomSheet({
  isOpen,
  onClose,
  onComplete,
  contentItem,
}: ApproveBottomSheetProps) {
  const [selectedLayout, setSelectedLayout] = useState('hook-reddit');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram']);
  const [isEvergreen, setIsEvergreen] = useState(false);
  const [evergreenInterval, setEvergreenInterval] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [hookText, setHookText] = useState('');
  const [onScreenText, setOnScreenText] = useState('');
  const [firstComment, setFirstComment] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAvatars();
    }
  }, [isOpen]);

  const loadAvatars = async () => {
    setLoadingAvatars(true);
    try {
      const response = await api.getAvatars();
      if (response.success && response.avatars) {
        setAvatars(response.avatars);
        if (response.avatars.length > 0) {
          setSelectedAvatar(response.avatars[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load avatars:', error);
    } finally {
      setLoadingAvatars(false);
    }
  };

  const shouldShowAvatars =
    selectedLayout !== 'faceless' && selectedLayout !== 'quote-card';

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  const calculateEstimatedCost = () => {
    const hasVideo = ['reddit-bg-pip', 'hook-reddit', 'duet', 'reaction'].includes(
      selectedLayout
    );
    const videoMultiplier = hasVideo ? 2.5 : 0.03;
    return videoMultiplier * selectedPlatforms.length;
  };

  const estimatedCost = calculateEstimatedCost();

  const handleGenerate = async () => {
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedAvatarName = selectedAvatar
        ? avatars.find((a) => a.id === selectedAvatar)?.name
        : undefined;

      await api.createContentJob({
        content_item_id: contentItem.id,
        job_type: 'video_with_avatar',
        target_platforms: selectedPlatforms,
        avatar_name: selectedAvatarName,
        caption_text: caption,
        hashtags_text: hashtags,
        hook_text: hookText,
        on_screen_text: onScreenText,
        first_comment: firstComment,
        layout_type: selectedLayout,
        is_evergreen: isEvergreen,
        evergreen_interval_days: isEvergreen ? evergreenInterval : undefined,
      });

      onComplete();
    } catch (error) {
      console.error('Failed to create job:', error);
      alert('Failed to create job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-noir-bg rounded-t-3xl border-t border-noir-border max-h-[92vh] overflow-y-auto"
          >
            {/* Handle and Close */}
            <div className="sticky top-0 bg-noir-bg border-b border-noir-border p-4 flex items-center justify-between">
              <div className="flex-1 flex justify-center">
                <div className="w-12 h-1 bg-noir-border rounded-full" />
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-noir-surface rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Section 1: Layout Picker */}
              <div>
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">
                  Choose Layout
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {LAYOUTS.map((layout) => (
                    <motion.button
                      key={layout.id}
                      onClick={() => setSelectedLayout(layout.id)}
                      className={`relative p-3 rounded-2xl border-2 transition-all duration-200 ${
                        selectedLayout === layout.id
                          ? 'border-accent-primary bg-accent-primary/10'
                          : 'border-noir-border bg-noir-surface hover:border-accent-primary/50'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-2xl">{layout.icon}</div>
                        <span className="text-xs font-semibold text-center text-text-primary line-clamp-2">
                          {layout.name}
                        </span>
                        {layout.badge && (
                          <span className="text-xs font-bold text-accent-primary">
                            {layout.badge}
                          </span>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Section 2: Avatar Picker */}
              {shouldShowAvatars && (
                <div>
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">
                    Select Avatar
                  </h3>
                  {loadingAvatars ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 rounded-full border-2 border-noir-border border-t-accent-primary animate-spin" />
                    </div>
                  ) : avatars.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {avatars.map((avatar) => (
                        <motion.button
                          key={avatar.id}
                          onClick={() => setSelectedAvatar(avatar.id)}
                          className={`flex-shrink-0 flex flex-col items-center gap-2 p-2 rounded-2xl transition-all duration-200 ${
                            selectedAvatar === avatar.id
                              ? 'ring-2 ring-accent-primary'
                              : 'hover:ring-1 hover:ring-accent-primary/30'
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <img
                            src={avatar.image_url}
                            alt={avatar.name}
                            className="w-12 h-12 rounded-full object-cover border border-noir-border"
                          />
                          <span className="text-xs font-semibold text-text-secondary text-center max-w-[60px] line-clamp-1">
                            {avatar.name}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-text-muted text-sm">
                      No avatars available
                    </div>
                  )}
                </div>
              )}

              {/* Section 3: AI-Generated Post Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  Post Details
                </h3>

                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1 block">
                    Caption
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="AI will generate caption based on content..."
                      className="flex-1 bg-noir-surface border border-noir-border rounded-xl p-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50 resize-none min-h-[80px]"
                    />
                    <button className="p-2 rounded-lg hover:bg-noir-surface text-accent-primary transition-colors flex-shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1 block">
                    Hashtags
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      value={hashtags}
                      onChange={(e) => setHashtags(e.target.value)}
                      placeholder="AI will generate hashtags..."
                      className="flex-1 bg-noir-surface border border-noir-border rounded-xl p-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50 resize-none min-h-[60px]"
                    />
                    <button className="p-2 rounded-lg hover:bg-noir-surface text-accent-primary transition-colors flex-shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1 block">
                    Hook Text
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={hookText}
                      onChange={(e) => setHookText(e.target.value)}
                      placeholder="AI will generate hook..."
                      className="flex-1 bg-noir-surface border border-noir-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50"
                    />
                    <button className="p-2 rounded-lg hover:bg-noir-surface text-accent-primary transition-colors flex-shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1 block">
                    On-Screen Text
                  </label>
                  <textarea
                    value={onScreenText}
                    onChange={(e) => setOnScreenText(e.target.value)}
                    placeholder="Text overlay on video..."
                    className="w-full bg-noir-surface border border-noir-border rounded-xl p-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50 resize-none min-h-[60px]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1 block">
                    First Comment
                  </label>
                  <textarea
                    value={firstComment}
                    onChange={(e) => setFirstComment(e.target.value)}
                    placeholder="Auto-posted first comment..."
                    className="w-full bg-noir-surface border border-noir-border rounded-xl p-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50 resize-none min-h-[60px]"
                  />
                </div>
              </div>

              {/* Section 4: Platform Selector */}
              <div>
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3">
                  Platforms
                </h3>
                <div className="space-y-2">
                  {PLATFORMS.map((platform) => {
                    const isSelected = selectedPlatforms.includes(platform.id);
                    return (
                      <motion.button
                        key={platform.id}
                        onClick={() => togglePlatform(platform.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                          isSelected
                            ? 'border-accent-primary bg-accent-primary/10'
                            : 'border-noir-border bg-noir-surface hover:border-accent-primary/30'
                        }`}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="text-2xl">{platform.icon}</span>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-semibold text-text-primary">
                            {platform.name}
                          </div>
                          <div className="text-xs text-text-muted">
                            {platform.dimensions}
                          </div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded border-2 transition-all duration-200 ${
                            isSelected
                              ? 'bg-accent-primary border-accent-primary'
                              : 'border-noir-border'
                          }`}
                        />
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Section 5: Evergreen Toggle */}
              <div>
                <div className="flex items-center justify-between p-3 bg-noir-surface rounded-xl border border-noir-border">
                  <span className="text-sm font-semibold text-text-primary">
                    ♻️ Evergreen
                  </span>
                  <button
                    onClick={() => setIsEvergreen(!isEvergreen)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                      isEvergreen ? 'bg-accent-primary' : 'bg-noir-border'
                    }`}
                  >
                    <motion.div
                      className="absolute top-1 left-1 w-4 h-4 bg-noir-bg rounded-full"
                      animate={{ x: isEvergreen ? 24 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  </button>
                </div>

                {isEvergreen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex gap-2"
                  >
                    {[7, 14, 30].map((interval) => (
                      <button
                        key={interval}
                        onClick={() => setEvergreenInterval(interval)}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 border ${
                          evergreenInterval === interval
                            ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                            : 'border-noir-border text-text-secondary hover:border-accent-primary/50'
                        }`}
                      >
                        {interval}d
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Bottom: Generate Button */}
              <div className="sticky bottom-0 bg-noir-bg border-t border-noir-border pt-4 -mx-4 px-4 pb-4">
                <motion.button
                  onClick={handleGenerate}
                  disabled={isSubmitting || selectedPlatforms.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-accent-primary via-accent-primary to-accent-primary/80 hover:shadow-lg hover:shadow-accent-primary/30 text-noir-bg rounded-xl font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[50px]"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Zap className="w-5 h-5" />
                  {isSubmitting ? 'Generating...' : 'Generate Post'}
                </motion.button>

                <div className="text-center mt-3 space-y-1">
                  <p className="text-xs text-text-muted">
                    Est. cost: ~${estimatedCost.toFixed(2)}
                  </p>
                  <p className="text-xs text-text-muted">
                    {selectedPlatforms.length === 0
                      ? 'Select a platform to continue'
                      : `${selectedPlatforms.length} platform${selectedPlatforms.length !== 1 ? 's' : ''} selected`}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
