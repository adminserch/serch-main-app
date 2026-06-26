import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';
import { signToken } from '@/lib/token';

// Simple regex for email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple in-memory rate limiting map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }

  record.count++;
  if (record.count > limit) {
    return true;
  }
  return false;
}

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

    // Rate limiting check
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown-ip';
    if (isRateLimited(`ip:${ip}`, 5, 600000) || isRateLimited(`email:${cleanEmail}`, 5, 600000)) {
      return NextResponse.json(
        { error: 'Too many subscription attempts. Please try again in 10 minutes.' },
        { status: 429 }
      );
    }

    // Insert or update to is_active = false (opt-in pending confirmation) using upsert
    const { error: dbError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .upsert(
        { email: cleanEmail, is_active: false },
        { onConflict: 'email' }
      );

    if (dbError) {
      console.error('Database insertion error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save subscription. Please try again.' },
        { status: 500 }
      );
    }

    // Send opt-in/confirmation email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const confirmToken = signToken(cleanEmail, 'confirm');
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const confirmUrl = `${baseUrl}/api/newsletter/confirm?token=${confirmToken}`;
        
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: 'Newsletter <no-reply@useserch.com>',
          to: [cleanEmail],
          subject: 'Please Confirm Your Subscription - Serch',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #0F172A; margin-bottom: 16px;">Confirm Your Subscription</h2>
              <p style="color: #334155; font-size: 16px; line-height: 1.5;">Thank you for your interest in the Serch newsletter. Please click the button below to confirm your subscription.</p>
              <div style="margin: 24px 0;">
                <a href="${confirmUrl}" style="background-color: #0D9488; color: white; padding: 12px 24px; border-radius: 6px; font-weight: bold; text-decoration: none; display: inline-block;">Confirm Subscription</a>
              </div>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="color: #64748B; font-size: 12px;">If you did not sign up for this newsletter, you can safely ignore this email.</p>
            </div>
          `
        });
      } catch (resendError) {
        console.error('Resend confirmation email delivery failed:', resendError);
      }
    } else {
      console.warn('RESEND_API_KEY is not defined. Skipping confirmation email dispatch.');
    }

    return NextResponse.json(
      { message: 'A confirmation link has been sent to your email address.' },
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
