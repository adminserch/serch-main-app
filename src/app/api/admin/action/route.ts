import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('clerk_user_id', userId)
      .single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action, payload } = await req.json();

    if (action === 'update_status') {
      const { providerId, status } = payload;
      const { error } = await supabaseAdmin
        .from('providers')
        .update({ status })
        .eq('id', providerId);

      if (error) throw error;

      // Sync user role based on provider status
      const { data: providerData, error: providerFetchError } = await supabaseAdmin
        .from('providers')
        .select('user_id')
        .eq('id', providerId)
        .single();
        
      if (providerFetchError) throw providerFetchError;
        
      if (providerData) {
        const targetRole = status === 'approved' ? 'provider' : 'seeker';
        const { error: userUpdateError } = await supabaseAdmin
          .from('users')
          .update({ role: targetRole })
          .eq('id', providerData.user_id);
          
        if (userUpdateError) throw userUpdateError;
      }

      // Sync trigger for notification email mock
      await fetch(`${new URL(req.url).origin}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, type: `provider_${status}` }),
      }).catch(err => console.error('Notification error:', err));

    } else if (action === 'toggle_verified') {
      if (!payload || typeof payload !== 'object') {
        return NextResponse.json({ error: 'Missing providerId' }, { status: 400 });
      }
      const { providerId } = payload;
      if (!providerId) {
        return NextResponse.json({ error: 'Missing providerId' }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .rpc('toggle_provider_verified', { provider_uuid: providerId });

      if (error) throw error;

      if (data === null) {
        return NextResponse.json({ error: `Provider not found: ${providerId}` }, { status: 404 });
      }

      if (typeof data !== 'boolean') {
        return NextResponse.json({ error: 'Invalid verification result' }, { status: 500 });
      }

      return NextResponse.json({ success: true, is_verified: data });

    } else if (action === 'add_category') {
      const { name, slug, icon, is_active } = payload;
      const { error } = await supabaseAdmin
        .from('categories')
        .insert({
          name,
          slug: slug.toLowerCase().replace(/\s+/g, '-'),
          icon: icon || null,
          is_active: is_active !== undefined ? is_active : true
        });

      if (error) throw error;

    } else if (action === 'update_category') {
      const { categoryId, name, slug, icon, is_active } = payload;
      if (!categoryId) {
        return NextResponse.json({ error: 'Missing categoryId' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('categories')
        .update({
          name,
          slug: slug.toLowerCase().replace(/\s+/g, '-'),
          icon: icon || null,
          is_active: is_active !== undefined ? is_active : true
        })
        .eq('id', categoryId);

      if (error) throw error;

    } else if (action === 'delete_category') {
      const { categoryId } = payload;
      if (!categoryId) {
        return NextResponse.json({ error: 'Missing categoryId' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

    } else if (action === 'delete_review') {
      const { reviewId } = payload;
      const { error } = await supabaseAdmin
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

    } else if (action === 'create_provider') {
      const {
        email,
        full_name,
        business_name,
        description,
        service_city,
        service_district,
        latitude,
        longitude,
        website,
        logo_url,
        is_verified,
        status,
        service_categories
      } = payload;

      if (!email || !full_name || !business_name) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Check if user already exists
      let { data: userRecord } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      let targetUserId = userRecord?.id;

      if (!targetUserId) {
        const mockClerkId = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const { data: newUser, error: userCreateError } = await supabaseAdmin
          .from('users')
          .insert({
            email,
            full_name,
            clerk_user_id: mockClerkId,
            role: 'provider'
          })
          .select('id')
          .single();

        if (userCreateError) throw userCreateError;
        targetUserId = newUser.id;
      } else {
        const { error: roleUpdateError } = await supabaseAdmin
          .from('users')
          .update({ role: 'provider' })
          .eq('id', targetUserId);

        if (roleUpdateError) throw roleUpdateError;
      }

      // Check if provider profile already exists for this user
      const { data: existingProvider } = await supabaseAdmin
        .from('providers')
        .select('id')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (existingProvider) {
        return NextResponse.json({ error: 'Provider profile already exists for this user email' }, { status: 400 });
      }

      // Insert provider
      const { data: newProvider, error: providerInsertError } = await supabaseAdmin
        .from('providers')
        .insert({
          user_id: targetUserId,
          business_name,
          description: description || '',
          service_city: service_city || '',
          service_district: service_district || '',
          latitude: latitude || null,
          longitude: longitude || null,
          website: website || '',
          logo_url: logo_url || null,
          is_verified: !!is_verified,
          status: status || 'pending',
          service_categories: service_categories || []
        })
        .select('id')
        .single();

      if (providerInsertError) throw providerInsertError;

      // Insert default settings
      const { error: settingsError } = await supabaseAdmin
        .from('provider_settings')
        .insert({
          provider_id: newProvider.id,
          slot_interval_minutes: 30,
          booking_notice_hours: 2
        });

      if (settingsError) throw settingsError;

    } else if (action === 'update_provider') {
      const {
        providerId,
        business_name,
        description,
        service_city,
        service_district,
        latitude,
        longitude,
        website,
        logo_url,
        is_verified,
        status,
        service_categories,
        house_building_number,
        street_name,
        state_province_region,
        postal_zip_code,
        country
      } = payload;

      if (!providerId) {
        return NextResponse.json({ error: 'Missing providerId' }, { status: 400 });
      }

      const { error: updateError } = await supabaseAdmin
        .from('providers')
        .update({
          business_name,
          description,
          service_city,
          service_district,
          latitude: latitude !== undefined ? latitude : null,
          longitude: longitude !== undefined ? longitude : null,
          website,
          logo_url,
          is_verified,
          status,
          service_categories,
          house_building_number,
          street_name,
          state_province_region,
          postal_zip_code,
          country
        })
        .eq('id', providerId);

      if (updateError) throw updateError;

    } else if (action === 'delete_provider') {
      const { providerId } = payload;

      if (!providerId) {
        return NextResponse.json({ error: 'Missing providerId' }, { status: 400 });
      }

      // Get user_id of provider to revert their role to seeker
      const { data: providerData } = await supabaseAdmin
        .from('providers')
        .select('user_id')
        .eq('id', providerId)
        .maybeSingle();

      if (providerData) {
        await supabaseAdmin
          .from('users')
          .update({ role: 'seeker' })
          .eq('id', providerData.user_id);
      }

      const { error: deleteError } = await supabaseAdmin
        .from('providers')
        .delete()
        .eq('id', providerId);

      if (deleteError) throw deleteError;

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Admin action execution error:', err);
    
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
