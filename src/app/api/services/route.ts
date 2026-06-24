import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

async function getProviderAndVerify() {
  const { userId } = await auth();
  if (!userId) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  const { data: userData, error: uError } = await supabaseAdmin
    .from('users')
    .select('id, role')
    .eq('clerk_user_id', userId)
    .single();

  if (uError || !userData) {
    return { authorized: false, error: 'User not found', status: 404 };
  }

  if (userData.role === 'admin') {
    return { authorized: true, isAdmin: true, userId: userData.id };
  }

  if (userData.role !== 'provider') {
    return { authorized: false, error: 'Forbidden', status: 403 };
  }

  // Get provider
  const { data: providerData, error: pError } = await supabaseAdmin
    .from('providers')
    .select('id')
    .eq('user_id', userData.id)
    .single();

  if (pError || !providerData) {
    return { authorized: false, error: 'Provider profile not found', status: 404 };
  }

  return { authorized: true, providerId: providerData.id, isAdmin: false, userId: userData.id };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const providerId = searchParams.get('providerId');
    if (!providerId) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    const authStatus = await getProviderAndVerify().catch(() => ({ authorized: false, isAdmin: false, providerId: null }));
    const isOwner = authStatus.authorized && authStatus.providerId === providerId;
    const isAdmin = authStatus.authorized && authStatus.isAdmin;

    let query = supabaseAdmin.from('services').select('*').eq('provider_id', providerId);

    // If not admin or owner, only fetch active services
    if (!isAdmin && !isOwner) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, services: data || [] });
  } catch (err: any) {
    console.error('Fetch services error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authStatus = await getProviderAndVerify();
    if (!authStatus.authorized) {
      return NextResponse.json({ error: authStatus.error }, { status: authStatus.status });
    }

    const { name, description, price, duration_minutes, category_id, is_active, images, provider_id } = await req.json();

    if (!name || !price || !duration_minutes || !category_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const providerId = authStatus.isAdmin ? provider_id : authStatus.providerId;
    if (!providerId) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('services')
      .insert({
        provider_id: providerId,
        name,
        description: description || '',
        price: Number(price),
        duration_minutes: Number(duration_minutes),
        category_id,
        is_active: is_active !== undefined ? is_active : true,
        images: images || []
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, service: data });
  } catch (err: any) {
    console.error('Create service error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


export async function PUT(req: Request) {
  try {
    const authStatus = await getProviderAndVerify();
    if (!authStatus.authorized) {
      return NextResponse.json({ error: authStatus.error }, { status: authStatus.status });
    }

    const { id, name, description, price, duration_minutes, category_id, is_active, images } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
    }

    // Verify ownership of the service
    if (!authStatus.isAdmin) {
      const { data: existingService, error: fetchErr } = await supabaseAdmin
        .from('services')
        .select('provider_id')
        .eq('id', id)
        .single();

      if (fetchErr || !existingService) {
        return NextResponse.json({ error: 'Service not found' }, { status: 404 });
      }

      if (existingService.provider_id !== authStatus.providerId) {
        return NextResponse.json({ error: 'Unauthorized operation on service' }, { status: 403 });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = Number(price);
    if (duration_minutes !== undefined) updateData.duration_minutes = Number(duration_minutes);
    if (category_id !== undefined) updateData.category_id = category_id;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (images !== undefined) updateData.images = images;

    const { data, error } = await supabaseAdmin
      .from('services')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, service: data });
  } catch (err: any) {
    console.error('Update service error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const authStatus = await getProviderAndVerify();
    if (!authStatus.authorized) {
      return NextResponse.json({ error: authStatus.error }, { status: authStatus.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
    }

    // Verify ownership of the service
    if (!authStatus.isAdmin) {
      const { data: existingService, error: fetchErr } = await supabaseAdmin
        .from('services')
        .select('provider_id')
        .eq('id', id)
        .single();

      if (fetchErr || !existingService) {
        return NextResponse.json({ error: 'Service not found' }, { status: 404 });
      }

      if (existingService.provider_id !== authStatus.providerId) {
        return NextResponse.json({ error: 'Unauthorized operation on service' }, { status: 403 });
      }
    }

    const { error } = await supabaseAdmin
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete service error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
