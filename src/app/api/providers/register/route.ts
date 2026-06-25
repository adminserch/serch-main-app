import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  let providerIdToClean: string | null = null;
  let originalRole: string | null = null;
  let userIdToRestore: string | null = null;
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from users table
    const { data: dbUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ error: 'User record not found in database.' }, { status: 404 });
    }

    originalRole = dbUser.role;
    userIdToRestore = dbUser.id;

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
      !serviceCategoryId ||
      !businessPermitUrl ||
      !businessPermitUrl.trim()
    ) {
      return NextResponse.json({ error: 'Missing or invalid required business, service fields, or business permit URL' }, { status: 400 });
    }

    if (!businessPermitUrl.startsWith(`${dbUser.id}/`)) {
      return NextResponse.json({ error: 'Invalid business permit storage path prefix' }, { status: 400 });
    }

    const lowercasePermitUrl = businessPermitUrl.toLowerCase();
    const isPdf = lowercasePermitUrl.endsWith('.pdf');
    const isPermitPath = lowercasePermitUrl.includes('/permit-');
    if (!isPdf || !isPermitPath) {
      return NextResponse.json({ error: 'Invalid business permit path or file type. Only PDF permit documents are allowed.' }, { status: 400 });
    }

    // Convert storage path key to public URL
    const { data: permitUrlData } = supabaseAdmin.storage
      .from('permits')
      .getPublicUrl(businessPermitUrl);
    const resolvedPermitUrl = permitUrlData.publicUrl;


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
        business_permit_url: resolvedPermitUrl,
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

    // Mock send notification with a timeout
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const notificationUrl = `${baseUrl}/api/notifications/send`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    try {
      const res = await fetch(notificationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: provider.id, type: 'provider_registered' }),
        signal: controller.signal
      });
      if (!res.ok) {
        console.warn('Registration notification response not OK:', res.status);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('Registration notification request timed out.');
      } else {
        console.warn('Failed to send registration notification:', err);
      }
    } finally {
      clearTimeout(timeoutId);
    }

    return NextResponse.json({ success: true, providerId: provider.id });
  } catch (err: unknown) {
    console.error('Registration error:', err);
    if (providerIdToClean) {
      try {
        // Delete services associated with this provider first due to FK constraints
        const { error: serviceDelError } = await supabaseAdmin
          .from('services')
          .delete()
          .eq('provider_id', providerIdToClean);
        if (serviceDelError) {
          console.error('Rollback failed to delete services:', serviceDelError);
          throw serviceDelError;
        }

        // Delete provider row
        const { error: providerDelError } = await supabaseAdmin
          .from('providers')
          .delete()
          .eq('id', providerIdToClean);
        if (providerDelError) {
          console.error('Rollback failed to delete provider:', providerDelError);
          throw providerDelError;
        }

        // Restore original user role
        if (userIdToRestore && originalRole) {
          const { error: roleRestoreError } = await supabaseAdmin
            .from('users')
            .update({ role: originalRole })
            .eq('id', userIdToRestore);
          if (roleRestoreError) {
            console.error('Rollback failed to restore user role:', roleRestoreError);
            throw roleRestoreError;
          }
        }
      } catch (rollbackErr) {
        console.error('Failed to rollback registration data:', rollbackErr);
        // Log failure but do not rethrow to keep standard json error response intact
      }
    }
    const message = err instanceof Error ? err.message : 'Unknown registration error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
