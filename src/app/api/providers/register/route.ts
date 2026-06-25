import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  let providerIdToClean: string | null = null;
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
      serviceImageUrl,
      businessPermitUrl
    } = await req.json();

    const parsedPrice = Number(servicePrice);
    const parsedDuration = Number(serviceDuration);

    if (
      !businessName ||
      !city ||
      !serviceName ||
      isNaN(parsedPrice) ||
      parsedPrice < 0 ||
      isNaN(parsedDuration) ||
      parsedDuration <= 0 ||
      !serviceCategoryId
    ) {
      return NextResponse.json({ error: 'Missing or invalid required business or service fields' }, { status: 400 });
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
        business_permit_url: businessPermitUrl || 'https://supabase-storage-url.com/permits/dummy.pdf',
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
    
    providerIdToClean = provider.id;

    // Create service
    let finalCategoryId = serviceCategoryId;
    const isFallbackId = finalCategoryId && /^([1-7])\1{7}/.test(finalCategoryId);
    if (!finalCategoryId || isFallbackId) {
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

    // Success - disable rollback cleanup
    providerIdToClean = null;

    // Mock send notification
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const notificationUrl = `${baseUrl}/api/notifications/send`;
      await fetch(notificationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: provider.id, type: 'provider_registered' }),
      });
    } catch (err) {
      console.warn('Failed to send registration notification:', err);
    }

    return NextResponse.json({ success: true, providerId: provider.id });
  } catch (err: unknown) {
    console.error('Registration error:', err);
    if (providerIdToClean) {
      console.log('Rolling back provider creation for provider ID:', providerIdToClean);
      try {
        await supabaseAdmin
          .from('providers')
          .delete()
          .eq('id', providerIdToClean);
      } catch (rollbackErr) {
        console.error('Failed to rollback provider creation:', rollbackErr);
      }
    }
    const message = err instanceof Error ? err.message : 'Unknown registration error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
