import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', rtl: false },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', rtl: false },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', rtl: false },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', rtl: false },
  { code: 'mr', name: 'Marathi', native: 'मराठी', rtl: false },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', rtl: false },
  { code: 'ur', name: 'Urdu', native: 'اردو', rtl: true },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', rtl: false },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', rtl: false },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', rtl: false },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', rtl: false },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', rtl: false },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া', rtl: false },
  { code: 'ma', name: 'Maithili', native: 'मैथिली', rtl: false },
  { code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्', rtl: false },
  { code: 'ks', name: 'Kashmiri', native: 'کٲشُر', rtl: true },
  { code: 'sd', name: 'Sindhi', native: 'سنڌي', rtl: true },
  { code: 'ne', name: 'Nepali', native: 'नेपाली', rtl: false },
  { code: 'kok', name: 'Konkani', native: 'कोंकणी', rtl: false },
  { code: 'doi', name: 'Dogri', native: 'डोगरी', rtl: false },
  { code: 'mni', name: 'Manipuri', native: 'ꯃꯩꯇꯩꯂꯣꯟ', rtl: false },
  { code: 'brx', name: 'Bodo', native: 'बर’', rtl: false },
  { code: 'sat', name: 'Santali', native: 'ᱥᱟᱱᱛᅡᱲᱤ', rtl: false }
];

import enCommon from '../public/locales/en/common.json';
import hiCommon from '../public/locales/hi/common.json';
import mrCommon from '../public/locales/mr/common.json';
import guCommon from '../public/locales/gu/common.json';
import knCommon from '../public/locales/kn/common.json';
import bnCommon from '../public/locales/bn/common.json';
import teCommon from '../public/locales/te/common.json';
import mlCommon from '../public/locales/ml/common.json';
import taCommon from '../public/locales/ta/common.json';

i18n
  .use(resourcesToBackend((language: string, namespace: string) => {
    if (language === 'en' && namespace === 'common') return Promise.resolve(enCommon);
    if (language === 'hi' && namespace === 'common') return Promise.resolve(hiCommon);
    if (language === 'mr' && namespace === 'common') return Promise.resolve(mrCommon);
    if (language === 'gu' && namespace === 'common') return Promise.resolve(guCommon);
    if (language === 'kn' && namespace === 'common') return Promise.resolve(knCommon);
    if (language === 'bn' && namespace === 'common') return Promise.resolve(bnCommon);
    if (language === 'te' && namespace === 'common') return Promise.resolve(teCommon);
    if (language === 'ml' && namespace === 'common') return Promise.resolve(mlCommon);
    if (language === 'ta' && namespace === 'common') return Promise.resolve(taCommon);
    return import(`../public/locales/${language}/${namespace}.json`);
  }))
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      hi: { common: hiCommon },
      mr: { common: mrCommon },
      gu: { common: guCommon },
      kn: { common: knCommon },
      bn: { common: bnCommon },
      te: { common: teCommon },
      ml: { common: mlCommon },
      ta: { common: taCommon }
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map(l => l.code),
    ns: ['common'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;
