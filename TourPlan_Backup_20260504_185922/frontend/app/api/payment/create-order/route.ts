import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createOrder } from '@/lib/services/payment/razorpayService';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(req: Request) {
  try {
    const { amount, currency, receipt } = await req.json();

    if (!amount || !receipt) {
      return NextResponse.json({ error: 'Missing amount or receipt' }, { status: 400 });
    }

    const bookingId = receipt.replace('rcpt_', '');
    if (!bookingId) {
      return NextResponse.json({ error: 'Invalid booking reference' }, { status: 400 });
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('tourplan_bookings')
      .select('id, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'pending_payment') {
      return NextResponse.json(
        { error: `Order creation not allowed from status '${booking.status}'` },
        { status: 409 }
      );
    }

    const order = await createOrder(amount, currency || 'INR', receipt);

    if (order.id) {
      await supabaseAdmin
        .from('tourplan_bookings')
        .update({ razorpay_order_id: order.id })
        .eq('id', bookingId)
        .eq('status', 'pending_payment');
    }

    return NextResponse.json(order);
  } catch (error: unknown) {
    console.error('Payment API Error:', error);
    return NextResponse.json({ error: errorMessage(error, 'Failed to create order') }, { status: 500 });
  }
}
