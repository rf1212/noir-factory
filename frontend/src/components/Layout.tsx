import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { CompanySwitcher } from './CompanySwitcher';
import { useAuthStore } from '../store/authStore';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Layout() {
  const { user, logout } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="min-h-screen bg-noir-bg flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-noir-surface/80 backdrop-blur-md border-b border-noir-border safe-area-top">
        <div className="px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-primary to-accent-danger flex items-center justify-center font-black text-noir-bg">
              ✦
            </div>
            <span className="font-black text-lg tracking-tight text-text-primary">NOIR</span>
          </div>

          {/* Company Switcher */}
          <CompanySwitcher />

          {/* User Menu */}
          <div className="relative ml-4">
            <motion.button
              onClick={() => setShowMenu(!showMenu)}
              className="w-11 h-11 rounded-full bg-noir-surface border border-noir-border flex items-center justify-center hover:border-accent-primary transition-all duration-200 min-h-[44px] min-w-[44px]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name || 'User'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 bg-accent-primary rounded-full flex items-center justify-center text-xs font-bold text-noir-bg">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </motion.button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-3 w-56 bg-noir-surface border border-noir-border rounded-2xl shadow-2xl overflow-hidden"
                >
                  <div className="px-4 py-4 border-b border-noir-border">
                    <p className="text-sm font-semibold text-text-primary">{user?.name || user?.email}</p>
                    <p className="text-xs text-text-muted mt-1">{user?.email}</p>
                  </div>
                  <button
                    onClick={async () => {
                      await logout();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 text-accent-danger hover:bg-noir-surface-hover transition-colors flex items-center gap-3 min-h-[44px] font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-24 max-w-full">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
