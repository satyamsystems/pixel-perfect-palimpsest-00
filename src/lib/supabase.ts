import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Read environment variables
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes("<YOUR-PROJECT-ID>") &&
      !supabaseAnonKey.includes("<YOUR-ANON-PUBLIC-KEY>") &&
      !supabaseAnonKey.includes("PASTE_MY_") &&
      supabaseUrl.startsWith("http"),
  );
};

// Create the Supabase client
// When unconfigured, provide a fallback instance to avoid runtime crash on import
export const supabase: SupabaseClient = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createClient(
      "https://placeholder-project.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );

export default supabase;
