import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const confirm = searchParams.get('confirm');

    if (!email) {
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
              <h1>Invalid Request</h1>
              <p>No email address was provided to unsubscribe.</p>
            </div>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' }, status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Step 1: If confirm param is not present or not 'true', serve the confirmation page
    if (confirm !== 'true') {
      const confirmUrl = `${new URL(request.url).pathname}?email=${encodeURIComponent(cleanEmail)}&confirm=true`;
      return new NextResponse(
        `<html>
          <head>
            <title>Confirm Unsubscribe - Serch</title>
            <style>
              body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #F8FAFC; color: #0F172A; margin: 0; }
              .card { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); text-align: center; max-width: 450px; border: 1px solid #e2e8f0; }
              h1 { color: #0F172A; margin-bottom: 1rem; font-size: 1.5rem; }
              p { color: #475569; line-height: 1.5; font-size: 0.95rem; margin-bottom: 2rem; }
              .btn-container { display: flex; flex-direction: column; gap: 0.75rem; }
              .btn-confirm { background-color: #DC2626; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 0.95rem; cursor: pointer; transition: background-color 0.2s; }
              .btn-confirm:hover { background-color: #B91C1C; }
              .btn-cancel { background-color: transparent; color: #475569; border: 1px solid #cbd5e1; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 0.95rem; cursor: pointer; transition: background-color 0.2s, color 0.2s; }
              .btn-cancel:hover { background-color: #f1f5f9; color: #0F172A; }
              .brand { font-weight: bold; color: #0F172A; margin-top: 2rem; font-size: 1.1rem; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Unsubscribe Confirmation</h1>
              <p>Are you sure you want to unsubscribe <strong>${cleanEmail}</strong> from the Serch newsletter? You will stop receiving our latest updates and local deals.</p>
              <div class="btn-container">
                <a href="${confirmUrl}" class="btn-confirm">Yes, Unsubscribe</a>
                <a href="/" class="btn-cancel">No, keep me subscribed</a>
              </div>
              <div class="brand">Serch</div>
            </div>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' }, status: 200 }
      );
    }

    // Step 2: If confirm is 'true', execute database update
    const { error: dbError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .update({ is_active: false })
      .eq('email', cleanEmail);

    if (dbError) {
      console.error('Database unsubscribe error:', dbError);
      return new NextResponse(
        `<html>
          <head>
            <title>Unsubscribe Failed</title>
            <style>
              body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #F8FAFC; color: #0F172A; }
              .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; max-width: 400px; border: 1px solid #e2e8f0; }
              h1 { color: #DC2626; margin-bottom: 1rem; font-size: 1.5rem; }
              p { color: #475569; line-height: 1.5; font-size: 0.95rem; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Error</h1>
              <p>Failed to process your unsubscribe request. Please try again later.</p>
            </div>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' }, status: 500 }
      );
    }

    return new NextResponse(
      `<html>
        <head>
          <title>Unsubscribed Successfully</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #F8FAFC; color: #0F172A; }
            .card { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); text-align: center; max-width: 450px; border: 1px solid #e2e8f0; }
            h1 { color: #0D9488; margin-bottom: 1rem; font-size: 1.5rem; }
            p { color: #475569; line-height: 1.5; font-size: 0.95rem; }
            .brand { font-weight: bold; color: #0F172A; margin-top: 1.5rem; font-size: 1.1rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Successfully Unsubscribed</h1>
            <p>You have been successfully removed from our newsletter subscription list. You will no longer receive marketing and promotional updates from us.</p>
            <div class="brand">Serch</div>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' }, status: 200 }
    );
  } catch (error) {
    console.error('Unhandled unsubscribe error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
