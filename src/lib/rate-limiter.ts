import { supabaseAdmin } from './supabase';

/**
 * Bounded rate limiter backed by Supabase postgres database.
 * Auto-cleans expired entries to prevent unchecked growth.
 */
export async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  
  try {
    const { data, error } = await supabaseAdmin.rpc('increment_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
      p_now: now
    });

    if (error) {
      console.error('Rate limiter database error (rpc):', error);
      return true; // Fail closed: deny request when database is unavailable
    }

    return !!data;
  } catch (error) {
    console.error('Unhandled rate limiter error:', error);
    return true; // Fail closed: deny request on unhandled exception
  }
}
