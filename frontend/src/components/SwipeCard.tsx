import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Check, RefreshCw } from 'lucide-react';
import type { ContentItem } from '../types';

interface SwipeCardProps {
  item: ContentItem | null;
  onApprove: () => void;
  onReject: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function SwipeCard({ item, onApprove, onReject, onRefresh, isLoading }: SwipeCardProps) {
  const [swipeX, setSwipeX] = useState(0);
  const constraintsRef = useRef<HTMLDivElement>(null);

  if (!item) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center h-96 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center">
          <p className="text-text-secondary mb-6 text-lg">No new content</p>
          <p className="text-text-muted text-sm mb-6">Add RSS feeds in Settings to get started</p>
          <motion.button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent-primary text-noir-bg font-semibold rounded-xl hover:shadow-lg hover:shadow-accent-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 min-h-[44px]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Feed
          </motion.button>
        </div>
      </motion.div>
    );
  }

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    const swipeThreshold = 100;
    if (info.offset.x > swipeThreshold) {
      onApprove();
    } else if (info.offset.x < -swipeThreshold) {
      onReject();
    }
    setSwipeX(0);
  };

  const swipeProgress = Math.min(Math.abs(swipeX) / 100, 1);

  return (
    <div ref={constraintsRef} className="relative w-full h-[65vh] max-h-[600px] perspective px-4">
      {/* Next card shadow effect */}
      <motion.div
        className="absolute inset-4 bg-noir-surface/50 rounded-3xl border border-noir-border/30 blur-sm"
        style={{
          scale: 0.95,
          y: 12,
        }}
      />

      {/* Main card */}
      <motion.div
        drag="x"
        dragConstraints={constraintsRef}
        dragElastic={0.2}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        onDrag={(_: unknown, info: { offset: { x: number } }) => {
          setSwipeX(info.offset.x);
        }}
        className="absolute inset-0 cursor-grab active:cursor-grabbing bg-noir-surface rounded-3xl border border-noir-border overflow-hidden shadow-2xl"
        style={{
          x: swipeX,
          rotate: swipeX * 0.05,
        }}
      >
        {/* Approve glow */}
        {swipeX > 20 && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at ${100 - (swipeX / 300) * 50}% 50%, ${`rgba(0, 214, 143, ${swipeProgress * 0.2})`}, transparent 70%)`,
            }}
          />
        )}

        {/* Reject glow */}
        {swipeX < -20 && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at ${(Math.abs(swipeX) / 300) * 50}% 50%, ${`rgba(255, 71, 87, ${swipeProgress * 0.2})`}, transparent 70%)`,
            }}
          />
        )}

        {/* Approve stamp */}
        {swipeX > 30 && (
          <motion.div
            className="absolute top-8 right-8 pointer-events-none"
            initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 20 }}
          >
            <div className="px-4 py-2 border-2 border-accent-success rounded-full">
              <p className="font-black text-lg text-accent-success">✓ APPROVE</p>
            </div>
          </motion.div>
        )}

        {/* Reject stamp */}
        {swipeX < -30 && (
          <motion.div
            className="absolute top-8 left-8 pointer-events-none"
            initial={{ opacity: 0, scale: 0.5, rotate: 20 }}
            animate={{ opacity: 1, scale: 1, rotate: -20 }}
          >
            <div className="px-4 py-2 border-2 border-accent-danger rounded-full">
              <p className="font-black text-lg text-accent-danger">✕ SKIP</p>
            </div>
          </motion.div>
        )}

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col p-6">
          {/* Image — always show, use placeholder if no image */}
          <div className="relative mb-4 overflow-hidden rounded-2xl flex-shrink-0">
              <img
                src={item.source_image || `https://picsum.photos/seed/${item.id || 'default'}/600/300`}
                alt={item.title}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  e.currentTarget.src = `https://picsum.photos/seed/${Date.now()}/600/300`;
                }}
              />
              {/* Gradient overlay on image */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-noir-surface" />

              {/* Feed tag */}
              <div className="absolute top-3 left-3">
                <span className="inline-block text-xs font-black tracking-wider px-3 py-1.5 bg-accent-primary/90 text-noir-bg rounded-full">
                  {item.feed_name}
                </span>
              </div>
            </div>

          {/* Title */}
          <h2 className="text-2xl font-black tracking-tight text-text-primary line-clamp-3 mb-3">
            {item.title}
          </h2>

          {/* Content — show full post text, scrollable */}
          <div className="flex-1 mb-4 overflow-y-auto max-h-[200px]">
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {item.excerpt}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-noir-border">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              {new Date(item.published_at).toLocaleDateString()}
            </span>
            {item.source_url && (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent-primary hover:text-accent-primary/80 truncate max-w-[120px] font-semibold"
              >
                View
              </a>
            )}
          </div>
        </div>
      </motion.div>

      {/* Bottom Action Buttons */}
      <div className="absolute -bottom-24 left-4 right-4 flex gap-3">
        <motion.button
          onClick={onReject}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-4 bg-noir-surface border-2 border-accent-danger/50 hover:border-accent-danger hover:bg-accent-danger/10 text-accent-danger rounded-2xl font-semibold transition-all duration-200 min-h-[56px]"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <X className="w-6 h-6" />
          <span>Skip</span>
        </motion.button>
        <motion.button
          onClick={onApprove}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-4 bg-accent-success hover:shadow-lg hover:shadow-accent-success/30 text-noir-bg rounded-2xl font-semibold transition-all duration-200 min-h-[56px]"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <Check className="w-6 h-6" />
          <span>Approve</span>
        </motion.button>
      </div>
    </div>
  );
}
