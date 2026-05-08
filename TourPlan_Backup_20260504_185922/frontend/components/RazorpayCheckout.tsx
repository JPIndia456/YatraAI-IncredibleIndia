'use client';

import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CreditCard, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface RazorpayCheckoutProps {
  bookingId: string;
  amount: number;
  description: string;
  onBeforeOpen?: (proceed: () => void) => void;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: any) => void;
  onDismiss?: () => void;
  className?: string;
}

export default function RazorpayCheckout({
  bookingId,
  amount,
  description,
  onBeforeOpen,
  onSuccess,
  onError,
  onDismiss,
  className = ""
}: RazorpayCheckoutProps) {
  const { user } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);

  const triggerRazorpay = async () => {
    try {
      setIsVerifying(true);
      const response = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, receipt: `rcpt_${bookingId}` }),
      });

      const order = await response.json();
      if (order.error) throw new Error(order.error);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "TourPlan",
        description: description,
        order_id: order.id,
        handler: async function (response: any) {
          const loadingToastId = toast.loading("Verifying AI Booking Status...");
          
          try {
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
              toast.success("Payment Verified! Your itinerary is now synced.", { id: loadingToastId });
              if (onSuccess) onSuccess(response.razorpay_payment_id);
            } else {
              toast.error("Cryptographic verification failed. Our team will verify manually.", { id: loadingToastId });
              if (onError) onError("Verification Failed");
            }
          } catch (err) {
            toast.error("Internal verification error. Please contact support.", { id: loadingToastId });
            if (onError) onError(err);
          } finally {
            setIsVerifying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsVerifying(false);
            if (onDismiss) onDismiss();
          }
        },
        prefill: {
          name: user?.user_metadata?.full_name || "Guest",
          email: user?.email || "traveler@yatraai.in",
          contact: user?.phone || "9999999999"
        },
        theme: {
          color: "#2563eb"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setIsVerifying(false);
      const errMsg = err.message || "Payment initialization failed";
      toast.error(errMsg);
      if (onError) onError(err);
    }
  };

  const handlePaymentClick = () => {
    if (onBeforeOpen) {
      onBeforeOpen(triggerRazorpay);
    } else {
      triggerRazorpay();
    }
  };

  return (
    <button
      onClick={handlePaymentClick}
      disabled={isVerifying}
      className={`flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-500/20 disabled:opacity-70 disabled:scale-100 ${className}`}
    >
      {isVerifying ? (
        <>
          <Loader2 className="w-6 h-6 animate-spin" />
          Verifying Price...
        </>
      ) : (
        <>
          <CreditCard className="w-6 h-6" />
          Pay & Confirm Booking
        </>
      )}
    </button>
  );
}
