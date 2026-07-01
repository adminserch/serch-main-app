import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rate-limiter';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Limit: 15 requests per minute (60000ms)
    const limited = await isRateLimited(`admin:permit-url:user:${userId}`, 15, 60000);
    if (limited) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      );
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

    let bucket = 'documents';
    let fileKey = path;
    let isExternalUrl = false;

    if (path.startsWith('http') || path.startsWith('https')) {
      try {
        const parsedUrl = new URL(path);
        const pathname = parsedUrl.pathname;
        if (pathname.includes('/public/permits/')) {
          bucket = 'permits';
          fileKey = pathname.split('/public/permits/')[1];
        } else if (pathname.includes('/public/documents/')) {
          bucket = 'documents';
          fileKey = pathname.split('/public/documents/')[1];
        } else if (pathname.includes('/permits/')) {
          bucket = 'permits';
          fileKey = pathname.split('/permits/')[1];
        } else if (pathname.includes('/documents/')) {
          bucket = 'documents';
          fileKey = pathname.split('/documents/')[1];
        } else {
          isExternalUrl = true;
        }
      } catch {
        isExternalUrl = true;
      }
    } else if (path.startsWith('permits/')) {
      bucket = 'permits';
      fileKey = path.substring(8);
    } else if (path.startsWith('documents/')) {
      bucket = 'documents';
      fileKey = path.substring(10);
    }

    if (!isExternalUrl) {
      fileKey = fileKey.split('?')[0].split('#')[0];
    }

    if (isExternalUrl) {
      return NextResponse.json({ signedUrl: path });
    }

    // Generate a short-lived signed URL (e.g., 60 seconds)
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(fileKey, 60);

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to generate signed URL' }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Error generating signed URL:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
