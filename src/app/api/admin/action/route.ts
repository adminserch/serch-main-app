import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

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

      // Sync trigger for notification email mock
      await fetch(`${new URL(req.url).origin}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, type: `provider_${status}` }),
      }).catch(err => console.error('Notification error:', err));

    } else if (action === 'toggle_verified') {
      const { providerId, currentVerified } = payload;
      const { error } = await supabaseAdmin
        .from('providers')
        .update({ is_verified: !currentVerified })
        .eq('id', providerId);

      if (error) throw error;

    } else if (action === 'add_category') {
      const { name, slug } = payload;
      const { error } = await supabaseAdmin
        .from('categories')
        .insert({ name, slug, is_active: true });

      if (error) throw error;

    } else if (action === 'delete_review') {
      const { reviewId } = payload;
      const { error } = await supabaseAdmin
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Admin action execution error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
