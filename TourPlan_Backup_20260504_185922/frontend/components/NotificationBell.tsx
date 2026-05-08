'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, X, Wifi, WifiOff, Zap } from 'lucide-react';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { useState } from 'react';

const typeStyles: Record<string, { bg: string; border: string; dot: string; icon: string }> = {
  SUCCESS: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400', icon: '✅' },
  ERROR:   { bg: 'bg-red-500/10',     border: 'border-red-500/20',     dot: 'bg-red-400',     icon: '❌' },
  WARNING: { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   dot: 'bg-amber-400',   icon: '⚠️' },
  INFO:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    dot: 'bg-blue-400',    icon: '💬' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, isConnected, loading, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(!open)}
        className="relative p-3 rounded-2xl hover:bg-zinc-900 cursor-pointer border border-transparent hover:border-zinc-800 transition-all"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-blue-400' : 'text-zinc-500'}`} />
        {/* Unread badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-black min-w-[20px] h-5 rounded-full flex items-center justify-center border-2 border-zinc-950 px-1"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.div>
          )}
        </AnimatePresence>
        {/* Realtime ping dot */}
        {isConnected && (
          <span className="absolute bottom-2 right-2 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        )}
      </motion.button>

      {/* Notification Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute right-0 top-14 w-96 max-w-[95vw] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-400" />
                <span className="font-black text-sm">Notifications</span>
                {isConnected ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                    <Wifi className="w-3 h-3" /> Live
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                    <WifiOff className="w-3 h-3" /> Offline
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" /> Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
              {loading ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-zinc-600">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-14 text-center space-y-3">
                  <div className="text-4xl">🔔</div>
                  <p className="text-sm font-bold text-zinc-400">All caught up!</p>
                  <p className="text-xs text-zinc-600">PNR updates and trip alerts will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-900">
                  {notifications.map((n) => {
                    const style = typeStyles[n.type] || typeStyles.INFO;
                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => !n.read && markAsRead(n.id)}
                        className={`px-5 py-4 cursor-pointer hover:bg-zinc-900/50 transition-all ${
                          !n.read ? 'bg-zinc-900/30' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${style.bg} border ${style.border}`}>
                            {style.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-black text-zinc-200 truncate">{n.title}</span>
                              {!n.read && <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />}
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{n.message}</p>
                            <p className="text-[10px] text-zinc-700 mt-1">{timeAgo(n.created_at)}</p>
                          </div>
                          {!n.read && (
                            <button
                              onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                              className="shrink-0 p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-zinc-400"
                              aria-label="Mark as read"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-5 py-3 border-t border-zinc-900 flex items-center justify-between">
                <span className="text-[10px] text-zinc-700 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Powered by Supabase Realtime
                </span>
                <span className="text-[10px] text-zinc-600">{notifications.length} total</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
