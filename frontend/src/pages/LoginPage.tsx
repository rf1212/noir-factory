import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';

export function LoginPage() {
  const navigate = useNavigate();
  const { user, initialize } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Sign in error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-noir-bg relative overflow-hidden flex flex-col items-center justify-center px-4">
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute top-20 right-10 w-72 h-72 bg-accent-primary rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none"
        animate={{
          x: [0, 100, 0],
          y: [0, -100, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute -bottom-8 -left-8 w-72 h-72 bg-accent-danger rounded-full mix-blend-multiply filter blur-3xl opacity-10 pointer-events-none"
        animate={{
          x: [0, -100, 0],
          y: [0, 100, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Logo Section */}
        <motion.div
          className="flex flex-col items-center gap-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo circle */}
          <motion.div
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-danger flex items-center justify-center shadow-2xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-4xl font-black text-noir-bg">✦</span>
          </motion.div>

          {/* Branding */}
          <div className="text-center">
            <h1 className="text-5xl font-black tracking-tight text-text-primary mb-2">
              NOIR FACTORY
            </h1>
            <p className="text-lg font-semibold tracking-wide text-accent-primary uppercase">
              Content Production Engine
            </p>
          </div>

          <p className="text-sm text-text-secondary text-center max-w-xs">
            Automate your social media content with AI-powered creation and distribution
          </p>
        </motion.div>

        {/* Sign In Button */}
        <motion.button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full h-14 rounded-xl bg-white text-noir-bg font-semibold text-base flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? (
            <motion.div
              className="w-5 h-5 border-2 border-noir-bg border-t-accent-primary rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 c0-3.331,2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.461,2.268,15.365,1.456,12.545,1.456 c-6.321,0-11.444,5.124-11.444,11.444c0,6.32,5.124,11.444,11.444,11.444c6.587,0,11.444-5.144,11.444-11.444 c0-0.755-0.088-1.5-0.258-2.221H12.545z"
                />
              </svg>
              Sign in with Google
            </>
          )}
        </motion.button>

        {/* Footer */}
        <motion.p
          className="text-center text-xs text-text-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          Secure authentication powered by Supabase
        </motion.p>
      </div>
    </div>
  );
}
