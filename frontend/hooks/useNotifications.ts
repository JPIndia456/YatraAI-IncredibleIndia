'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export type Notification = {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  booking_id?: string;
  read: boolean;
  read_at?: string;
  created_at: string;
  data?: Record<string, any>;
};

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch existing notifications on mount
  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }

    async function fetchNotifications() {
      try {
        const { data, error } = await supabase
          .from('yatra_notifications')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(30);

        if (!error && data) setNotifications(data as Notification[]);
        else if (error) console.warn('[Notifications] fetch:', error.message);
      } catch (e) {
        console.warn('[Notifications] fetch failed:', e);
      } finally {
        setLoading(false);
      }
    }

    void fetchNotifications();
  }, [user?.id]);

  // Subscribe to real-time new notifications via Supabase Realtime
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'yatra_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notif = payload.new as Notification;
          setNotifications((prev) => [notif, ...prev].slice(0, 30));

          // Show toast with action button
          const toastFn = notif.type === 'SUCCESS' ? toast.success
            : notif.type === 'ERROR' ? toast.error
            : notif.type === 'WARNING' ? toast.warning
            : toast.info;

          toastFn(notif.title, {
            description: notif.message,
            duration: 6000,
            action: notif.booking_id ? {
              label: '📋 View',
              onClick: () => window.location.href = `/bookings`,
            } : undefined,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'yatra_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Mark a single notification as read (via Supabase RPC)
  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, read: true } : n)
    );
    await supabase.rpc('mark_notification_read', { notification_id: id });
  }, []);

  // Mark ALL as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase
      .from('yatra_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('read', false);
  }, [user?.id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, isConnected, loading, markAsRead, markAllAsRead };
}
