'use client';

import Script from 'next/script';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentButtonProps {
  bookingId: string;
  amount: number;
  label?: string;
  gradient?: string;
  isTatkal?: boolean;
  onSuccess?: () => void;
}

export default function PaymentButton({
  bookingId,
  amount,
  label = 'Pay with UPI',
  gradient = 'from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
  isTatkal = false,
  onSuccess,
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const initiatePayment = async () => {
    if (loading) return;
    setLoading(true);

    try {
      // 1. Create Razorpay Order
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, receipt: `rcpt_${bookingId}` }),
      });

      const orderData = await res.json();
      if (orderData.error) throw new Error(orderData.error);

      // 2. Open Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "TourPlan",
        description: `Booking #${bookingId}`,
        order_id: orderData.id,
        handler: async function (response: any) {
          toast.loading("Verifying Payment Hash...");
          
          const verifyRes = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              bookingId,
              userId: user?.id
            })
          });

          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            toast.success("Payment Received!");
            onSuccess?.();
          } else {
            toast.error("Verification failed. Contact support.");
          }
          setLoading(false);
        },
        prefill: {
          name: user?.user_metadata?.full_name || "Guest",
          email: user?.email || "traveler@yatraai.in"
        },
        theme: { color: "#2563eb" },
        modal: {
          ondismiss: () => setLoading(false)
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      toast.error(error.message || 'Payment failed to initialize.');
      setLoading(false);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={initiatePayment}
        disabled={loading}
        className={`bg-gradient-to-r ${gradient} text-white font-black uppercase tracking-wider
                   px-10 py-5 rounded-[2rem] shadow-[0_15px_30px_-5px_rgba(37,99,235,0.3)] 
                   flex justify-center items-center gap-3 text-sm 
                   transition-all duration-300 min-w-[240px] border border-white/10`}
      >
        {loading ? <span className="animate-pulse">Processing...</span> : (
          <>
            <img src="/razorpay-icon.svg" className="w-5 h-5 opacity-80" alt="" />
            {label}
          </>
        )}
      </motion.button>
    </>
  );
}
