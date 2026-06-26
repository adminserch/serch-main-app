import { supabaseAdmin } from './supabase';

/**
 * Bounded rate limiter backed by Supabase postgres database.
 * Auto-cleans expired entries to prevent unchecked growth.
 */
export async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  
  try {
    // 1. Clean up expired keys to prevent unchecked growth in a bounded manner
    await supabaseAdmin
      .from('rate_limits')
      .delete()
      .lt('reset_time', now);

    // 2. Fetch the current rate limit record for this key
    const { data: record, error: selectError } = await supabaseAdmin
      .from('rate_limits')
      .select('count, reset_time')
      .eq('key', key)
      .maybeSingle();

    if (selectError) {
      console.error('Rate limiter database error (select):', selectError);
      return false; // Fallback to allow request if DB has issues
    }

    if (!record) {
      // Create new record
      const { error: insertError } = await supabaseAdmin
        .from('rate_limits')
        .insert({
          key,
          count: 1,
          reset_time: now + windowMs
        });
      if (insertError) {
        console.error('Rate limiter database error (insert):', insertError);
      }
      return false;
    }

    if (now > record.reset_time) {
      // Reset window
      const { error: updateError } = await supabaseAdmin
        .from('rate_limits')
        .update({
          count: 1,
          reset_time: now + windowMs
        })
        .eq('key', key);
      if (updateError) {
        console.error('Rate limiter database error (reset update):', updateError);
      }
      return false;
    }

    const newCount = record.count + 1;
    const { error: updateError } = await supabaseAdmin
      .from('rate_limits')
      .update({
        count: newCount
      })
      .eq('key', key);
    
    if (updateError) {
      console.error('Rate limiter database error (increment update):', updateError);
    }

    return newCount > limit;
  } catch (error) {
    console.error('Unhandled rate limiter error:', error);
    return false; // Fallback: fail-open if database/network has issues
  }
}
