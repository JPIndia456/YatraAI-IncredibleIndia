'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

type PnrUpdate = {
  pnr: string;
  status: string;
  coach?: string;
  berth?: string;
  chart_prepared?: boolean;
  message?: string;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  booking_id?: string;
  created_at: string;
};

export function useYatraRealtime(userId: string, currentBookingId?: string) {
  const [pnrUpdates, setPnrUpdates] = useState<Record<string, PnrUpdate>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const channelName = currentBookingId 
      ? `yatra:booking-${currentBookingId}` 
      : `yatra:user-${userId}`;

    const channel = supabase.channel(channelName, {
      config: { presence: { key: userId } },
    });

    // 1. Live PNR Updates
    if (currentBookingId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tourplan_pnr_status_logs',
          filter: `booking_id=eq.${currentBookingId}`,
        },
        (payload) => {
          const update = payload.new as PnrUpdate;
          setPnrUpdates(prev => ({ ...prev, [currentBookingId]: update }));

          if (update.status === 'CONFIRMED' || update.chart_prepared) {
            toast.success(update.message || 'PNR Updated', {
              description: `${update.pnr} • ${update.status}`,
            });
          }
        }
      );
    }

    // 2. Real-time Notifications
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'tourplan_notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const notif = payload.new as Notification;
        setNotifications(prev => [notif, ...prev].slice(0, 20));

        toast(notif.title, {
          description: notif.message,
          action: notif.booking_id ? {
            label: 'View',
            onClick: () => window.location.href = `/booking/${notif.booking_id}`,
          } : undefined,
        });
      }
    );

    // 3. Presence (Family viewing this trip)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users = Object.values(state).flat();
      setOnlineUsers(users);
    });

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED');
    });

    // Track presence if viewing a booking
    if (currentBookingId) {
      channel.track({
        user_id: userId,
        viewing: currentBookingId,
        last_seen: new Date().toISOString(),
      });
    }

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [userId, currentBookingId]);

  return {
    pnrUpdates,
    notifications,
    onlineUsers,
    isConnected,
    totalViewing: onlineUsers.length,
  };
}
