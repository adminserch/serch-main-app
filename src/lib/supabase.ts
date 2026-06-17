import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') && 
  !supabaseAnonKey.includes('placeholder');

// Helper to build a chainable, thenable proxy for mock Supabase client
const makeMockQueryBuilder = (clientName: string) => {
  const queryProxy: any = new Proxy({} as any, {
    get(target, prop) {
      if (prop === 'then') {
        // Allow the chain to be awaited directly like a Promise
        return (resolve: any) => resolve({ data: null, error: null });
      }
      // Return a function that continues returning the same proxy to allow chaining
      return () => queryProxy;
    }
  });
  return queryProxy;
};

// Base public client
export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as any, {
      get(target, prop) {
        console.warn(`Supabase client called but credentials are not configured. Property accessed: ${String(prop)}`);
        return () => makeMockQueryBuilder('supabase');
      }
    });

// Admin client bypassing RLS for system operations
export const supabaseAdmin = (isConfigured && supabaseServiceKey && !supabaseServiceKey.includes('placeholder'))
  ? createClient(supabaseUrl, supabaseServiceKey)
  : new Proxy({} as any, {
      get(target, prop) {
        console.warn(`Supabase admin client called but credentials are not configured. Property accessed: ${String(prop)}`);
        return () => makeMockQueryBuilder('supabaseAdmin');
      }
    });

/**
 * Creates an authenticated Supabase client using the Clerk JWT token.
 * This sets the Authorization header with the Clerk token so that
 * Supabase RLS policies can authenticate the user role and clerk_user_id.
 */
const useClerkJwt = process.env.NEXT_PUBLIC_USE_CLERK_JWT === 'true';

export function getSupabaseClient(clerkToken?: string | null) {
  if (!isConfigured) {
    return supabase;
  }
  if (!clerkToken || !useClerkJwt) {
    return supabase;
  }
  
  // If we have detected that the Clerk-Supabase JWT integration is not configured in the dashboard,
  // bypass sending the Clerk token to completely avoid 401 console errors.
  if (typeof window !== 'undefined' && sessionStorage.getItem('serch_jwt_bypass') === 'true') {
    return supabase;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
    },
  });
}
