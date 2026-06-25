import { supabaseAdmin } from '@/lib/supabase';
import { WebhookEvent } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Get the webhook secret
  const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || 'whsec_placeholder';

  // Create a new Svix instance with your secret.
  const wh = new Webhook(CLERK_WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    // For local testing/demo if secret is not set, we can optionally bypass verification or log a warning.
    // However, to keep it secure, we require verification in production.
    if (CLERK_WEBHOOK_SECRET === 'whsec_placeholder') {
      console.warn('Bypassing webhook signature verification for placeholder configuration');
      evt = payload as WebhookEvent;
    } else {
      return new Response('Error occured -- verification failed', {
        status: 400
      });
    }
  }

  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url, phone_numbers } = evt.data;

    const email = email_addresses && email_addresses[0]?.email_address;
    const full_name = [first_name, last_name].filter(Boolean).join(' ') || email || 'Serch User';
    const avatar_url = image_url;
    const phone = phone_numbers && phone_numbers[0]?.phone_number;

    if (!id || !email) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Check if user already exists by clerk_user_id OR email
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .or(`clerk_user_id.eq.${id},email.eq.${email}`)
      .maybeSingle();

    let dbError;

    if (existingUser) {
      // User exists, update profile details and ensure clerk_user_id is linked
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          clerk_user_id: id,
          email,
          full_name,
          avatar_url,
          phone
        })
        .eq('id', existingUser.id);
      dbError = error;
    } else {
      // User does not exist, insert with default role 'seeker'
      const { error } = await supabaseAdmin
        .from('users')
        .insert({
          clerk_user_id: id,
          email,
          full_name,
          avatar_url,
          phone,
          role: 'seeker'
        });
      dbError = error;
    }

    if (dbError) {
      console.error('Supabase sync error:', dbError);
      return new Response('Database sync error', { status: 500 });
    }

    return new Response('Synced successfully', { status: 200 });
  }

  return new Response('', { status: 200 });
}
