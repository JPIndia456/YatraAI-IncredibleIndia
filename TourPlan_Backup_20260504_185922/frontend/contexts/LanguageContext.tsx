'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import i18n, { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase/client';

export type LanguageCode = string;

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  isRTL: boolean;
  isInitialized: boolean;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  isRTL: false,
  isInitialized: false,
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { t, i18n: i18nInstance } = useTranslation();
  const [language, setLangState] = useState<LanguageCode>('en');
  const [isInitialized, setIsInitialized] = useState(false);

  const isRTL = SUPPORTED_LANGUAGES.find(l => l.code === language)?.rtl || false;

  useEffect(() => {
    const initLang = async () => {
      // 1. Check local storage
      const savedLang = localStorage.getItem('user-language');
      
      // 2. Check Supabase metadata if logged in
      const { data: { user } } = await supabase.auth.getUser();
      const metaLang = user?.user_metadata?.language;

      const finalLang = metaLang || savedLang || i18nInstance.language || 'en';
      
      await handleLanguageChange(finalLang);
      setIsInitialized(true);
    };

    initLang();
  }, []);

  const handleLanguageChange = async (lang: LanguageCode) => {
    await i18nInstance.changeLanguage(lang);
    setLangState(lang);
    localStorage.setItem('user-language', lang);
    document.documentElement.dir = SUPPORTED_LANGUAGES.find(l => l.code === lang)?.rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;

    // Apply per-language font class to <html> so the correct Indian script font loads
    const htmlEl = document.documentElement;
    // Remove any existing lang-* class
    htmlEl.className = htmlEl.className.replace(/\blang-\S+/g, '').trim();
    htmlEl.classList.add(`lang-${lang}`);

    // Update Supabase metadata if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.auth.updateUser({
        data: { language: lang }
      });
    }
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage: handleLanguageChange, 
      isRTL,
      isInitialized,
      t 
    }}>
      <div dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'font-urdu' : ''}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
export { SUPPORTED_LANGUAGES };
