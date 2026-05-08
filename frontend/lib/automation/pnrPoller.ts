'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

/**
 * Production PNR Automation Poller
 * Polls Supabase for any 'UPCOMING' railway bookings for the user
 * and fetches live PNR status via the MCP railway service.
 * This fires only when a real booking exists — no random demo alerts.
 */
export function usePnrAutomation(user: any) {
  useEffect(() => {
    if (!user?.id) return;

    const pollInterval = setInterval(async () => {
      try {
        // Fetch confirmed railway bookings that haven't been chart-prepared
        const { data: bookings } = await supabase
          .from('yatra_bookings')
          .select('id, pnr, trip_details')
          .eq('user_id', user.id)
          .eq('booking_type', 'TRAIN')
          .in('status', ['paid', 'confirmed'])
          .not('pnr', 'is', null)
          .limit(5);

        if (!bookings || bookings.length === 0) return;

        for (const booking of bookings) {
          if (!booking.pnr) continue;

          // Call our MCP PNR route
          const res = await fetch('/api/mcp/pnr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pnrNumber: booking.pnr }),
          });

          const result = await res.json();

          if (result.success && result.data) {
            const status = result.data.status;
            const prevStatus = booking.trip_details?.lastPnrStatus;

            // Only notify if status changed
            if (status && status !== prevStatus) {
              // Persist new status to booking
              await supabase
                .from('yatra_bookings')
                .update({
                  trip_details: { ...booking.trip_details, lastPnrStatus: status },
                  updated_at: new Date().toISOString(),
                })
                .eq('id', booking.id);

              // Show user-facing alert
              const isConfirmed = status.includes('CNF') || status.includes('CONFIRMED');
              if (isConfirmed) {
                toast.success('🎟️ Seat Confirmed!', {
                  description: `PNR ${booking.pnr} — Status: ${status}`,
                  duration: 8000,
                });
              } else {
                toast.info(`PNR Update: ${booking.pnr}`, {
                  description: `Status changed to ${status}`,
                  duration: 5000,
                });
              }
            }
          }
        }
      } catch (err) {
        // Silent fail — don't disrupt the UI for background polling errors
        console.warn('[PNR Poller] Error:', err);
      }
    }, 5 * 60 * 1000); // Poll every 5 minutes

    return () => clearInterval(pollInterval);
  }, [user?.id]);
}
