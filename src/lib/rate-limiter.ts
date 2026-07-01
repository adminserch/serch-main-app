import { NextResponse } from 'next/server';
import { supabaseAdmin } from './supabase';

/**
 * Derives the client IP securely, prioritizing x-real-ip and the last entry of x-forwarded-for
 * to prevent header spoofing from the client side.
 */
export function getClientIp(req: Request): string {
  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',');
    const clientIp = ips[ips.length - 1].trim();
    if (clientIp) return clientIp;
  }

  return '127.0.0.1';
}

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
      // Fail open: allow request when database is unavailable
      console.error(`Rate limiter RPC error for key ${key}:`, error);
      return false;
    }

    return !!data;
  } catch (error) {
    // Fail open: allow request on unhandled exception
    console.error(`Rate limiter exception for key ${key}:`, error);
    return false;
  }
}

/**
 * Centralized rate limit enforcer. Returns a 429 NextResponse if rate limited, or null if allowed.
 */
export async function enforceRateLimit(
  req: Request,
  resource: string,
  userId: string | null,
  limit: number,
  windowMs: number
): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const rateLimitKey = userId ? `${resource}:user:${userId}` : `${resource}:ip:${ip}`;
  const limited = await isRateLimited(rateLimitKey, limit, windowMs);
  if (limited) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
  }
  return null;
}

