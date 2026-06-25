import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

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

export async function GET() {
  try {
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
