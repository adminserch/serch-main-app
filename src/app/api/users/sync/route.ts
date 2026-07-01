import { supabaseAdmin } from '@/lib/supabase';
import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rate-limiter';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Limit: 30 sync requests per minute (60000ms)
    const limited = await isRateLimited(`users:sync:user:${userId}`, 30, 60000);
    if (limited) {
      return NextResponse.json(
        { error: 'Too many synchronization requests. Please slow down.' },
        { status: 429 }
      );
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found in Clerk' }, { status: 404 });
    }

    const email = user.emailAddresses[0]?.emailAddress;
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || email || 'Serch User';
    const avatarUrl = user.imageUrl;
    const phone = user.phoneNumbers[0]?.phoneNumber || null;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user already exists by clerk_user_id OR email
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .or(`clerk_user_id.eq.${userId},email.eq.${email}`)
      .maybeSingle();

    let data, error;

    if (existingUser) {
      // User exists, update profile details and ensure clerk_user_id is linked
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          clerk_user_id: userId,
          email,
          full_name: fullName,
          avatar_url: avatarUrl,
          phone
        })
        .eq('id', existingUser.id)
        .select('id, role')
        .single();
      data = updated;
      error = updateError;
    } else {
      // User does not exist, insert with default role 'seeker'
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          clerk_user_id: userId,
          email,
          full_name: fullName,
          avatar_url: avatarUrl,
          phone,
          role: 'seeker'
        })
        .select('id, role')
        .single();
      data = inserted;
      error = insertError;
    }

    if (error) {
      console.error('Error syncing user via API:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let providerStatus = null;
    if (data) {
      const { data: providerData } = await supabaseAdmin
        .from('providers')
        .select('status')
        .eq('user_id', data.id)
        .maybeSingle();
      if (providerData) {
        providerStatus = providerData.status;
      }
    }

    return NextResponse.json({ 
      success: true, 
      user: { 
        ...data, 
        providerStatus 
      } 
    });
  } catch (err: any) {
    console.error('User sync API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
