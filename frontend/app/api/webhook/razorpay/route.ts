import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { PaymentAutomation } from '@/lib/services/automation/payments';

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    const a = Buffer.from(expectedSignature, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    const isValid = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!isValid) {
      console.error('[RAZORPAY_WEBHOOK]: Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const event = JSON.parse(body);
    await PaymentAutomation.handleRazorpayEvent(event);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[RAZORPAY_WEBHOOK_ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
