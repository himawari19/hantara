import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Only create client if credentials are available
let supabase: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!supabase) {
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return supabase;
}

// Export for backward compatibility - will be null if not configured
export { supabase };
