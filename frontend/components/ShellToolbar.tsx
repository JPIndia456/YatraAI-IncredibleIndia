'use client';

import ChakraLogo from '@/components/ChakraLogo';
import { ClipboardList, User, Menu, X, Map, PlaneTakeoff, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useTripStore } from '@/lib/store';

import { Layout, Globe, ChevronDown } from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
export default function ShellToolbar() {
  const { t, language, setLanguage } = useLanguage();
  const { destination: storeDestination } = useTripStore();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return (
    <div className="h-16 bg-zinc-950/50 backdrop-blur-xl border-b border-zinc-900" />
  );

  if (pathname === '/') return null;

  const location = storeDestination && storeDestination.length > 2 ? storeDestination : 'India';

  const userName = user?.user_metadata?.full_name 
    || (user?.email ? user.email.split('@')[0] : null) 
    || (user?.phone ? `Traveler (${user.phone.slice(-4)})` : null) 
    || 'Traveler';
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = !avatarUrl ? userName.split(/[\s@_.-]+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() : '';

  const navLinks = [
    { label: t('profile'), icon: User, href: '/profile', color: 'from-green to-emerald-900' },
    { label: t('planner_label'), icon: Map, href: '/planner', color: 'from-saffron to-yellow-500' },
    { label: t('my_trips'), icon: ClipboardList, href: '/my-trip', color: 'from-saffron to-yellow-600' },
  ];

  const showMobileBottomDock = pathname !== '/' && !pathname.startsWith('/planner');

  return (
    <>
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 bg-[#FDFDFB]/80 backdrop-blur-md border-b border-zinc-100 no-print"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">

        <div
          onClick={() => router.push('/')}
          className="flex items-center gap-4 cursor-pointer group shrink-0"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-saffron blur-xl opacity-10 group-hover:opacity-30 transition-opacity" />
            <div className="w-11 h-11 bg-gradient-to-br from-saffron to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg shadow-saffron/20 relative z-10">
               <PlaneTakeoff className="text-white w-6 h-6" />
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="text-xl font-semibold tracking-tight text-zinc-900 group-hover:text-saffron transition-colors leading-none">
              YA<span className="text-saffron font-bold">TRA 🇮🇳</span>
            </div>
            <div className="text-[10px] text-saffron opacity-70 group-hover:opacity-100 transition-opacity mt-1 uppercase tracking-wide font-medium">
              Intelligence • Odyssey
            </div>
          </div>
        </div>

        {/* Desktop Nav Links */}
        {pathname !== '/' && (
          <nav className="hidden md:flex items-center gap-2">
          {navLinks.map(({ label, icon: Icon, href, color }) => {
             const isActive = pathname === href || (href !== '/planner' && pathname.startsWith(href));
             return (
               <button
                 key={href}
                 onClick={() => router.push(href)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all relative group overflow-hidden ${
                    isActive ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
               >
                 {/* Active background pill */}
                 {isActive && (
                   <motion.div
                     layoutId="nav-pill"
                     className={`absolute inset-0 bg-gradient-to-tr ${color} opacity-10 blur-sm -z-10`}
                   />
                 )}
                 <div className={`absolute inset-0 bg-zinc-100 -z-20 ${isActive ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity rounded-2xl`} />
                 
                 <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-zinc-900' : 'text-zinc-500'}`} />
                 {label}
               </button>
             );
          })}
          </nav>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Language Selector */}
          <div className="relative group/lang flex items-center">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer">
              <Globe className="w-4 h-4 text-saffron" />
              <span className="text-xs font-bold uppercase tracking-wide hidden sm:block">{language?.toUpperCase() || 'EN'}</span>
            </button>
            <div className="absolute top-full right-0 mt-2 w-48 max-h-80 overflow-y-auto overflow-x-hidden bg-white border border-zinc-200 rounded-xl shadow-xl opacity-0 invisible group-hover/lang:opacity-100 group-hover/lang:visible transition-all flex flex-col z-50">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`flex items-center justify-between w-full text-left px-4 py-2 text-xs font-semibold hover:bg-zinc-50 transition-colors ${
                    language === lang.code ? 'bg-saffron/10 text-saffron' : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  <span>{lang.name}</span>
                  <span className="text-zinc-400 font-medium text-[10px] ml-2">{lang.native}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Avatar / User — desktop */}
          <div
            onClick={() => {
              if (user) {
                router.push('/profile');
              } else if (pathname === '/') {
                document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' });
              } else {
                router.push('/');
              }
            }}
            className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-zinc-200 cursor-pointer group"
          >
            {authLoading ? (
              <div className="w-9 h-9 bg-zinc-100 rounded-2xl animate-pulse" />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-saffron to-yellow-500 rounded-2xl flex items-center justify-center text-xs font-bold text-white group-hover:scale-110 transition-transform overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  initials || '?'
                )}
              </div>
            )}
            <div className="hidden lg:block">
              <div className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wide">
                {user ? t('account') : t('sign_in')}
              </div>
              <div className="text-xs font-medium text-zinc-700 max-w-[100px] truncate">{userName}</div>
            </div>
          </div>

          {user && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={async () => { await signOut(); router.push('/'); }}
              className="hidden sm:flex p-2.5 rounded-2xl hover:bg-red-500/5 border border-transparent hover:border-red-500/10 text-zinc-400 hover:text-red-500 transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-2xl hover:bg-zinc-50 transition-all border border-transparent hover:border-zinc-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-zinc-900" /> : <Menu className="w-5 h-5 text-zinc-900" />}
          </motion.button>

        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-zinc-100 bg-white/98 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-2">
              {pathname !== '/' && navLinks.map(({ label, icon: Icon, href }) => (
                <button
                  key={href}
                  onClick={() => { router.push(href); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-all text-left"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}


              {user && (
                <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-saffron to-yellow-500 rounded-xl flex items-center justify-center text-xs font-bold text-white overflow-hidden shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                    ) : (
                      initials || '?'
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest leading-none mb-1">{t('authenticated_as')}</div>
                    <div className="text-xs font-bold text-zinc-900 truncate">{userName}</div>
                  </div>
                </div>
              )}
              {user ? (
                <button
                  onClick={async () => { await signOut(); router.push('/'); setMobileMenuOpen(false); }}
                  className="w-full py-3 bg-red-500/5 border border-red-500/10 text-red-500 rounded-2xl text-sm font-bold"
                >
                  🚪 {t('sign_out')}
                </button>
              ) : (
                <button
                  onClick={() => { 
                    if (pathname === '/') {
                      document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      router.push('/');
                    }
                    setMobileMenuOpen(false); 
                  }}
                  className="w-full py-3 bg-saffron/5 border border-saffron/10 text-saffron rounded-2xl text-sm font-bold"
                >
                  {t('sign_in')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>

    {/* Mobile Bottom Navigation Bar (App-like feel) */}
    {showMobileBottomDock && (
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] bg-zinc-950/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] z-50 flex items-center justify-around py-3 px-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] no-print">
      {navLinks.map(({ label, icon: Icon, href, color }) => {
        const isActive = pathname === href || (href !== '/planner' && pathname.startsWith(href));
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={`flex flex-col items-center justify-center gap-1.5 w-16 transition-all relative ${
              isActive ? 'scale-110' : 'opacity-60 grayscale'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="mobile-nav-highlight"
                className={`absolute -top-1 w-1 h-1 rounded-full bg-gradient-to-r ${color} shadow-[0_0_10px_rgba(255,255,255,0.5)]`}
              />
            )}
            <div className={`p-2 rounded-2xl transition-all ${isActive ? `bg-gradient-to-br ${color} shadow-lg shadow-white/5` : ''}`}>
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-zinc-200'}`} />
            </div>
            <span className={`text-11 font-semibold uppercase tracking-wide ${isActive ? 'text-white' : 'text-zinc-500'}`}>{label}</span>
          </button>
        );
      })}
      </div>
    )}
    </>
  );
}
