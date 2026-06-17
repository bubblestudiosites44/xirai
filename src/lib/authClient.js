import { createClient } from "@supabase/supabase-js";

const authProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "hbbtegiecallsiajrunj";
const authUrl = import.meta.env.VITE_SUPABASE_URL || `https://${authProjectId}.supabase.co`;
const authAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiYnRlZ2llY2FsbHNpYWpydW5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTEzOTAsImV4cCI6MjA2NzIyNzM5MH0.COj1AuZKSAtTjyghMYoPWfzvF2074tI6iAt2Usnj6JM";

export const authClient = createClient(authUrl, authAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export { authAnonKey, authProjectId, authUrl };
