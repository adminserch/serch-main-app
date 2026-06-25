import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from users table
    const { data: dbUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ error: 'User record not found in database.' }, { status: 404 });
    }

    const {
      businessName,
      description,
      logoUrl,
      categories,
      city,
      district,
      latitude,
      longitude,
      website,
      houseBuildingNumber,
      streetName,
      stateProvinceRegion,
      postalZipCode,
      country,
      serviceName,
      serviceDescription,
      servicePrice,
      serviceDuration,
      serviceCategoryId,
      serviceIsActive,
      serviceImageUrl
    } = await req.json();

    if (!businessName || !city) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create provider
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('providers')
      .insert({
        user_id: dbUser.id,
        business_name: businessName,
        description: description || '',
        logo_url: logoUrl || null,
        service_categories: categories || [],
        service_city: city,
        service_district: district || '',
        latitude: latitude || null,
        longitude: longitude || null,
        website: website || null,
        business_permit_url: 'https://supabase-storage-url.com/permits/dummy.pdf',
        status: 'pending',
        plan: 'free',
        house_building_number: houseBuildingNumber || null,
        street_name: streetName || null,
        state_province_region: stateProvinceRegion || null,
        postal_zip_code: postalZipCode || null,
        country: country || null,
      })
      .select('id')
      .single();

    if (providerError || !provider) {
      throw providerError || new Error('Provider creation failed.');
    }

    // Create service
    let finalCategoryId = serviceCategoryId;
    if (!finalCategoryId || finalCategoryId.startsWith('11111111') || finalCategoryId.startsWith('22222222')) {
      const { data: catData } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('is_active', true)
        .limit(1);
      if (catData && catData.length > 0) {
        finalCategoryId = catData[0].id;
      }
    }

    const { error: serviceError } = await supabaseAdmin
      .from('services')
      .insert({
        provider_id: provider.id,
        name: serviceName,
        description: serviceDescription || '',
        price: Number(servicePrice),
        duration_minutes: Number(serviceDuration),
        category_id: finalCategoryId || null,
        is_active: serviceIsActive !== undefined ? serviceIsActive : true,
        images: serviceImageUrl ? [serviceImageUrl] : []
      });

    if (serviceError) throw serviceError;

    // Update user role to provider
    const { error: roleError } = await supabaseAdmin
      .from('users')
      .update({ role: 'provider' })
      .eq('id', dbUser.id);

    if (roleError) throw roleError;

    // Mock send notification
    try {
      await fetch(`${req.headers.get('origin') || ''}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: provider.id, type: 'provider_registered' }),
      });
    } catch (err) {
      console.warn('Failed to send registration notification:', err);
    }

    return NextResponse.json({ success: true, providerId: provider.id });
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
