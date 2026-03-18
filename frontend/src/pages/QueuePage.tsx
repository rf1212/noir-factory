import { useEffect, useState } from 'react';
import { useContentStore } from '../store/contentStore';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, AlertCircle, Loader, Share2, RotateCcw, ChevronDown, Layers2 } from 'lucide-react';
import * as api from '../lib/api';

const STATUS_CONFIG = {
  queued: { icon: Clock, color: 'text-text-secondary', bg: 'bg-noir-border/20' },
  processing: { icon: Loader, color: 'text-accent-primary', bg: 'bg-accent-primary/10' },
  ready: { icon: CheckCircle, color: 'text-accent-success', bg: 'bg-accent-success/10' },
  failed: { icon: AlertCircle, color: 'text-accent-danger', bg: 'bg-accent-danger/10' },
  published: { icon: Share2, color: 'text-accent-primary', bg: 'bg-accent-primary/10' },
};

export function QueuePage() {
  const { jobs, loadingJobs, fetchContentJobs } = useContentStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    fetchContentJobs();
    const interval = setInterval(fetchContentJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchContentJobs]);

  const handleRetry = async (jobId: string) => {
    setRetryingId(jobId);
    try {
      await api.retryContentJob(jobId);
      await fetchContentJobs();
    } catch (error) {
      console.error('Failed to retry job:', error);
    } finally {
      setRetryingId(null);
    }
  };

  // Calculate stats by status
  const stats = {
    queued: jobs.filter(j => j.status === 'queued').length,
    processing: jobs.filter(j => j.status === 'processing').length,
    ready: jobs.filter(j => j.status === 'ready').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    published: jobs.filter(j => j.status === 'published').length,
  };

  if (loadingJobs) {
    return (
      <div className="min-h-screen bg-noir-bg flex items-center justify-center px-4">
        <div className="text-center">
          <motion.div
            className="w-12 h-12 rounded-full border-4 border-noir-border border-t-accent-primary mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-text-secondary">Loading queue...</p>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="min-h-screen bg-noir-bg flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-noir-surface border border-noir-border flex items-center justify-center">
            <Layers2 className="w-8 h-8 text-text-muted" />
          </div>
          <p className="text-text-secondary">No jobs yet</p>
          <p className="text-text-muted text-sm">Approve content from Feed to create jobs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-noir-bg">
      {/* Stats Cards */}
      <div className="sticky top-20 z-20 bg-noir-bg/95 backdrop-blur-sm border-b border-noir-border px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.processing > 0 && (
            <motion.div
              className="bg-noir-surface border border-noir-border rounded-xl p-3"
              whileHover={{ y: -2 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted uppercase tracking-wider">Processing</span>
                <span className="text-2xl font-black text-accent-primary">{stats.processing}</span>
              </div>
            </motion.div>
          )}
          {stats.ready > 0 && (
            <motion.div
              className="bg-noir-surface border border-noir-border rounded-xl p-3"
              whileHover={{ y: -2 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted uppercase tracking-wider">Ready</span>
                <span className="text-2xl font-black text-accent-success">{stats.ready}</span>
              </div>
            </motion.div>
          )}
          {stats.failed > 0 && (
            <motion.div
              className="bg-noir-surface border border-noir-border rounded-xl p-3"
              whileHover={{ y: -2 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted uppercase tracking-wider">Failed</span>
                <span className="text-2xl font-black text-accent-danger">{stats.failed}</span>
              </div>
            </motion.div>
          )}
          {stats.published > 0 && (
            <motion.div
              className="bg-noir-surface border border-noir-border rounded-xl p-3"
              whileHover={{ y: -2 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted uppercase tracking-wider">Published</span>
                <span className="text-2xl font-black text-accent-primary">{stats.published}</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Jobs List */}
      <div className="p-4 space-y-3 pb-24">
        {jobs.map((job, index) => {
          const statusConfig =
            STATUS_CONFIG[job.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.queued;
          const StatusIcon = statusConfig.icon;
          const isExpanded = expandedId === job.id;

          return (
            <motion.div
              key={job.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-noir-surface border border-noir-border rounded-2xl overflow-hidden hover:border-accent-primary/30 transition-colors"
            >
              <motion.button
                onClick={() => setExpandedId(isExpanded ? null : job.id)}
                className="w-full p-4 text-left flex items-start gap-4 min-h-[44px] group"
                whileHover={{ paddingLeft: 20 }}
              >
                <div className={`${statusConfig.bg} rounded-xl p-2.5 mt-1 flex-shrink-0`}>
                  <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                      {job.job_type.replace(/_/g, ' ')}
                    </span>
                    <motion.span
                      className={`text-xs font-black px-2.5 py-1 rounded-full ${statusConfig.bg} ${statusConfig.color} uppercase tracking-wider`}
                      animate={job.status === 'processing' ? { scale: [1, 1.02, 1] } : {}}
                      transition={job.status === 'processing' ? { duration: 2, repeat: Infinity } : {}}
                    >
                      {job.status}
                    </motion.span>
                  </div>
                  <p className="text-sm text-text-primary font-semibold line-clamp-1">
                    {job.target_platforms?.join(', ') || 'No platforms'}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {new Date(job.created_at).toLocaleDateString()} at {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-shrink-0 text-text-muted"
                >
                  <ChevronDown className="w-5 h-5" />
                </motion.div>
              </motion.button>

              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-noir-border p-4 space-y-4 bg-noir-surface/50"
                >
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Job ID</p>
                      <p className="text-text-secondary font-mono text-xs break-all bg-noir-bg/50 p-3 rounded-lg border border-noir-border">{job.id}</p>
                    </div>

                    <div>
                      <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Job Type</p>
                      <p className="text-text-primary font-semibold">{job.job_type.replace(/_/g, ' ')}</p>
                    </div>

                    <div>
                      <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Target Platforms</p>
                      <div className="flex flex-wrap gap-2">
                        {job.target_platforms?.map((platform) => (
                          <span
                            key={platform}
                            className="px-3 py-1.5 bg-noir-bg border border-noir-border text-text-secondary text-xs rounded-lg font-medium"
                          >
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>

                    {job.first_comment && (
                      <div>
                        <p className="text-text-muted text-xs uppercase tracking-wider mb-2">First Comment</p>
                        <p className="text-text-secondary text-xs bg-noir-bg/50 p-3 rounded-lg border border-noir-border">
                          {job.first_comment}
                        </p>
                      </div>
                    )}

                    {job.error_message && (
                      <div className="bg-accent-danger/10 border border-accent-danger/30 rounded-lg p-3">
                        <p className="text-accent-danger text-xs font-mono">{job.error_message}</p>
                      </div>
                    )}
                  </div>

                  {job.status === 'failed' && (
                    <motion.button
                      onClick={() => handleRetry(job.id)}
                      disabled={retryingId === job.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent-primary hover:shadow-lg hover:shadow-accent-primary/30 text-noir-bg rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <RotateCcw className={`w-5 h-5 ${retryingId === job.id ? 'animate-spin' : ''}`} />
                      Retry Job
                    </motion.button>
                  )}
                </motion.div>
              )}
            </motion.div>
          );
        })}

        <div className="h-8" />
      </div>
    </div>
  );
}
