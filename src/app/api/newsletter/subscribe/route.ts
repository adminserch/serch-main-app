import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';
import { signToken } from '@/lib/token';
import { isRateLimited } from '@/lib/rate-limiter';
import { z } from 'zod';

const emailSchema = z.string().trim().email('Please provide a valid email address.');

function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',');
    const clientIp = ips[0].trim();
    if (clientIp) return clientIp;
  }
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();
  
  return '127.0.0.1';
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

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const { email } = body;

    const validationResult = emailSchema.safeParse(email);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const cleanEmail = validationResult.data.toLowerCase();

    // Rate limiting check using centralized store and normalized client IP
    const ip = getClientIp(request);
    const ipLimited = await isRateLimited(`ip:${ip}`, 5, 600000);
    const emailLimited = await isRateLimited(`email:${cleanEmail}`, 5, 600000);

    if (ipLimited || emailLimited) {
      return NextResponse.json(
        { error: 'Too many subscription attempts. Please try again in 10 minutes.' },
        { status: 429 }
      );
    }

    // Check if there is an existing subscriber
    const { data: existingSubscriber, error: queryError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .select('id, is_active')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (queryError) {
      console.error('Database query error:', queryError);
      return NextResponse.json(
        { error: 'Failed to check subscription status. Please try again.' },
        { status: 500 }
      );
    }

    if (existingSubscriber) {
      if (existingSubscriber.is_active) {
        return NextResponse.json(
          { message: 'You are already subscribed to our newsletter!' },
          { status: 200 }
        );
      }
      // If inactive, we keep the record as inactive and continue to send/re-send confirmation email
    } else {
      // Insert new subscriber as inactive (opt-in pending confirmation)
      const { error: dbError } = await supabaseAdmin
        .from('newsletter_subscribers')
        .insert({ email: cleanEmail, is_active: false });

      if (dbError) {
        console.error('Database insertion error:', dbError);
        return NextResponse.json(
          { error: 'Failed to save subscription. Please try again.' },
          { status: 500 }
        );
      }
    }

    // Send opt-in/confirmation email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const host = request.headers.get('host') || 'myapp.useserch.com';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not defined.');
      return NextResponse.json(
        { error: 'Email service configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    try {
      const confirmToken = signToken(cleanEmail, 'confirm');
      const confirmUrl = `${baseUrl}/api/newsletter/confirm?token=${confirmToken}`;
      
      const resend = new Resend(resendApiKey);
      const { error: sendError } = await resend.emails.send({
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

      if (sendError) {
        throw sendError;
      }
    } catch (resendError) {
      console.error('Resend confirmation email delivery failed:', resendError);
      return NextResponse.json(
        { error: 'Failed to send confirmation email. Please try again.' },
        { status: 500 }
      );
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
