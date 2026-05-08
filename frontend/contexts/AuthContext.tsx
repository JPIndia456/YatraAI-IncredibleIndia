'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useTripStore, useTripPlannerStore, useTourGuideStore, useAIBrainStore } from '@/lib/store';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sendPhoneOtp: (phone: string) => Promise<{ error: string | null }>;
  verifyPhoneOtp: (phone: string, otp: string) => Promise<{ error: string | null }>;
  sendEmailOtp: (email: string) => Promise<{ error: string | null }>;
  verifyEmailOtp: (email: string, otp: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  sendPhoneOtp: async () => ({ error: null }),
  verifyPhoneOtp: async () => ({ error: null }),
  sendEmailOtp: async () => ({ error: null }),
  verifyEmailOtp: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const lastSyncedSessionTokenRef = useRef<string | null>(null);

  const updateState = useCallback((session: Session | null) => {
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);
  }, []);

  const syncUserChannels = useCallback(async (activeSession: Session | null) => {
    if (!activeSession?.access_token) return;
    // Lock the sync before starting the request to prevent double calls from StrictMode or race conditions
    lastSyncedSessionTokenRef.current = activeSession.access_token;

    try {
      const response = await fetch('/api/auth/sync-channel', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeSession.access_token}`,
        },
      });

      if (!response.ok) {
        // Reset ref on failure to allow retry
        lastSyncedSessionTokenRef.current = null;
        const payload = await response.json().catch(() => ({}));
        console.warn('[Auth] Channel sync skipped:', payload?.error || response.statusText);
      }
    } catch (error) {
      lastSyncedSessionTokenRef.current = null;
      console.warn('[Auth] Channel sync request failed:', error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        updateState(session);
        syncUserChannels(session);
      }
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        console.log(`[Auth] Event: ${event}`);
        updateState(session);
        if (event === 'SIGNED_IN') {
          syncUserChannels(session);
        }
        
        // Refresh the page data when auth state changes to ensure server components are in sync
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          router.refresh();
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [updateState, router, syncUserChannels]);

  // Phone OTP
  const sendPhoneOtp = async (phone: string) => {
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    const { error } = await supabase.auth.signInWithOtp({ 
      phone: formattedPhone,
      options: { channel: 'sms' }
    });
    if (error) console.error('[Auth] Phone OTP Error:', error);
    return { error: error?.message ?? null };
  };

  const verifyPhoneOtp = async (phone: string, token: string) => {
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    const { error } = await supabase.auth.verifyOtp({ phone: formattedPhone, token, type: 'sms' });
    return { error: error?.message ?? null };
  };

  // Email OTP
  const sendEmailOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { 
        shouldCreateUser: true,
        emailRedirectTo:
          typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback?next=/planner`
            : undefined,
      },
    });
    if (error) console.error('[Auth] Email OTP Error:', error);
    return { error: error?.message ?? null };
  };

  const verifyEmailOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    return { error: error?.message ?? null };
  };


  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      
      // ── Clean State Policy: Reset all global stores on sign out ──
      useTripStore.getState().resetTrip();
      useTripPlannerStore.getState().clearPlan();
      useTourGuideStore.getState().resetTourGuide();
      useAIBrainStore.getState().clearHistory();
      useAIBrainStore.getState().setOpen(false);
      
      localStorage.removeItem('yatraUser');
      router.push('/');
    } catch (err) {
      console.error('[Auth] SignOut Error:', err);
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      sendPhoneOtp, verifyPhoneOtp,
      sendEmailOtp, verifyEmailOtp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

