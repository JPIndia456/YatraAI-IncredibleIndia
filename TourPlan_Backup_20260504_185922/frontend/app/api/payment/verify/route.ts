import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';
import { canTransitionBookingStatus } from '@/lib/booking/statusTransitions';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Razorpay Checkout Verification Engine
 * Logic: Validates payment signatures and promotes pending bookings to 'PAID' or 'UPCOMING'.
 */
export async function POST(req: Request) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, bookingId } = await req.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !bookingId) {
      return NextResponse.json({ success: false, error: 'Signature mismatch or missing payment telemetry.' }, { status: 400 });
    }

    // 1. Strict Secret Check
    const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!secret || /REPLACE/i.test(secret)) {
        console.error('CRITICAL SECURITY ALERT: Razorpay Secret is missing or placeholder.');
        return NextResponse.json({ success: false, error: 'Payment gateway configuration error.' }, { status: 500 });
    }

    // 2. HMAC Cryptographic Validation
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('tourplan_bookings')
      .select('id, user_id, status, razorpay_order_id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ success: false, error: 'Booking not found.' }, { status: 404 });
    }

    if (booking.status === 'paid' || booking.status === 'confirmed') {
      return NextResponse.json({ success: true, message: 'Payment already verified.' });
    }

    if (!canTransitionBookingStatus(booking.status, 'paid')) {
      return NextResponse.json(
        { success: false, error: `Invalid status transition from '${booking.status}'.` },
        { status: 409 }
      );
    }

    if (!booking.razorpay_order_id || booking.razorpay_order_id !== razorpay_order_id) {
      return NextResponse.json({ success: false, error: 'Order mismatch for booking.' }, { status: 400 });
    }

    if (isAuthentic) {
      // 3. Promote Booking only from pending_payment -> paid
      const { error: updateError } = await supabaseAdmin
        .from('tourplan_bookings')
        .update({
          status: 'paid',
          razorpay_payment_id: razorpay_payment_id,
          confirmed_at: null
        })
        .eq('id', bookingId)
        .eq('status', 'pending_payment');

      if (updateError) {
        throw updateError;
      }

      // 4. Automated Notification: Payment Success
      await supabaseAdmin.from('tourplan_notifications').insert([
        {
          user_id: booking.user_id,
          title: '💳 Payment Received!',
          message: `Payment successful for booking #${bookingId}. Ticket confirmation is in progress.`,
          type: 'PAYMENT_ALERT'
        }
      ]);

      return NextResponse.json({ success: true, message: 'Payment verified and booking promoted.' });
    } else {
      return NextResponse.json({ success: false, error: 'Cryptographic signature mismatch.' }, { status: 403 });
    }

  } catch (error: unknown) {
    console.error('[PAYMENT_VERIFY_ERROR]:', error);
    return NextResponse.json({ success: false, error: errorMessage(error, 'Payment verification failed') }, { status: 500 });
  }
}
