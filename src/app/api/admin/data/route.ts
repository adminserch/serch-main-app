import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rate-limiter';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Limit: 20 requests per minute (60000ms)
    const limited = await isRateLimited(`admin:data:user:${userId}`, 20, 60000);
    if (limited) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      );
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
      .select('id, business_name, description, service_city, service_district, latitude, longitude, website, business_permit_url, is_verified, status, logo_url, service_categories, house_building_number, street_name, state_province_region, postal_zip_code, country')
      .order('status', { ascending: false });

    // Load Categories
    const { data: cData } = await supabaseAdmin
      .from('categories')
      .select('id, name, slug, icon, is_active')
      .order('name', { ascending: true });

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
