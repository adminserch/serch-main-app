import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rate-limiter';

function getClientIp(req: Request): string {
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',');
    const clientIp = ips[0].trim();
    if (clientIp) return clientIp;
  }
  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();
  return '127.0.0.1';
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    const ip = getClientIp(req);
    const rateLimitKey = userId ? `provider-services:get:user:${userId}` : `provider-services:get:ip:${ip}`;
    
    const limited = await isRateLimited(rateLimitKey, 60, 60000);
    if (limited) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      );
    }
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('provider_services')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, services: data });
  } catch (err: any) {
    console.error('Fetch provider services error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
