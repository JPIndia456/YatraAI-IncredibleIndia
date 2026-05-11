'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Save, User, Mail, Phone, Globe, ArrowLeft, Shield, Activity, Compass, Sparkles, Waves, Mountain, MountainSnow, Sun, Landmark, Bird, Castle, Building2, Heart, Ban, Fingerprint, UserCircle, LogOut, Map, Users, Languages, ChevronDown, Check, Camera as Photo, Footprints, History, Utensils, Gem, Wallet, Heart as Soul, Tent, Users as Family } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, type Profile } from '@/hooks/useProfile';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase/client';
import { useTripStore } from '@/lib/store';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { setLanguage: setGlobalLanguage } = useLanguage() as any;
  const { getProfile, updateProfile, uploadAvatar, uploading } = useProfile();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [tripCount, setTripCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
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
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);
  const [isSexOpen, setIsSexOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  
  const personaRef = useRef<HTMLDivElement>(null);
  const sexRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);

  const personaOptions = [
    { label: 'Cultural Explorer', icon: Landmark, color: 'text-amber-500' },
    { label: 'Adventure Seeker', icon: Footprints, color: 'text-orange-500' },
    { label: 'Spiritual Pilgrim', icon: Soul, color: 'text-purple-500' },
    { label: 'Foodie Enthusiast', icon: Utensils, color: 'text-emerald-500' },
    { label: 'Luxury Traveler', icon: Gem, color: 'text-indigo-500' },
    { label: 'Budget Backpacker', icon: Wallet, color: 'text-slate-500' },
    { label: 'Nature Lover', icon: Mountain, color: 'text-green-500' },
    { label: 'History Buff', icon: History, color: 'text-stone-500' },
    { label: 'Photography Enthusiast', icon: Photo, color: 'text-blue-500' },
    { label: 'Solo Adventurer', icon: Compass, color: 'text-cyan-500' },
    { label: 'Family Vacationer', icon: Family, color: 'text-pink-500' }
  ];

  const categories = ['Beaches', 'Mountains', 'Hill Stations', 'Deserts', 'Religious Sites', 'Wildlife', 'Historical Sites', 'Cities'];

  useEffect(() => {
    if (!authLoading && !user) router.push('/');
    
    const handleClickOutside = (event: MouseEvent) => {
      if (personaRef.current && !personaRef.current.contains(event.target as Node)) setIsPersonaOpen(false);
      if (sexRef.current && !sexRef.current.contains(event.target as Node)) setIsSexOpen(false);
      if (languageRef.current && !languageRef.current.contains(event.target as Node)) setIsLanguageOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [user, authLoading, router]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const p = await getProfile();
      if (p) {
        setProfile(p);
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
      } else {
        setForm({
          full_name: user?.user_metadata?.full_name || '',
          display_name: '',
          email: user?.email || '',
          phone: user?.phone || '',
          gender: '',
          favorite_destinations: [],
          preferred_language: 'en',
          user_persona: 'Cultural Explorer',
          likes: '',
          dislikes: ''
        });
      }

      const { count } = await supabase
        .from('yatra_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setTripCount(count || 0);
      setLoading(false);
    }
    if (!authLoading) load();
  }, [user, authLoading, getProfile]);

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      ...form,
      likes: form.likes.split(',').map(s => s.trim()).filter(Boolean),
      dislikes: form.dislikes.split(',').map(s => s.trim()).filter(Boolean)
    };
    const { error } = await updateProfile(updates);
    if (error) {
      toast.error(error);
    } else {
      // Sync with global store so AI Brain sees updates immediately
      const { setUserPersona, setLikes, setDislikes } = useTripStore.getState();
      setUserPersona(updates.user_persona);
      setLikes(updates.likes);
      setDislikes(updates.dislikes);
    }
    setSaving(false);
  };

  const toggleDestination = (cat: string) => {
    setForm(prev => ({
      ...prev,
      favorite_destinations: prev.favorite_destinations.includes(cat)
        ? prev.favorite_destinations.filter(c => c !== cat)
        : [...prev.favorite_destinations, cat]
    }));
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

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

  if (loading || authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-4 pb-12 space-y-8 max-w-4xl mx-auto px-4 selection:bg-saffron/30">
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => router.push('/planner')}
        className="flex items-center gap-2 text-slate-400 hover:text-saffron text-sm font-black uppercase tracking-widest transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Planner
      </motion.button>

      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-orange-100 rounded-3xl p-8 shadow-sm relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-[4px] flex">
          <div className="flex-1 bg-[#FF9933]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#138808]" />
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
            <div
              onClick={handleAvatarClick}
              className="w-32 h-32 rounded-full border-4 border-white bg-slate-50 flex items-center justify-center text-4xl font-black text-slate-200 cursor-pointer hover:border-saffron/20 transition-all relative overflow-hidden group shadow-xl"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-white/70 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-saffron/30 border-t-saffron rounded-full animate-spin" />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="flex-1 text-center md:text-left space-y-2">
            <h1 className="text-4xl font-black text-[#000080] uppercase tracking-tighter italic leading-none">
              {form.display_name || form.full_name || 'Your Profile'}
            </h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <span className="flex items-center gap-1.5 text-sm text-[#000080]/60 font-bold">
                <Mail className="w-4 h-4 text-[#FF9933]" /> {user?.email}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-[#000080]/60 font-bold">
                <Phone className="w-4 h-4 text-[#FF9933]" /> +91 {form.phone || 'Not set'}
              </span>
            </div>
            <div className="pt-4 flex flex-wrap justify-center md:justify-start gap-2">
              <span className="px-4 py-1.5 bg-orange-50 text-[#FF9933] rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-100">
                {form.user_persona}
              </span>
              <span className="px-4 py-1.5 bg-emerald-50 text-[#138808] rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                {tripCount} Trips Planned
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-orange-50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-orange-50 rounded-xl">
              <User className="w-5 h-5 text-[#FF9933]" />
            </div>
            <h2 className="font-black text-lg text-[#000080] italic uppercase">Account Details</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-[#FF9933] uppercase font-black tracking-widest ml-1 flex items-center gap-1.5">
                <Mail className="w-3 h-3" /> Email Address
              </label>
              <input
                type="email"
                value={form.email}
                readOnly
                className="w-full mt-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-[#000080]/40 cursor-not-allowed font-medium"
              />
              <p className="text-[8px] text-slate-300 mt-1 italic ml-1">Managed via Supabase Authentication</p>
            </div>

            <div>
              <label className="text-[10px] text-[#FF9933] uppercase font-black tracking-widest ml-1 flex items-center gap-1.5">
                <Fingerprint className="w-3 h-3" /> Full Name
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Legally Registered Name"
                className="w-full mt-1 bg-slate-50 border border-orange-50 rounded-xl px-4 py-3 text-sm text-[#000080] font-medium focus:border-saffron focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#FF9933] uppercase font-black tracking-widest ml-1 flex items-center gap-1.5">
                <UserCircle className="w-3 h-3" /> Display Name
              </label>
              <input
                type="text"
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="Nickname / User ID"
                className="w-full mt-1 bg-slate-50 border border-orange-50 rounded-xl px-4 py-3 text-sm text-[#000080] font-medium focus:border-saffron focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative" ref={sexRef}>
                <label className="text-[10px] text-[#FF9933] uppercase font-black tracking-widest ml-1 flex items-center gap-1.5 mb-1.5">
                  <User className="w-3 h-3" /> Sex
                </label>
                <button
                  onClick={() => setIsSexOpen(!isSexOpen)}
                  className="w-full bg-slate-50 border border-orange-50 rounded-xl px-4 py-3 flex items-center justify-between text-[11px] text-[#000080] font-bold uppercase tracking-wider hover:bg-white transition-all"
                >
                  <span className="truncate">{form.gender || 'Select'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isSexOpen ? 'rotate-180' : ''}`} />
                </button>

                {isSexOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute z-[60] left-0 right-0 mt-2 bg-white border border-orange-50 rounded-2xl shadow-2xl overflow-hidden py-2"
                  >
                    {['Male', 'Female', 'Other'].map((sex) => (
                      <button
                        key={sex}
                        onClick={() => {
                          setForm({ ...form, gender: sex });
                          setIsSexOpen(false);
                        }}
                        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-orange-50 transition-colors text-[10px] font-bold text-[#000080] uppercase tracking-wider"
                      >
                        {sex}
                        {form.gender === sex && <Check className="w-3 h-3 text-saffron" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>

              <div className="relative" ref={languageRef}>
                <label className="text-[10px] text-[#FF9933] uppercase font-black tracking-widest ml-1 flex items-center gap-1.5 mb-1.5">
                  <Languages className="w-3 h-3" /> Language
                </label>
                <button
                  onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                  className="w-full bg-slate-50 border border-orange-50 rounded-xl px-4 py-3 flex items-center justify-between text-[11px] text-[#000080] font-bold uppercase tracking-wider hover:bg-white transition-all"
                >
                  <span className="truncate">
                    {SUPPORTED_LANGUAGES.find(l => l.code === form.preferred_language)?.name || 'Language'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isLanguageOpen ? 'rotate-180' : ''}`} />
                </button>

                {isLanguageOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute z-[60] left-0 right-0 mt-2 bg-white border border-orange-50 rounded-2xl shadow-2xl overflow-hidden py-2"
                  >
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setForm({ ...form, preferred_language: lang.code });
                            setGlobalLanguage(lang.code);
                            setIsLanguageOpen(false);
                          }}
                          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-orange-50 transition-colors"
                        >
                          <div className="flex flex-col items-start">
                            <span className="text-[10px] font-bold text-[#000080] uppercase tracking-wider">{lang.name}</span>
                            <span className="text-[8px] text-slate-400 font-medium">{lang.native}</span>
                          </div>
                          {form.preferred_language === lang.code && <Check className="w-3 h-3 text-saffron" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[#FF9933] uppercase font-black tracking-widest ml-1 flex items-center gap-1.5">
                <Phone className="w-3 h-3" /> Phone Number
              </label>
              <div className="relative mt-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#000080]/60 font-bold border-r border-slate-200 pr-3">+91</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  placeholder="10-digit number"
                  className="w-full bg-slate-50 border border-orange-50 rounded-xl pl-16 pr-4 py-3 text-sm text-[#000080] font-medium focus:border-saffron focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-emerald-50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <Compass className="w-5 h-5 text-[#138808]" />
            </div>
            <h2 className="font-black text-lg text-[#000080] italic uppercase">Odyssey Planning</h2>
          </div>

          <div className="space-y-6">
            <div className="relative" ref={personaRef}>
              <label className="text-[10px] text-[#138808] uppercase font-black tracking-widest ml-1 flex items-center gap-1.5 mb-1.5">
                <Users className="w-3 h-3" /> User Persona
              </label>
              
              <button
                onClick={() => setIsPersonaOpen(!isPersonaOpen)}
                className="w-full bg-slate-50 border border-emerald-50 rounded-xl px-4 py-3 flex items-center justify-between text-[11px] text-[#000080] font-bold uppercase tracking-wider hover:bg-white transition-all"
              >
                <div className="flex items-center gap-2">
                  {(() => {
                    const selected = personaOptions.find(p => p.label === form.user_persona);
                    const Icon = selected?.icon || Users;
                    return <Icon className={`w-3.5 h-3.5 ${selected?.color || 'text-[#138808]'}`} />;
                  })()}
                  {form.user_persona}
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isPersonaOpen ? 'rotate-180' : ''}`} />
              </button>

              {isPersonaOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute z-50 left-0 right-0 mt-2 bg-white border border-emerald-50 rounded-2xl shadow-2xl overflow-hidden py-2"
                >
                  <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                    {personaOptions.map((option) => (
                      <button
                        key={option.label}
                        onClick={() => {
                          setForm({ ...form, user_persona: option.label });
                          setIsPersonaOpen(false);
                        }}
                        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-emerald-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <option.icon className={`w-4 h-4 ${option.color} group-hover:scale-110 transition-transform`} />
                          <span className="text-[10px] font-bold text-[#000080] uppercase tracking-wider">{option.label}</span>
                        </div>
                        {form.user_persona === option.label && (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            <div>
              <label className="text-[10px] text-[#138808] uppercase font-black tracking-widest ml-1 mb-2 flex items-center gap-1.5">
                <Map className="w-3 h-3" /> Places you like to visit
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => {
                  const isSelected = form.favorite_destinations.includes(cat);
                  const Icon = {
                    'Beaches': Waves,
                    'Mountains': Mountain,
                    'Hill Stations': MountainSnow,
                    'Deserts': Sun,
                    'Religious Sites': Landmark,
                    'Wildlife': Bird,
                    'Historical Sites': Castle,
                    'Cities': Building2
                  }[cat] || Compass;

                  return (
                    <button
                      key={cat}
                      onClick={() => toggleDestination(cat)}
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${
                        isSelected 
                          ? 'bg-[#138808] text-white border-[#138808] shadow-lg shadow-emerald-500/20 scale-105' 
                          : 'bg-white text-slate-400 border-slate-100 hover:border-emerald-300 hover:text-[#138808]'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#138808]'}`} />
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-[10px] text-[#000080] font-bold leading-relaxed italic">
                "Our Intelligence Brain uses your persona and destination picks to curate a perfectly balanced Odyssey."
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="md:col-span-2 bg-white border border-orange-50 rounded-3xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-50 rounded-xl">
                <Sparkles className="w-5 h-5 text-[#FF9933]" />
              </div>
              <h2 className="font-black text-xl text-[#000080] italic uppercase tracking-tight">Interests & Filters</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-[#FF9933] fill-[#FF9933]/10" />
                <label className="text-[10px] text-[#FF9933] uppercase font-black tracking-widest">Things You Love (Likes)</label>
              </div>
              <textarea
                value={form.likes}
                onChange={(e) => setForm({ ...form, likes: e.target.value })}
                placeholder="e.g. Ancient Temples, Street Food, Night Trains"
                className="w-full bg-slate-50 border border-orange-50 rounded-2xl px-5 py-4 text-sm text-[#000080] font-medium focus:border-saffron focus:bg-white focus:outline-none transition-all min-h-[100px] resize-none shadow-inner"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Ban className="w-4 h-4 text-[#FF9933]" />
                <label className="text-[10px] text-[#FF9933] uppercase font-black tracking-widest">Things You Avoid (Dislikes)</label>
              </div>
              <textarea
                value={form.dislikes}
                onChange={(e) => setForm({ ...form, dislikes: e.target.value })}
                placeholder="e.g. Crowded Buses, Spicy Food, Early Mornings"
                className="w-full bg-slate-50 border border-orange-50 rounded-2xl px-5 py-4 text-sm text-[#000080] font-medium focus:border-[#FF9933] focus:bg-white focus:outline-none transition-all min-h-[100px] resize-none shadow-inner"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-5 bg-gradient-to-r from-[#FF9933] to-[#138808] text-white rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-orange-500/20 disabled:opacity-60 flex items-center justify-center gap-2 uppercase tracking-[0.2em]"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <><Save className="w-5 h-5" /> Update My Odyssey Profile</>
          )}
        </button>

        <button
          onClick={async () => {
            await signOut();
            router.push('/');
          }}
          className="px-8 py-5 bg-white text-red-500 border border-red-100 rounded-2xl font-black text-sm hover:bg-red-50 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      <div className="text-center pt-8">
        <p className="text-[10px] text-[#000080]/30 font-black uppercase tracking-[0.3em]">
          Secured by Supabase & Powered by Gemini AI
        </p>
      </div>
    </div>
  );
}
