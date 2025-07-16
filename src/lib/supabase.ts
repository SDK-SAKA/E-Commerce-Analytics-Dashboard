import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    // Prevent multiple refresh attempts that can cause corruption
    debug: false,
    // Use a consistent storage key
    storageKey: 'sb-auth-token',
    // Disable automatic token refresh on focus to prevent conflicts
    autoRefreshToken: false
  }
});

// Manual token refresh with proper error handling
let refreshPromise: Promise<any> | null = null;

export const refreshSession = async () => {
  // Prevent multiple simultaneous refresh attempts
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = supabase.auth.refreshSession();
  
  try {
    const result = await refreshPromise;
    return result;
  } catch (error) {
    console.error('Session refresh failed:', error);
    throw error;
  } finally {
    refreshPromise = null;
  }
};

// Set up periodic token refresh (every 50 minutes)
setInterval(async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await refreshSession();
    }
  } catch (error) {
    console.error('Periodic refresh failed:', error);
  }
}, 50 * 60 * 1000); // 50 minutes