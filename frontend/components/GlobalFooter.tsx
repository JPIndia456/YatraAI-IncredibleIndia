'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Sparkles } from 'lucide-react';

import { useState, useEffect } from 'react';

export default function GlobalFooter() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper to prevent hydration mismatch: return English on server, localized on client
  const T = (key: string, fallback: string) => (mounted ? t(key) : fallback);

  return (
    <footer className="border-t border-orange-100 bg-white py-14 relative z-10">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10 text-sm text-slate-500">
        <div className="space-y-4">
          <div className="text-[#1A1A2E] font-black text-lg tracking-tight flex items-center gap-2 italic">
            YA<span className="text-saffron">TRA</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-400 font-medium">
            {T('footer_tagline', "Redefining global travel with AI precision and a storyteller's heart.")}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {['DPDP Act 2023', 'IT Act 2000', 'PCI DSS'].map(b => (
              <span key={b} className="text-[11px] font-bold px-2 py-0.5 bg-orange-50 border border-orange-100 rounded-full text-saffron uppercase tracking-tighter">{b}</span>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-[#1A1A2E] font-black mb-4 text-xs tracking-[0.2em] uppercase italic">{T('footer_ecosystem', 'Ecosystem')}</h4>
          <ul className="space-y-2.5 text-xs font-bold uppercase tracking-tight">
            <li className="hover:text-saffron cursor-pointer transition-colors">{T('footer_global_discovery', 'Global Discovery')}</li>
            <li className="hover:text-saffron cursor-pointer transition-colors">{T('footer_corporate_access', 'Corporate Access')}</li>
            <li className="hover:text-saffron cursor-pointer transition-colors">{T('footer_api_framework', 'API Framework')}</li>
          </ul>
        </div>
        <div>
          <h4 className="text-[#1A1A2E] font-black mb-4 text-xs tracking-[0.2em] uppercase italic">{T('footer_intelligence', 'Intelligence')}</h4>
          <ul className="space-y-2.5 text-xs font-bold uppercase tracking-tight">
            <li className="hover:text-saffron cursor-pointer transition-colors">{T('footer_safety_engine', 'Safety Engine')}</li>
            <li className="hover:text-saffron cursor-pointer transition-colors">{T('footer_ground_logistics', 'Ground Logistics')}</li>
            <li className="hover:text-saffron cursor-pointer transition-colors">{T('footer_help_center', 'Help Center')} ↗</li>
          </ul>
        </div>
        <div>
          <h4 className="text-[#1A1A2E] font-black mb-4 text-xs tracking-[0.2em] uppercase italic">{T('legal', 'Legal')}</h4>
          <ul className="space-y-2.5 text-xs font-bold uppercase tracking-tight">
            <li><a href="/legal?tab=privacy" className="hover:text-saffron transition-colors">{T('privacy_policy', 'Privacy Policy')}</a></li>
            <li><a href="/legal?tab=terms" className="hover:text-saffron transition-colors">{T('terms_of_service', 'Terms of Service')}</a></li>
            <li><a href="/legal?tab=disclaimer" className="hover:text-saffron transition-colors">{T('compliance', 'Compliance')}</a></li>
          </ul>
        </div>
      </div>
      <div className="mt-10 pt-8 border-t border-orange-50 max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
          {T('footer_copyright', '© 2026 Yatra Intelligence Platform')}
        </p>
        <p className="text-slate-300 text-[9px] font-bold text-center leading-relaxed max-w-md uppercase tracking-tight italic">
          {T('footer_intermediary_note', 'Yatra is an intermediary platform.')}
        </p>
      </div>
    </footer>
  );
}
