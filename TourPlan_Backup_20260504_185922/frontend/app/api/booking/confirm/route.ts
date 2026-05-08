import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { canTransitionBookingStatus } from '@/lib/booking/statusTransitions';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function hasProviderAccess(req: Request) {
  const providerSecret = process.env.PROVIDER_CONFIRM_SECRET;
  if (!providerSecret) return false;
  const incoming = req.headers.get('x-provider-secret');
  return incoming === providerSecret;
}

export async function POST(req: Request) {
  try {
    if (!hasProviderAccess(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized provider callback.' }, { status: 401 });
    }

    const { bookingId, providerRef } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ success: false, error: 'Missing bookingId.' }, { status: 400 });
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('tourplan_bookings')
      .select('id, user_id, status, trip_data')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ success: false, error: 'Booking not found.' }, { status: 404 });
    }

    if (booking.status === 'confirmed') {
      return NextResponse.json({ success: true, message: 'Booking already confirmed.' });
    }

    if (!canTransitionBookingStatus(booking.status, 'confirmed')) {
      return NextResponse.json(
        { success: false, error: `Invalid status transition from '${booking.status}' to 'confirmed'.` },
        { status: 409 }
      );
    }

    const nextTripData = {
      ...(booking.trip_data || {}),
      providerRef: providerRef || booking.trip_data?.providerRef || null,
    };

    const { error: updateError } = await supabaseAdmin
      .from('tourplan_bookings')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        trip_data: nextTripData,
      })
      .eq('id', bookingId)
      .in('status', ['paid', 'pending_provider']);

    if (updateError) throw updateError;

    await supabaseAdmin.from('tourplan_notifications').insert([
      {
        user_id: booking.user_id,
        title: '🎟️ Booking Confirmed!',
        message: `Your booking #${bookingId} has been confirmed by the provider.`,
        type: 'BOOKING_ALERT',
      },
    ]);

    return NextResponse.json({ success: true, message: 'Booking confirmed successfully.' });
  } catch (error: unknown) {
    console.error('[BOOKING_CONFIRM_ERROR]:', error);
    return NextResponse.json({ success: false, error: errorMessage(error, 'Failed to confirm booking') }, { status: 500 });
  }
}
