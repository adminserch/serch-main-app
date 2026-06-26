import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';
import { verifyToken, signToken } from '@/lib/token';

function escapeHtml(str: string): string {
  return str.replace(/[&<>'"]/g, 
    (tag) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return new NextResponse(
        `<html>
          <head>
            <title>Invalid Request</title>
            <style>
              body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #F8FAFC; color: #0F172A; }
              .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; max-width: 400px; border: 1px solid #e2e8f0; }
              h1 { color: #DC2626; margin-bottom: 1rem; font-size: 1.5rem; }
              p { color: #475569; line-height: 1.5; font-size: 0.95rem; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Invalid Confirmation Link</h1>
              <p>No token was provided, or the link is invalid.</p>
            </div>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' }, status: 400 }
      );
    }

    const email = verifyToken(token, 'confirm');

    if (!email) {
      return new NextResponse(
        `<html>
          <head>
            <title>Invalid or Expired Link</title>
            <style>
              body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #F8FAFC; color: #0F172A; }
              .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; max-width: 400px; border: 1px solid #e2e8f0; }
              h1 { color: #DC2626; margin-bottom: 1rem; font-size: 1.5rem; }
              p { color: #475569; line-height: 1.5; font-size: 0.95rem; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Link Expired or Invalid</h1>
              <p>The confirmation link has expired or is invalid. Please sign up again.</p>
            </div>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' }, status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const escapedEmail = escapeHtml(cleanEmail);

    return new NextResponse(
      `<html>
        <head>
          <title>Confirm Your Subscription - Serch</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #F8FAFC; color: #0F172A; margin: 0; }
            .card { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); text-align: center; max-width: 450px; border: 1px solid #e2e8f0; }
            h1 { color: #0F172A; margin-bottom: 1rem; font-size: 1.5rem; }
            p { color: #475569; line-height: 1.5; font-size: 0.95rem; margin-bottom: 2rem; }
            .btn-container { display: flex; flex-direction: column; gap: 0.75rem; }
            .btn-confirm { background-color: #0D9488; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: bold; width: 100%; font-size: 0.95rem; cursor: pointer; transition: background-color 0.2s; }
            .btn-confirm:hover { background-color: #0b7c72; }
            .btn-cancel { display: block; border: 1px solid #cbd5e1; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 0.95rem; color: #475569; transition: background-color 0.2s, color 0.2s; }
            .btn-cancel:hover { background-color: #f1f5f9; color: #0F172A; }
            .brand { font-weight: bold; color: #0F172A; margin-top: 2rem; font-size: 1.1rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Confirm Your Subscription</h1>
            <p>Please click below to confirm your subscription to the Serch newsletter for <strong>${escapedEmail}</strong>.</p>
            <form action="/api/newsletter/confirm" method="POST" class="btn-container">
              <input type="hidden" name="token" value="${escapeHtml(token)}" />
              <button type="submit" class="btn-confirm">Yes, Confirm Subscription</button>
              <a href="/" class="btn-cancel">No, cancel</a>
            </form>
            <div class="brand">Serch</div>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' }, status: 200 }
    );
  } catch (error) {
    console.error('Unhandled newsletter confirm GET error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let token = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      token = (formData.get('token') as string) || '';
    } else {
      try {
        const body = await request.json();
        token = body.token || '';
      } catch {
        // ignore
      }
    }

    if (!token) {
      return new NextResponse(
        `<html>
          <head><title>Invalid Request</title></head>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #F8FAFC;"><div style="background: white; padding: 2rem; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;"><h1>Invalid Token</h1><p>The token is missing.</p></div></body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' }, status: 400 }
      );
    }

    const email = verifyToken(token, 'confirm');

    if (!email) {
      return new NextResponse(
        `<html>
          <head><title>Invalid or Expired Link</title></head>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #F8FAFC;"><div style="background: white; padding: 2rem; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;"><h1>Link Expired</h1><p>The confirmation link has expired or is invalid.</p></div></body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' }, status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Update is_active to true
    const { data, error: dbError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .update({ is_active: true })
      .eq('email', cleanEmail)
      .select();

    if (dbError || !data || data.length === 0) {
      console.error('Database confirmation error:', dbError);
      return new NextResponse(
        `<html>
          <head>
            <title>Verification Failed</title>
            <style>
              body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #F8FAFC; color: #0F172A; }
              .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; max-width: 400px; border: 1px solid #e2e8f0; }
              h1 { color: #DC2626; margin-bottom: 1rem; font-size: 1.5rem; }
              p { color: #475569; line-height: 1.5; font-size: 0.95rem; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Database Error</h1>
              <p>Failed to activate your subscription. Please try again later.</p>
            </div>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' }, status: 500 }
      );
    }

    // Try sending Welcome onboarding email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const unsubscribeToken = signToken(cleanEmail, 'unsubscribe');
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const unsubscribeUrl = `${baseUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;
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
        console.error('Resend onboarding email delivery failed:', resendError);
      }
    } else {
      console.warn('RESEND_API_KEY is not defined. Skipping onboarding email dispatch.');
    }

    return new NextResponse(
      `<html>
        <head>
          <title>Subscription Confirmed! - Serch</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #F8FAFC; color: #0F172A; margin: 0; }
            .card { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); text-align: center; max-width: 450px; border: 1px solid #e2e8f0; }
            h1 { color: #0D9488; margin-bottom: 1rem; font-size: 1.5rem; }
            p { color: #475569; line-height: 1.5; font-size: 0.95rem; margin-bottom: 2rem; }
            .btn-home { background-color: #0D9488; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 0.95rem; cursor: pointer; transition: background-color 0.2s; }
            .btn-home:hover { background-color: #0b7c72; }
            .brand { font-weight: bold; color: #0F172A; margin-top: 2rem; font-size: 1.1rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Subscription Confirmed!</h1>
            <p>Your email address has been successfully verified. Welcome to the Serch newsletter community!</p>
            <a href="/" class="btn-home">Go to Homepage</a>
            <div class="brand">Serch</div>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' }, status: 200 }
    );
  } catch (error) {
    console.error('Unhandled newsletter confirm POST error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
