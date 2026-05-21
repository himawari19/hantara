import { create } from "zustand";
import { getSupabase } from "@/lib/supabase/client";
import { localSignIn, localSignUp, localGetSession, localSignOut, LocalUser } from "@/lib/local-auth";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  localUser: LocalUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLocalMode: boolean;

  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signInWithGithub: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  localUser: null,
  isLoading: true,
  isAuthenticated: false,
  isLocalMode: false,

  initialize: async () => {
    const supabase = getSupabase();

    if (!supabase) {
      // No Supabase — use local auth
      const localUser = localGetSession();
      set({
        localUser,
        isAuthenticated: !!localUser,
        isLocalMode: true,
        isLoading: false,
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({
        user: session?.user ?? null,
        isAuthenticated: !!session?.user,
        isLocalMode: false,
        isLoading: false,
      });

      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          user: session?.user ?? null,
          isAuthenticated: !!session?.user,
        });
      });
    } catch {
      // Fallback to local auth
      const localUser = localGetSession();
      set({
        localUser,
        isAuthenticated: !!localUser,
        isLocalMode: true,
        isLoading: false,
      });
    }
  },

  signInWithEmail: async (email, password) => {
    const supabase = getSupabase();

    if (!supabase) {
      // Local auth
      const { user, error } = localSignIn(email, password);
      if (user) {
        set({ localUser: user, isAuthenticated: true, isLocalMode: true });
      }
      return { error };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      const { data: { session } } = await supabase.auth.getSession();
      set({ user: session?.user ?? null, isAuthenticated: true });
    }
    return { error: error?.message ?? null };
  },

  signUpWithEmail: async (email, password, name) => {
    const supabase = getSupabase();

    if (!supabase) {
      // Local auth
      const { user, error } = localSignUp(email, password, name);
      if (user) {
        set({ localUser: user, isAuthenticated: true, isLocalMode: true });
      }
      return { error };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error?.message ?? null };
  },

  signInWithGithub: async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  },

  signInWithGoogle: async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  },

  signOut: async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    localSignOut();
    set({ user: null, localUser: null, isAuthenticated: false });
  },
}));
