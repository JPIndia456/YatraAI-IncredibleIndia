'use client';

import { useAIBrainStore } from '@/lib/store';

export default function LayoutTransitions({ children }: { children: React.ReactNode }) {
  const { isPrimarySidebarOpen } = useAIBrainStore();

  return (
    <main className={`min-h-screen pt-4 pb-40 relative z-10 transition-all duration-500 ease-in-out px-4 sm:px-6 ${isPrimarySidebarOpen ? 'lg:mr-[400px]' : ''}`}>
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </main>
  );
}
