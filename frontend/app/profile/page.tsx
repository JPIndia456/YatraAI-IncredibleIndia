'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTripPlannerStore } from '@/lib/store';

export default function ProfileRedirect() {
  const router = useRouter();
  const setIsProfileOpen = useTripPlannerStore(state => state.setIsProfileOpen);

  useEffect(() => {
    setIsProfileOpen(true);
    router.replace('/planner?profile=true');
  }, [router, setIsProfileOpen]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
       <div className="w-8 h-8 border-4 border-orange-100 border-t-saffron rounded-full animate-spin" />
    </div>
  );
}
