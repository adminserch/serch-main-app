import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';

// Simple regex for email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const { email } = body;

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Insert into Supabase using supabaseAdmin to bypass RLS safely
    const { error: dbError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .insert([{ email: cleanEmail }]);

    if (dbError) {
      // Postgres unique_violation error code is '23505'
      if (dbError.code === '23505') {
        return NextResponse.json(
          { error: 'You are already subscribed!' },
          { status: 400 }
        );
      }
      console.error('Database insertion error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save subscription. Please try again.' },
        { status: 500 }
      );
    }

    // Try sending onboarding email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const origin = new URL(request.url).origin;
        const unsubscribeUrl = `${origin}/api/newsletter/unsubscribe?email=${encodeURIComponent(cleanEmail)}`;
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: 'Newsletter <no-reply@useserch.com>',
          to: [cleanEmail],
          subject: 'Welcome to the Serch Newsletter!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #0F172A; margin-bottom: 16px;">Welcome to Serch!</h2>
              <p style="color: #334155; font-size: 16px; line-height: 1.5;">Thank you for subscribing to our newsletter. You'll now receive the latest service updates and local deals directly in your inbox.</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="color: #64748B; font-size: 12px; margin-bottom: 8px;">If you did not sign up for this newsletter, you can safely ignore this email.</p>
              <p style="color: #64748B; font-size: 12px;">Want to stop receiving these emails? <a href="${unsubscribeUrl}" style="color: #0D9488; text-decoration: underline;">Unsubscribe here</a>.</p>
            </div>
          `
        });
      } catch (resendError) {
        console.error('Resend email delivery failed:', resendError);
        // Do not fail the user's primary database-confirmed subscription experience.
      }
    } else {
      console.warn('RESEND_API_KEY is not defined. Skipping email dispatch.');
    }

    return NextResponse.json(
      { message: 'Successfully subscribed to the newsletter!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unhandled error in newsletter subscription route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
