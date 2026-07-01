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

// Helper to verify role is either provider or admin
async function verifyAuthorized() {
  const { userId } = await auth();
  if (!userId) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  const { data: userData, error } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('clerk_user_id', userId)
    .single();

  if (error || !userData) {
    return { authorized: false, error: 'User not found', status: 404 };
  }

  if (userData.role !== 'provider' && userData.role !== 'admin') {
    return { authorized: false, error: 'Forbidden', status: 403 };
  }

  return { authorized: true, role: userData.role };
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    const ip = getClientIp(req);
    const rateLimitKey = userId ? `categories:get:user:${userId}` : `categories:get:ip:${ip}`;
    const limited = await isRateLimited(rateLimitKey, 100, 60000);
    if (limited) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    const authStatus = await verifyAuthorized();
    if (!authStatus.authorized) {
      return NextResponse.json({ error: authStatus.error }, { status: authStatus.status });
    }

    // Providers/Admins should see all categories (even inactive ones, or we can list all)
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, categories: data });
  } catch (err: any) {
    console.error('Fetch categories error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (userId) {
      const limited = await isRateLimited(`categories:write:user:${userId}`, 10, 60000);
      if (limited) {
        return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
      }
    } else {
      const ip = getClientIp(req);
      const limited = await isRateLimited(`categories:write:ip:${ip}`, 10, 60000);
      if (limited) {
        return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
      }
    }

    const authStatus = await verifyAuthorized();
    if (!authStatus.authorized) {
      return NextResponse.json({ error: authStatus.error }, { status: authStatus.status });
    }

    const { name, slug, icon, is_active } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and Slug are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert({
        name,
        slug: slug.toLowerCase().replace(/\s+/g, '-'),
        icon: icon || 'sparkles',
        is_active: is_active !== undefined ? is_active : true
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, category: data });
  } catch (err: any) {
    console.error('Create category error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (userId) {
      const limited = await isRateLimited(`categories:write:user:${userId}`, 10, 60000);
      if (limited) {
        return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
      }
    } else {
      const ip = getClientIp(req);
      const limited = await isRateLimited(`categories:write:ip:${ip}`, 10, 60000);
      if (limited) {
        return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
      }
    }

    const authStatus = await verifyAuthorized();
    if (!authStatus.authorized) {
      return NextResponse.json({ error: authStatus.error }, { status: authStatus.status });
    }

    const { id, name, slug, icon, is_active } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug.toLowerCase().replace(/\s+/g, '-');
    if (icon !== undefined) updateData.icon = icon;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, category: data });
  } catch (err: any) {
    console.error('Update category error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (userId) {
      const limited = await isRateLimited(`categories:write:user:${userId}`, 10, 60000);
      if (limited) {
        return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
      }
    } else {
      const ip = getClientIp(req);
      const limited = await isRateLimited(`categories:write:ip:${ip}`, 10, 60000);
      if (limited) {
        return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
      }
    }

    const authStatus = await verifyAuthorized();
    if (!authStatus.authorized) {
      return NextResponse.json({ error: authStatus.error }, { status: authStatus.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete category error:', err);
    
    let errorMessage = err.message || 'An unexpected error occurred.';
    if (err.code === '23503' || (err.message && err.message.toLowerCase().includes('foreign key constraint'))) {
      if (err.message.includes('services_category_id_fkey') || err.message.includes('categories')) {
        errorMessage = 'This category cannot be deleted because it is currently linked to one or more active services. Please delete or reassign those services first, or mark this category as inactive.';
      } else {
        errorMessage = 'This item cannot be deleted or updated because it is currently referenced by other records in the database.';
      }
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
