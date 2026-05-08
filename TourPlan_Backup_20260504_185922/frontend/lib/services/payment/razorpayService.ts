import Razorpay from 'razorpay';

function isUnsetOrPlaceholder(value: string | undefined): boolean {
  if (value === undefined || value === null) return true;
  const v = String(value).trim();
  if (!v) return true;
  if (v === 'YOUR_RAZORPAY_KEY') return true;
  return /REPLACE/i.test(v);
}

/**
 * Server-side client: prefers RAZORPAY_KEY_ID, falls back to NEXT_PUBLIC_RAZORPAY_KEY_ID
 * so order creation works when only the publishable key line was duplicated.
 */
export function getRazorpayClient() {
  const key_id =
    process.env.RAZORPAY_KEY_ID?.trim() ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (isUnsetOrPlaceholder(key_id) || isUnsetOrPlaceholder(key_secret)) {
    return null;
  }

  return new Razorpay({
    key_id: key_id!,
    key_secret: key_secret!,
  });
}

export async function createOrder(amount: number, currency: string = 'INR', receipt: string) {
  const instance = getRazorpayClient();
  if (!instance) {
    throw new Error('Razorpay is not configured');
  }

  const options = {
    amount: amount * 100, // amount in the smallest currency unit (paise)
    currency: currency,
    receipt: receipt,
  };

  try {
    const order = await instance.orders.create(options);
    return order;
  } catch (error: any) {
    console.error('Razorpay Order Creation Error:', error);
    throw new Error(error.message);
  }
}

export function verifyPayment(order_id: string, payment_id: string, signature: string) {
  const crypto = require('crypto');
  const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!key_secret || isUnsetOrPlaceholder(key_secret)) return false;

  const hmac = crypto.createHmac('sha256', key_secret);
  hmac.update(order_id + "|" + payment_id);
  const generated_signature = hmac.digest('hex');

  return generated_signature === signature;
}
