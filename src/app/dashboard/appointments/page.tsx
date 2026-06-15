'use strict';
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { supabase, getSupabaseClient } from '@/lib/supabase';
import { useToast } from '@/components/Providers';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Check, 
  Send 
} from 'lucide-react';

interface Appointment {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  services: {
    name: string;
    price: number;
  };
  users: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface ChatMessage {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

export default function ProviderAppointments() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();

  const [dbUser, setDbUser] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Chat State
  const [activeChatBooking, setActiveChatBooking] = useState<Appointment | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  async function loadData() {
    try {
      const token = await getToken();
      if (!token) return;

      const client = getSupabaseClient(token);

      // Get user
      const { data: uData } = await client
        .from('users')
        .select('id')
        .eq('clerk_user_id', user?.id)
        .single();

      if (uData) {
        setDbUser(uData);

        // Get provider
        const { data: pData } = await client
          .from('providers')
          .select('id')
          .eq('user_id', uData.id)
          .single();

        if (pData) {
          setProvider(pData);

          // Get appointments
          const { data: bookings } = await client
            .from('bookings')
            .select(`
              id,
              booking_date,
              start_time,
              end_time,
              status,
              notes,
              services (
                name,
                price
              ),
              users (
                id,
                full_name,
                email
              )
            `)
            .eq('provider_id', pData.id)
            .order('booking_date', { ascending: false });

          if (bookings) {
            setAppointments(bookings as any[]);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Subscribe to Realtime Chat
  useEffect(() => {
    if (!activeChatBooking) return;

    async function loadChat() {
      const token = await getToken();
      const client = getSupabaseClient(token);
      const { data } = await client
        .from('chat_messages')
        .select('id, sender_id, message, created_at')
        .eq('booking_id', activeChatBooking!.id)
        .order('created_at', { ascending: true });

      if (data) setChatMessages(data);
    }
    loadChat();

    const channel = supabase
      .channel(`chat:${activeChatBooking.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `booking_id=eq.${activeChatBooking.id}`,
        },
        (payload: any) => {
          setChatMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChatBooking]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const updateStatus = async (bookingId: string, newStatus: string) => {
    try {
      const token = await getToken();
      const client = getSupabaseClient(token);
      
      const { error } = await client
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      toast(`Appointment status updated to ${newStatus}`, 'success');

      // Send status update notifications mock
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, type: `booking_${newStatus}` }),
      });

      loadData();
    } catch (err) {
      toast('Failed to update appointment status.', 'error');
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatBooking || !dbUser) return;

    try {
      const token = await getToken();
      const client = getSupabaseClient(token);

      const { error } = await client
        .from('chat_messages')
        .insert({
          booking_id: activeChatBooking.id,
          sender_id: dbUser.id,
          message: newMessage.trim(),
        });

      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      toast('Could not send message.', 'error');
    }
  };

  const filteredAppointments = appointments.filter((appt) =>
    filterStatus === 'all' ? true : appt.status === filterStatus
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 h-[50vh]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Format times nicely
  const formatTime = (t: string) => {
    const [h, m] = t.split(':');
    const hours = Number(h);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="font-display text-2xl font-bold text-espresso">Appointments Manager</h1>
        
        {/* Status filters */}
        <div className="flex items-center gap-2">
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all uppercase tracking-wider ${
                filterStatus === status
                  ? 'bg-primary border-primary text-white shadow-sm'
                  : 'bg-white border-champagne text-stone-600 hover:border-gold'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="bg-white border border-champagne rounded-2xl p-12 text-center shadow-sm">
          <Calendar className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-400 text-sm font-sans">No appointments matching selected status.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredAppointments.map((appt) => (
            <div key={appt.id} className="bg-white border border-champagne/60 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="font-sans font-bold text-espresso text-sm">{appt.users.full_name}</h3>
                <p className="text-xs text-accent font-semibold mt-0.5">{appt.services.name}</p>

                <div className="flex flex-wrap items-center gap-4 text-stone-500 text-xs mt-3 font-sans">
                  <span className="flex items-center gap-0.5"><Calendar className="w-3.5 h-3.5" /> {appt.booking_date}</span>
                  <span className="flex items-center gap-0.5"><Clock className="w-3.5 h-3.5" /> {formatTime(appt.start_time)} - {formatTime(appt.end_time)}</span>
                  <span className="font-bold text-slate-700">{appt.services.price} CAD</span>
                </div>

                {appt.notes && (
                  <p className="text-stone-500 text-xs italic font-sans mt-3 bg-stone-50 border border-stone-100 rounded-lg p-2.5">
                    Notes: &ldquo;{appt.notes}&rdquo;
                  </p>
                )}
              </div>

              {/* Actions panel */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-t md:border-t-0 border-champagne/40 pt-4 md:pt-0">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border w-max ${
                  appt.status === 'confirmed'
                    ? 'bg-purple-50 border-purple-200 text-purple-800'
                    : appt.status === 'completed'
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : appt.status === 'cancelled'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  {appt.status}
                </span>

                <div className="flex items-center gap-2">
                  {appt.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(appt.id, 'confirmed')}
                      className="p-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-lg transition-all"
                      title="Confirm Booking"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}

                  {appt.status === 'confirmed' && (
                    <button
                      onClick={() => updateStatus(appt.id, 'completed')}
                      className="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg transition-all"
                      title="Mark as Completed"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}

                  {(appt.status === 'pending' || appt.status === 'confirmed') && (
                    <button
                      onClick={() => updateStatus(appt.id, 'cancelled')}
                      className="p-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg transition-all"
                      title="Cancel Booking"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}

                  {/* Chat dialog trigger */}
                  {(appt.status === 'confirmed' || appt.status === 'pending') && (
                    <button
                      onClick={() => setActiveChatBooking(appt)}
                      className="p-2 bg-stone-50 hover:bg-stone-100 border border-champagne/60 text-slate-700 rounded-lg transition-all"
                      title="Chat with seeker"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Realtime Chat Dialog */}
      {activeChatBooking && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-champagne rounded-2xl shadow-2xl max-w-lg w-full h-[550px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-champagne/45 flex justify-between items-center bg-stone-50 rounded-t-2xl">
              <div>
                <h3 className="font-display font-bold text-espresso text-base">
                  Chat with {activeChatBooking.users.full_name}
                </h3>
                <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wide flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping"></span> Active Chat
                </p>
              </div>
              <button onClick={() => setActiveChatBooking(null)} className="text-stone-400 hover:text-stone-600 font-bold text-lg">
                &times;
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-3">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-center text-stone-400 font-sans my-auto">
                  Start messaging to discuss service details.
                </p>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.sender_id === dbUser?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[75%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                    >
                      <div className={`p-3 rounded-2xl text-xs font-sans leading-relaxed ${
                        isMe 
                          ? 'bg-accent text-white rounded-tr-none' 
                          : 'bg-stone-100 text-espresso rounded-tl-none border border-stone-200/50'
                      }`}>
                        {msg.message}
                      </div>
                      <span className="text-[9px] text-stone-400 font-sans mt-0.5 px-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendChatMessage} className="p-4 border-t border-champagne/45 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-grow border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
              />
              <button type="submit" className="p-2.5 bg-accent hover:bg-purple-700 text-white rounded-xl transition-all shadow-sm">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
