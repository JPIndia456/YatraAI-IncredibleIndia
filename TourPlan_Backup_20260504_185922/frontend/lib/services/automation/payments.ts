import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Payment Webhook Service
 * Handles life-cycle events from Razorpay and other providers
 */
export const PaymentAutomation = {
  /**
   * Primary Razorpay Event Router
   */
  async handleRazorpayEvent(event: any) {
    console.log(`[PAYMENT_SERVICE]: Processing ${event.event}`);

    switch (event.event) {
      case 'payment.captured':
        return this.handlePaymentCaptured(event.payload.payment.entity);
      case 'order.paid':
        // Optional: extra layer of confirmation
        break;
      default:
        console.log(`[PAYMENT_SERVICE]: Unhandled event ${event.event}`);
    }
  },

  /**
   * Process Successful Payment
   */
  async handlePaymentCaptured(payment: any) {
    const orderId = payment.order_id;
    
    // 1. Resolve Booking
    const { data: booking } = await supabaseAdmin
      .from('tourplan_bookings')
      .select('*')
      .eq('razorpay_order_id', orderId)
      .single();

    if (!booking) return;
    if (booking.status === 'paid' || booking.status === 'confirmed') return;
    if (booking.status !== 'pending_payment') {
      console.warn(`[PAYMENT_SERVICE]: Ignoring capture for booking ${booking.id} in status ${booking.status}`);
      return;
    }

    // 2. Perform Promotion
    const { error: updateError } = await supabaseAdmin.from('tourplan_bookings').update({
      status: 'paid',
      razorpay_payment_id: payment.id,
      confirmed_at: new Date().toISOString()
    }).eq('id', booking.id);

    if (updateError) throw updateError;

    // 3. Automate Notification
    await supabaseAdmin.from('tourplan_notifications').insert([{
      user_id: booking.user_id,
      title: '💳 Payment Received!',
      message: `Payment verified for booking #${booking.id}. Ticket confirmation will follow shortly.`,
      type: 'PAYMENT_ALERT'
    }]);

    console.log(`[PAYMENT_SERVICE]: Booking ${booking.id} promoted successfully.`);
  }
};
