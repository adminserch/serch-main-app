import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'Missing document path' }, { status: 400 });
    }

    // Generate a short-lived signed URL (e.g., 60 seconds)
    const { data, error } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(path, 60);

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to generate signed URL' }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (err: any) {
    console.error('Error generating signed URL:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
