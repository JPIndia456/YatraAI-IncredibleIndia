'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AppError]', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 bg-[#FDFDFB] text-[#000080]">
      <p className="text-sm font-medium text-[#000080]/60 tracking-wide uppercase mb-2">
        Something went wrong
      </p>
      <h1 className="text-2xl sm:text-3xl font-semibold text-center mb-4 max-w-md">
        We hit a snag loading this page
      </h1>
      <p className="text-center text-[#000080]/75 max-w-md mb-8 text-sm sm:text-base">
        Your trip data is safe. Try again, or go back home and continue planning.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-full bg-[#FF9933] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#e88a2e] transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-[#000080]/20 px-6 py-2.5 text-sm font-semibold text-[#000080] hover:bg-[#000080]/5 transition-colors"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
