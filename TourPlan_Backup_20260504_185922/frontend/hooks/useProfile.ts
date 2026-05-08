'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type Profile = {
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  preferred_language?: string;
  language_code?: string;
  travel_style?: string;
  telegram_enabled?: boolean;
  telegram_id?: string;
  total_trips?: number;
  created_at?: string;
};

export function useProfile() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  // Get profile (real-time read with Supabase)
  const getProfile = useCallback(async (): Promise<Profile | null> => {
    if (!user?.id) return null;
    const { data, error } = await supabase
      .from('tourplan_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (error) return null;
    return data as Profile;
  }, [user?.id]);

  // Update profile text fields
  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user?.id) return { error: 'Not authenticated' };
    const { error } = await supabase
      .from('tourplan_profiles')
      .upsert({ user_id: user.id, ...updates, updated_at: new Date().toISOString() });
    if (error) return { error: error.message };
    toast.success('Profile updated!');
    return { error: null };
  }, [user?.id]);

  // Upload avatar via Supabase Storage
  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    if (!user?.id) { toast.error('Not authenticated'); return null; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return null; }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;

      // Remove old avatar first
      await supabase.storage.from('avatars').remove([path]);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      // Save URL to profile
      await supabase
        .from('tourplan_profiles')
        .upsert({ user_id: user.id, avatar_url: publicUrl, updated_at: new Date().toISOString() });

      toast.success('Profile picture updated!');
      return publicUrl;
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
      return null;
    } finally {
      setUploading(false);
    }
  }, [user?.id]);

  return { getProfile, updateProfile, uploadAvatar, uploading };
}
