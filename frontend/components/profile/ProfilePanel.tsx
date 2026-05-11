'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { User, Landmark, Sparkles, Heart, Utensils, Gem, Wallet, Mountain, History, Camera, Compass, Users, Languages, Check, X, Shield, LogOut, UserCircle, Fingerprint, Ban, ChevronDown, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import { useTripStore, useTripPlannerStore, useTourGuideStore } from '@/lib/store';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfilePanel({ isOpen: propsIsOpen, onClose: propsOnClose }: Partial<ProfilePanelProps> = {}) {
  const { isProfileOpen: storeIsOpen, setIsProfileOpen: setStoreIsOpen } = useTripPlannerStore();
  const isOpen = propsIsOpen ?? storeIsOpen;
  const onClose = propsOnClose ?? (() => setStoreIsOpen(false));

  const { user, loading: authLoading, signOut } = useAuth();
  const { setLanguage: setGlobalLanguage } = useLanguage() as any;
  const { getProfile, updateProfile, uploadAvatar, uploading } = useProfile();

  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('idle');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasChanged = useRef(false);

  const [form, setForm] = useState({ 
    full_name: '', 
    display_name: '',
    email: '',
    phone: '', 
    gender: '',
    favorite_destinations: [] as string[],
    preferred_language: 'en',
    user_persona: 'Cultural Explorer',
    likes: '',
    dislikes: '',
    telegram_id: '',
    telegram_enabled: false
  });

  const personaOptions = [
    { label: 'Cultural Explorer', icon: Landmark, color: 'text-amber-500' },
    { label: 'Adventure Seeker', icon: Sparkles, color: 'text-orange-500' },
    { label: 'Spiritual Pilgrim', icon: Heart, color: 'text-purple-500' },
    { label: 'Foodie Enthusiast', icon: Utensils, color: 'text-emerald-500' },
    { label: 'Luxury Traveler', icon: Gem, color: 'text-indigo-500' },
    { label: 'Budget Backpacker', icon: Wallet, color: 'text-slate-500' },
    { label: 'Nature Lover', icon: Mountain, color: 'text-green-500' },
    { label: 'History Buff', icon: History, color: 'text-stone-500' },
    { label: 'Photography Enthusiast', icon: Camera, color: 'text-blue-500' },
    { label: 'Solo Adventurer', icon: Compass, color: 'text-cyan-500' },
    { label: 'Family Vacationer', icon: Users, color: 'text-pink-500' }
  ];

  const categories = ['Beaches', 'Mountains', 'Hill Stations', 'Deserts', 'Religious Sites', 'Wildlife', 'Historical Sites', 'Cities'];

  useEffect(() => {
    async function load() {
      if (!user) return;
      const p = await getProfile();
      if (p) {
        setAvatarUrl(p.avatar_url || null);
        setForm({
          full_name: p.full_name || user?.user_metadata?.full_name || '',
          display_name: p.display_name || '',
          email: p.email || user?.email || '',
          phone: p.phone || user?.phone || '',
          gender: p.gender || '',
          favorite_destinations: p.favorite_destinations || [],
          preferred_language: p.preferred_language || 'en',
          user_persona: p.user_persona || 'Cultural Explorer',
          likes: p.likes?.join(', ') || '',
          dislikes: p.dislikes?.join(', ') || '',
          telegram_id: p.telegram_id || '',
          telegram_enabled: !!p.telegram_enabled
        });
      }
      setLoading(false);
      setTimeout(() => { hasChanged.current = true; }, 1000);
    }
    if (isOpen && !authLoading) load();
  }, [user, authLoading, getProfile, isOpen]);

  // Debounced Auto-Save
  useEffect(() => {
    if (!hasChanged.current) return;
    const timer = setTimeout(() => {
      handleSave();
    }, 1500);
    return () => clearTimeout(timer);
  }, [form]);

  const handleSave = async () => {
    setSyncStatus('saving');
    const updates = {
      ...form,
      likes: form.likes.split(',').map(s => s.trim()).filter(Boolean),
      dislikes: form.dislikes.split(',').map(s => s.trim()).filter(Boolean)
    };
    const { error } = await updateProfile(updates);
    if (error) {
      setSyncStatus('error');
    } else {
      const { setUserPersona, setLikes, setDislikes } = useTripStore.getState();
      const { patchTourGuide } = useTourGuideStore.getState();
      
      setUserPersona(updates.user_persona);
      setLikes(updates.likes);
      setDislikes(updates.dislikes);
      
      // Keep TourGuideStore in sync for immediate use in other steps
      patchTourGuide({ telegramId: updates.telegram_id });
      
      setSyncStatus('synced');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadAvatar(file);
    if (url) setAvatarUrl(url);
  };

  const initials = (form.full_name || user?.email || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 35, stiffness: 350 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-[480px] bg-white z-[2001] shadow-2xl overflow-y-auto no-scrollbar selection:bg-saffron/30 border-l border-slate-100"
          >
            {/* Header Banner */}
            <div className="relative p-8 border-b border-slate-100">
               <button 
                 onClick={onClose}
                 className="absolute right-6 top-6 p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-[#000080]"
               >
                 <X className="w-5 h-5" />
               </button>

               <div className="flex items-center gap-6 mt-4">
                  <div className="relative group">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-2xl bg-slate-50 border-2 border-white shadow-lg flex items-center justify-center text-2xl font-black text-slate-200 cursor-pointer overflow-hidden relative group"
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        initials
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    {uploading && (
                      <div className="absolute inset-0 rounded-2xl bg-white/70 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-saffron/30 border-t-saffron rounded-full animate-spin" />
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-[#000080] uppercase tracking-tighter italic leading-none">
                      {form.display_name || form.full_name || 'Your Identity'}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user?.email}</p>
                    
                    <div className="flex items-center gap-3 pt-2">
                       <AnimatePresence mode="wait">
                        {syncStatus !== 'idle' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-2 px-2.5 py-0.5 bg-slate-50 border border-slate-100 rounded-full"
                          >
                            {syncStatus === 'saving' && <div className="w-1.5 h-1.5 bg-saffron rounded-full animate-pulse" />}
                            {syncStatus === 'synced' && <Check className="w-2 h-2 text-[#138808]" />}
                            <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">
                              {syncStatus === 'saving' ? 'Syncing...' : syncStatus === 'synced' ? 'Identity Synced' : 'Sync Error'}
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
               </div>
            </div>

            <div className="p-8 space-y-10 pb-20">
               {/* Identity Grid */}
               <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <UserCircle className="w-4 h-4 text-saffron" />
                    <h3 className="text-xs font-black text-[#000080] uppercase tracking-[0.2em]">Account Metadata</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-[#FF9933] uppercase font-black tracking-widest ml-1 flex items-center gap-1.5">
                        <Fingerprint className="w-3 h-3" /> Full Legal Name
                      </label>
                      <input
                        type="text"
                        value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs text-[#000080] font-bold focus:border-saffron focus:bg-white outline-none transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                        <label className="text-[9px] text-[#FF9933] uppercase font-black tracking-widest ml-1 flex items-center gap-1.5">
                          <User className="w-3 h-3" /> Sex / Gender
                        </label>
                        <div className="relative group">
                          <select
                            value={form.gender}
                            onChange={(e) => setForm({ ...form, gender: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs text-[#000080] font-bold focus:border-saffron focus:bg-white outline-none transition-all appearance-none cursor-pointer"
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#138808] pointer-events-none transition-transform group-focus-within:rotate-180" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] text-[#FF9933] uppercase font-black tracking-widest ml-1 flex items-center gap-1.5">
                          <Languages className="w-3 h-3" /> Language
                        </label>
                        <div className="relative group">
                          <select
                            value={form.preferred_language}
                            onChange={(e) => {
                              setForm({ ...form, preferred_language: e.target.value });
                              setGlobalLanguage(e.target.value);
                            }}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs text-[#000080] font-bold focus:border-saffron focus:bg-white outline-none transition-all appearance-none cursor-pointer"
                          >
                            {SUPPORTED_LANGUAGES.map((lang) => (
                              <option key={lang.code} value={lang.code}>
                                {lang.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#138808] pointer-events-none transition-transform group-focus-within:rotate-180" />
                        </div>
                      </div>
                    </div>
                  </div>
               </div>

                {/* Telegram Concierge Linkage */}
                <div className="space-y-6 pt-4 border-t border-slate-100">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <Send className="w-4 h-4 text-sky-500" />
                       <h3 className="text-xs font-black text-[#000080] uppercase tracking-[0.2em]">Telegram Concierge</h3>
                     </div>
                     {form.telegram_id && (
                       <div className="flex items-center gap-1.5">
                         <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${/^\d{10,15}$/.test(form.telegram_id) ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                         <span className={`text-[8px] font-black uppercase tracking-widest ${/^\d{10,15}$/.test(form.telegram_id) ? 'text-amber-600' : 'text-emerald-600'}`}>
                           {/^\d{10,15}$/.test(form.telegram_id) ? 'Step 1/2: Linked' : 'Active & Ready'}
                         </span>
                       </div>
                     )}
                   </div>

                   <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-[#FF9933] uppercase font-black tracking-widest ml-1 flex items-center gap-1.5">
                          <Fingerprint className="w-3 h-3" /> Mobile Number for Linkage
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">+91</span>
                            <input
                              type="tel"
                              value={form.telegram_id.startsWith('+91') ? form.telegram_id.slice(3) : (form.telegram_id.startsWith('91') && form.telegram_id.length === 12) ? form.telegram_id.slice(2) : form.telegram_id}
                              placeholder="99999 99999"
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                setForm({ ...form, telegram_id: val ? `+91${val}` : '', telegram_enabled: !!val });
                              }}
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-xs text-[#000080] font-bold focus:border-saffron focus:bg-white outline-none transition-all"
                            />
                          </div>
                          {form.telegram_id && (
                            <button 
                              onClick={() => {
                                setForm({ ...form, telegram_id: '', telegram_enabled: false });
                                toast.message("Telegram identity cleared");
                              }}
                              className="px-4 bg-slate-100 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {form.telegram_id && /^\+?91\d{10}$/.test(form.telegram_id.replace(/\s/g, '')) && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-sky-50 border border-sky-100 rounded-2xl space-y-3">
                           <p className="text-[10px] text-sky-700 font-bold leading-relaxed">
                             <span className="text-sky-900 font-black">Next:</span> Open our bot and share your contact to finish the secure linkage.
                           </p>
                           <button
                             onClick={() => {
                               const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'Rujubot';
                               window.open(`https://t.me/${botName.replace(/^@/, '')}?start=profile`, '_blank');
                             }}
                             className="w-full py-3 bg-sky-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-sky-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-sky-200"
                           >
                             <Send className="w-3 h-3" /> Launch Yatra Bot
                           </button>
                        </motion.div>
                      )}
                   </div>
                </div>

               {/* Persona Section */}
               <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Compass className="w-4 h-4 text-[#138808]" />
                    <h3 className="text-xs font-black text-[#000080] uppercase tracking-[0.2em]">Odyssey Archetype</h3>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] text-[#FF9933] uppercase font-black tracking-widest ml-1 flex items-center gap-1.5">
                      <Compass className="w-3 h-3" /> Your Persona
                    </label>
                    <div className="relative group">
                      <select
                        value={form.user_persona}
                        onChange={(e) => setForm({ ...form, user_persona: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs text-[#000080] font-bold focus:border-saffron focus:bg-white outline-none transition-all appearance-none cursor-pointer"
                      >
                        {personaOptions.map(p => (
                          <option key={p.label} value={p.label}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#138808] pointer-events-none transition-transform group-focus-within:rotate-180" />
                    </div>
                  </div>
               </div>

               {/* Interests */}
               <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-saffron" />
                    <h3 className="text-xs font-black text-[#000080] uppercase tracking-[0.2em]">Interests & Filters</h3>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 ml-1">
                        <Heart className="w-3 h-3 text-saffron" />
                        <label className="text-[9px] text-[#FF9933] uppercase font-black tracking-widest">Things You Love</label>
                      </div>
                      <textarea
                        value={form.likes}
                        onChange={(e) => setForm({ ...form, likes: e.target.value })}
                        placeholder="e.g. Ancient Temples, Street Food"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs text-[#000080] font-bold focus:border-saffron focus:bg-white outline-none transition-all min-h-[80px] resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 ml-1">
                        <Ban className="w-3 h-3 text-saffron" />
                        <label className="text-[9px] text-[#FF9933] uppercase font-black tracking-widest">Things You Avoid</label>
                      </div>
                      <textarea
                        value={form.dislikes}
                        onChange={(e) => setForm({ ...form, dislikes: e.target.value })}
                        placeholder="e.g. Crowded Buses, Spicy Food"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs text-[#000080] font-bold focus:border-saffron focus:bg-white outline-none transition-all min-h-[80px] resize-none"
                      />
                    </div>
                  </div>
               </div>

               {/* Actions */}
               <div className="pt-6 border-t border-slate-100 space-y-4">
                  <button
                    disabled={syncStatus === 'saving'}
                    onClick={async () => {
                      await handleSave();
                      if (syncStatus === 'synced') {
                        toast.success('Identity Synchronized');
                      } else if (syncStatus === 'error') {
                        toast.error('Identity Sync Failed');
                      }
                    }}
                    className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      syncStatus === 'saving' 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-[#138808] text-white shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-95'
                    }`}
                  >
                    {syncStatus === 'saving' ? (
                      <>
                        <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Save Identity
                      </>
                    )}
                  </button>

                  <div className="w-full py-4 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl font-black text-[9px] flex items-center justify-center gap-3 uppercase tracking-[0.2em] italic">
                    <Shield className="w-3.5 h-3.5 text-[#138808]" />
                    Identity Automatically Synced
                  </div>

                  <button
                    onClick={async () => {
                      await signOut();
                      onClose();
                    }}
                    className="w-full py-4 bg-white text-red-500 border border-red-100 rounded-2xl font-black text-[10px] hover:bg-red-50 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-3 h-3" /> Sign Out from Odyssey
                  </button>
               </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
