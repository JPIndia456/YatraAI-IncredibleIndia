'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { User, Landmark, Sparkles, Heart, Utensils, Gem, Wallet, Mountain, History, Camera, Compass, Users, Languages, Check, X, Shield, LogOut, UserCircle, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import { useTripStore } from '@/lib/store';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfilePanel({ isOpen, onClose }: ProfilePanelProps) {
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
    dislikes: ''
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
          dislikes: p.dislikes?.join(', ') || ''
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
      setUserPersona(updates.user_persona);
      setLikes(updates.likes);
      setDislikes(updates.dislikes);
      setSyncStatus('synced');
    }
  };

  const toggleDestination = (cat: string) => {
    setForm(prev => ({
      ...prev,
      favorite_destinations: prev.favorite_destinations.includes(cat)
        ? prev.favorite_destinations.filter(c => c !== cat)
        : [...prev.favorite_destinations, cat]
    }));
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white z-[210] shadow-2xl overflow-y-auto no-scrollbar selection:bg-saffron/30"
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

                  <div className="grid grid-cols-1 gap-4">
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

                    <div className="space-y-4 pt-2">
                       <div className="space-y-2">
                        <label className="text-[9px] text-[#FF9933] uppercase font-black tracking-widest ml-1 flex items-center gap-1.5">
                          <User className="w-3 h-3" /> Sex / Gender
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {['Male', 'Female', 'Other'].map((sex) => {
                            const isSelected = form.gender === sex;
                            return (
                              <button
                                key={sex}
                                onClick={() => setForm({ ...form, gender: sex })}
                                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${
                                  isSelected 
                                    ? 'bg-[#FF9933] text-white border-[#FF9933] shadow-md shadow-orange-500/10' 
                                    : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-orange-200'
                                }`}
                              >
                                {sex}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] text-[#FF9933] uppercase font-black tracking-widest ml-1 flex items-center gap-1.5">
                          <Languages className="w-3 h-3" /> Interface Language
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {SUPPORTED_LANGUAGES.map((lang) => {
                            const isSelected = form.preferred_language === lang.code;
                            return (
                              <button
                                key={lang.code}
                                onClick={() => {
                                  setForm({ ...form, preferred_language: lang.code });
                                  setGlobalLanguage(lang.code);
                                }}
                                className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${
                                  isSelected 
                                    ? 'bg-[#000080] text-white border-[#000080] shadow-md' 
                                    : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-blue-200'
                                }`}
                              >
                                {lang.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
               </div>

               {/* Persona Section */}
               <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Compass className="w-4 h-4 text-[#138808]" />
                    <h3 className="text-xs font-black text-[#000080] uppercase tracking-[0.2em]">Odyssey Archetype</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                     {personaOptions.map(p => (
                        <button
                          key={p.label}
                          onClick={() => setForm({ ...form, user_persona: p.label })}
                          className={`flex items-center gap-2 p-3 rounded-xl border text-[9px] font-black uppercase tracking-tight transition-all ${
                            form.user_persona === p.label 
                              ? 'bg-[#138808] text-white border-[#138808] shadow-md' 
                              : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-emerald-200'
                          }`}
                        >
                           <p.icon className="w-3 h-3" />
                           {p.label}
                        </button>
                     ))}
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
