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
  t: (key: string, options?: any) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  isRTL: false,
  isInitialized: false,
  t: (key, options?) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { t, i18n: i18nInstance } = useTranslation();
  const [language, setLangState] = useState<LanguageCode>('en');
  const [isInitialized, setIsInitialized] = useState(false);

  const isRTL = SUPPORTED_LANGUAGES.find(l => l.code === language)?.rtl || false;

  useEffect(() => {
    const initLang = async () => {
      try {
        const savedLang = localStorage.getItem('user-language');
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) {
          console.warn('[Language] getUser:', authErr.message);
        }
        const user = authData?.user ?? null;
        const metaLang = user?.user_metadata?.language;
        const finalLang = metaLang || savedLang || i18nInstance.language || 'en';
        await handleLanguageChange(finalLang);
      } catch (e) {
        console.warn('[Language] init failed:', e);
        try {
          await handleLanguageChange(i18nInstance.language || 'en');
        } catch {
          /* keep default UI language */
        }
      } finally {
        setIsInitialized(true);
      }
    };

    void initLang();
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

    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) {
        console.warn('[Language] getUser:', authErr.message);
        return;
      }
      const user = authData?.user ?? null;
      if (user) {
        await Promise.all([
          supabase.auth.updateUser({
            data: { language: lang },
          }),
          supabase
            .from('yatra_profiles')
            .update({ preferred_language: lang, updated_at: new Date().toISOString() })
            .eq('user_id', user.id),
        ]);
      }
    } catch (e) {
      console.warn('[Language] Supabase sync failed:', e);
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
