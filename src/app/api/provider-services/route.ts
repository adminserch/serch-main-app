import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId } = await auth();
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
