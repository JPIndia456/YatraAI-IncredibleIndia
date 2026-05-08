import { NextResponse } from 'next/server';
import { getServerClient, extractJwt } from '@/lib/supabaseAdmin';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/**
 * POST /api/booking/create
 * Creates a new booking record in tourplan_bookings and fires a notification.
 */
export async function POST(req: Request) {
  try {
    const { from, to, date, details } = await req.json();

    if (!from || !to) {
      return NextResponse.json({ success: false, error: 'Missing required fields: from, to.' }, { status: 400 });
    }

    const jwt = extractJwt(req.headers.get('Authorization'));
    if (!jwt) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const db = getServerClient(jwt);
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(jwt);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Create booking record with correct schema columns
    const { data: booking, error } = await db
      .from('tourplan_bookings')
      .insert({
        user_id: user.id,
        booking_type: details?.type || 'TRAIN',
        status: 'pending_payment',
        total_amount: details?.total || 0,
        pnr: details?.pnr || null,
        is_tatkal: details?.isTatkal || false,
        trip_data: {
          from,
          to,
          date,
          bookingRef: details?.bookingRef,
          ...details,
        },
      })
      .select('id')
      .single();

    if (error) throw error;

    // 2. Notification
    await db.from('tourplan_notifications').insert({
      user_id: user.id,
      title: '🔒 Booking Initialized',
      message: `Your trip from ${from} → ${to} (Ref: ${details?.bookingRef || booking.id.slice(0,8)}) is pending payment.`,
      type: 'BOOKING_ALERT',
      read: false,
    });

    return NextResponse.json({ success: true, bookingId: booking.id });

  } catch (error: unknown) {
    console.error('[BOOKING_CREATE]:', error);
    return NextResponse.json({ success: false, error: errorMessage(error, 'Failed to create booking') }, { status: 500 });
  }
}
