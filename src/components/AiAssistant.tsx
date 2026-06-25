'use client';

import { getSupabaseClient } from '@/lib/supabase';
import { useAuth, useUser } from '@clerk/nextjs';
import { Bot, Send, Sparkles } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  providers?: {
    business_name: string;
  };
  services?: {
    name: string;
    price: number;
  };
  users?: {
    full_name: string;
  };
}

export default function AiAssistant() {
  const { user } = useUser();
  const { isSignedIn, getToken } = useAuth();
  
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Hello! I am your Serch Assistant. How can I help you find or manage services today?' }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Fetch user's bookings to pass as context to the AI
  useEffect(() => {
    if (!isSignedIn || !user) {
      setBookings([]);
      return;
    }

    async function loadBookingsContext() {
      try {
        const token = await getToken();
        const client = getSupabaseClient(token);

        // Get DB user details
        const { data: dbUser } = await client
          .from('users')
          .select('id, role')
          .eq('clerk_user_id', user?.id)
          .single();

        if (!dbUser) return;

        if (dbUser.role === 'seeker') {
          const { data: seekerBookings } = await client
            .from('bookings')
            .select(`
              id,
              booking_date,
              start_time,
              end_time,
              status,
              providers (business_name),
              services (name, price)
            `)
            .eq('seeker_id', dbUser.id);
          if (seekerBookings) setBookings(seekerBookings as any[]);
        } else if (dbUser.role === 'provider') {
          // Get provider ID
          const { data: provider } = await client
            .from('providers')
            .select('id')
            .eq('user_id', dbUser.id)
            .maybeSingle();

          if (provider) {
            const { data: providerBookings } = await client
              .from('bookings')
              .select(`
                id,
                booking_date,
                start_time,
                end_time,
                status,
                users (full_name),
                services (name, price)
              `)
              .eq('provider_id', provider.id);
            
            // Map users to providers for compatible layout
            const mapped = (providerBookings || []).map((b: any) => ({
              ...b,
              providers: { business_name: b.users?.full_name || 'Client' }
            }));
            setBookings(mapped);
          }
        } else if (dbUser.role === 'admin') {
          // Admin can see overall bookings count or list
          const { data: allBookings } = await client
            .from('bookings')
            .select(`
              id,
              booking_date,
              start_time,
              end_time,
              status,
              providers (business_name),
              services (name, price)
            `)
            .limit(50);
          if (allBookings) setBookings(allBookings as any[]);
        }
      } catch (err) {
        console.error('Error loading bookings for AI context:', err);
      }
    }

    loadBookingsContext();
  }, [isSignedIn, user, getToken]);

  const handleSendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userText = aiInput.trim();
    setAiMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setAiInput('');
    setAiLoading(true);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, bookings }),
      });
      const data = await response.json();
      setAiMessages((prev) => [...prev, { sender: 'ai', text: data.reply || 'I am having trouble answering that right now.' }]);
    } catch (err) {
      setAiMessages((prev) => [...prev, { sender: 'ai', text: 'I simulated a response: Serch platform connects homeowners with top providers. Your bookings are currently visible on this panel.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  if (!isSignedIn) return null;

  return (
    <div className="fixed bottom-24 right-6 z-40">
      <button
        onClick={() => setShowAiAssistant(!showAiAssistant)}
        className="bg-primary hover:bg-slate-800 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-1.5"
      >
        <Sparkles className="w-5 h-5 text-amber-300" />
        <span className="text-xs font-bold font-sans">Ask AI</span>
      </button>

      {showAiAssistant && (
        <div className="absolute bottom-16 right-0 bg-white border border-champagne rounded-2xl shadow-2xl w-80 h-[400px] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-white p-3 flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Bot className="w-5 h-5 text-amber-300" />
              <span className="text-xs font-bold font-sans">Serch AI Assistant</span>
            </div>
            <button onClick={() => setShowAiAssistant(false)} className="text-stone-300 hover:text-white font-bold text-lg leading-none">&times;</button>
          </div>

          {/* Messages */}
          <div className="flex-grow p-3 overflow-y-auto flex flex-col gap-2">
            {aiMessages.map((msg, idx) => (
              <div key={idx} className={`flex gap-1.5 items-start ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                {msg.sender === 'ai' && <Bot className="w-4 h-4 text-stone-400 mt-1 flex-shrink-0" />}
                <div className={`p-2.5 rounded-xl text-[11px] font-sans leading-relaxed max-w-[80%] ${
                  msg.sender === 'user' 
                    ? 'bg-accent text-white rounded-tr-none' 
                    : 'bg-stone-50 border border-stone-200/55 text-espresso rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex gap-1.5 items-center text-[10px] text-stone-400 p-1">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce delay-150"></span>
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce delay-300"></span>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendAiMessage} className="p-3 border-t border-champagne/45 flex gap-2">
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Ask about your bookings, schedule..."
              className="flex-grow border border-champagne rounded-xl px-3 py-2 text-[11px] focus:outline-none focus:border-accent"
            />
            <button type="submit" className="p-2 bg-primary hover:bg-slate-800 text-white rounded-xl flex items-center justify-center">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
