import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';
import { isRateLimited, getClientIp } from '@/lib/rate-limiter';


export async function POST(req: Request) {
  try {
    // Determine user identity or client IP for rate limiting
    const { userId } = await auth();
    const ip = getClientIp(req);
    const rateLimitKey = userId ? `ai:user:${userId}` : `ai:ip:${ip}`;
    
    // Limit: 10 requests per 1 minute (60000ms)
    const limited = await isRateLimited(rateLimitKey, 10, 60000);
    if (limited) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down and try again shortly.' },
        { status: 429 }
      );
    }

    const { message, bookings } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY || '';
    const isOpenAiConfigured = apiKey && !apiKey.includes('placeholder');

    if (isOpenAiConfigured) {
      const openai = new OpenAI({ apiKey });
      
      const systemPrompt = `You are Serch AI Assistant, a helpful assistant for Serch local service marketplace. 
You have access to the user's current bookings list:
${JSON.stringify(bookings, null, 2)}

Provide a warm, polite, and helpful answer. Answer the user's question directly based on their bookings list. 
If they ask about their next booking, identify the booking with the closest date/time in the future (compared to today). 
Keep your response concise and professional.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
      });

      return NextResponse.json({ reply: response.choices[0]?.message?.content });
    }

    // Rule-based fallback if OpenAI is not configured
    const normalizedMsg = message.toLowerCase();
    
    // Sort bookings by date and time to find next one
    const activeBookings = (bookings || []).filter((b: any) => b.status !== 'cancelled' && b.status !== 'no_show');
    const sortedBookings = [...activeBookings].sort((a: any, b: any) => {
      const dateDiff = new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.start_time.localeCompare(b.start_time);
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingBookings = sortedBookings.filter((b: any) => b.booking_date >= todayStr);

    if (
      normalizedMsg.includes('next booking') || 
      normalizedMsg.includes('when is my next') || 
      normalizedMsg.includes('upcoming') || 
      normalizedMsg.includes('next scheduled')
    ) {
      if (upcomingBookings.length === 0) {
        return NextResponse.json({ 
          reply: "You don't have any upcoming bookings scheduled at the moment. You can browse local service providers on the search page to book a service!" 
        });
      }

      const next = upcomingBookings[0];
      const timeStr = formatTime(next.start_time);
      return NextResponse.json({
        reply: `Your next booking is for **${next.services.name}** with **${next.providers.business_name}**.\n\n📅 **Date:** ${next.booking_date}\n⏰ **Time:** ${timeStr}\n📌 **Status:** ${next.status.charAt(0).toUpperCase() + next.status.slice(1)}`
      });
    }

    if (
      normalizedMsg.includes('all bookings') || 
      normalizedMsg.includes('list') || 
      normalizedMsg.includes('schedule') || 
      normalizedMsg.includes('history')
    ) {
      if (activeBookings.length === 0) {
        return NextResponse.json({ 
          reply: "You don't have any active bookings in your history." 
        });
      }

      let reply = `Here is your booking schedule:\n\n`;
      activeBookings.forEach((b: any, index: number) => {
        reply += `${index + 1}. **${b.services.name}** with **${b.providers.business_name}**\n   📅 Date: ${b.booking_date} | ⏰ ${formatTime(b.start_time)}\n   📌 Status: *${b.status}*\n\n`;
      });
      return NextResponse.json({ reply });
    }

    // Default general response
    return NextResponse.json({
      reply: "I am the Serch AI Assistant. You can ask me questions about your upcoming bookings, schedule, or service history! For example, ask me 'When is my next booking?'"
    });

  } catch (err: any) {
    console.error('AI assistant route error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function formatTime(t: string) {
  if (!t) return '';
  const parts = t.split(':');
  const hours = Number(parts[0]);
  const minutes = parts[1] || '00';
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}
