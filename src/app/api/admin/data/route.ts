import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role on the server
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('clerk_user_id', userId)
      .single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Load Stats
    const { count: uCount } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true });
    const { count: pCount } = await supabaseAdmin.from('providers').select('*', { count: 'exact', head: true });
    const { count: bCount } = await supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true });

    // Load Providers
    const { data: pData } = await supabaseAdmin
      .from('providers')
      .select('id, business_name, description, service_city, service_district, latitude, longitude, website, business_permit_url, is_verified, status')
      .order('status', { ascending: false });

    // Load Categories
    const { data: cData } = await supabaseAdmin
      .from('categories')
      .select('id, name, slug, icon')
      .eq('is_active', true);

    // Load Reviews
    const { data: rData } = await supabaseAdmin
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        providers ( business_name ),
        users ( full_name )
      `);

    return NextResponse.json({
      success: true,
      stats: {
        usersCount: uCount || 0,
        providersCount: pCount || 0,
        bookingsCount: bCount || 0
      },
      providers: pData || [],
      categories: cData || [],
      reviews: rData || []
    });
  } catch (err: any) {
    console.error('Admin data fetch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
