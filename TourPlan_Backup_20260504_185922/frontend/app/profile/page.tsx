'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Save, User, Mail, Phone, Globe, ArrowLeft, Shield, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, type Profile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase/client';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { getProfile, updateProfile, uploadAvatar, uploading } = useProfile();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [tripCount, setTripCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({ full_name: '', phone: '', preferred_language: 'en' });

  useEffect(() => {
    if (!authLoading && !user) router.push('/');
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
          phone: p.phone || user?.phone || '',
          preferred_language: p.preferred_language || 'en',
        });
      } else {
        // Use auth user metadata as fallback
        setForm({
          full_name: user?.user_metadata?.full_name || '',
          phone: user?.phone || '',
          preferred_language: 'en',
        });
      }

      // Count bookings via Supabase
      const { count } = await supabase
        .from('tourplan_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setTripCount(count || 0);
      setLoading(false);
    }
    if (!authLoading) load();
  }, [user, authLoading]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateProfile(form);
    if (error) toast.error(error);
    setSaving(false);
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
    <div className="pt-4 pb-12 space-y-6 max-w-2xl mx-auto">
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => router.push('/planner')}
        className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </motion.button>

      {/* Avatar + Name Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#020617]/50 border border-white/5 rounded-3xl p-8 text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/5 to-blue-900/5" />

        {/* Avatar */}
        <div className="relative inline-block mb-4">
          <div
            onClick={handleAvatarClick}
            className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-3xl font-black text-white cursor-pointer hover:scale-105 transition-transform relative overflow-hidden group"
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
            <div className="absolute inset-0 rounded-3xl bg-zinc-950/70 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
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

        <h1 className="text-2xl font-black">{form.full_name || 'Traveler'}</h1>
        <p className="text-sm text-zinc-500 mt-1">{user?.email}</p>

        {/* Stats row */}
        <div className="flex justify-center gap-6 mt-6">
          {[
            { label: 'Trips', value: tripCount, icon: '🧳', color: 'text-cyan-400' },
            { label: 'Member Since', value: new Date(user?.created_at || Date.now()).getFullYear(), icon: '📅', color: 'text-blue-400' },
            { label: 'Status', value: 'Active', icon: '✅', color: 'text-emerald-400' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="text-center">
              <div className="text-lg">{icon}</div>
              <div className={`text-lg font-black ${color}`}>{value}</div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest">{label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Profile Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4"
      >
        <h2 className="font-black text-lg flex items-center gap-2">
          <User className="w-5 h-5 text-cyan-400" /> Personal Details
        </h2>

        <div className="space-y-3">
          {/* Full Name */}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Full Name</label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Your full name"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-cyan-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Email (read-only from Supabase Auth) */}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Email</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                className="w-full bg-zinc-900 border border-zinc-800/50 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-500 cursor-not-allowed"
              />
            </div>
            <p className="text-[10px] text-zinc-700 mt-1">Email is managed by Supabase Auth</p>
          </div>

          {/* Phone */}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Phone</label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-zinc-500">+91</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                placeholder="10-digit number"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-16 pr-4 py-3 text-sm focus:border-cyan-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Preferred Language</label>
            <div className="relative mt-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <select
                value={form.preferred_language}
                onChange={(e) => setForm({ ...form, preferred_language: e.target.value })}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-cyan-500 focus:outline-none transition-all appearance-none"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="mr">मराठी (Marathi)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-700 text-white rounded-2xl font-black text-sm hover:scale-[1.02] transition-all shadow-[0_10px_30px_rgba(6,182,212,0.25)] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <><Save className="w-4 h-4" /> Save Changes</>
          )}
        </button>
      </motion.div>

      {/* Account Security */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-3"
      >
        <h2 className="font-black text-lg flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" /> Account Security
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between py-3 border-b border-zinc-800">
            <div>
              <div className="font-bold">Authentication Method</div>
              <div className="text-xs text-zinc-500 mt-0.5">Secured by Supabase Auth</div>
            </div>
            <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
              {user?.app_metadata?.provider || 'email'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="font-bold">Account ID</div>
              <div className="text-xs text-zinc-600 font-mono mt-0.5">{user?.id?.slice(0, 20)}...</div>
            </div>
            <Activity className="w-4 h-4 text-zinc-600" />
          </div>
        </div>
      </motion.div>

      {/* Sign Out */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={async () => {
          await signOut();
          router.push('/');
        }}
        className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl font-black text-sm hover:bg-red-500/20 transition-all"
      >
        🚪 Sign Out
      </motion.button>
    </div>
  );
}
