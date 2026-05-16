'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useRealtimePnr(bookingId: string) {
  const [pnrStatus, setPnrStatus] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel(`pnr-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'yatra_pnr_status_logs',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => setPnrStatus(payload.new)
      )
      .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));

    return () => { supabase.removeChannel(channel); };
  }, [bookingId]);

  return { pnrStatus, isConnected };
}
