'use strict';
'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import { supabase, getSupabaseClient } from '@/lib/supabase';
import { useToast } from '@/components/Providers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  Calendar, 
  Clock, 
  MessageSquare, 
  Star, 
  XCircle, 
  Lock, 
  Send,
  Sparkles,
  User,
  Bot
} from 'lucide-react';

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  providers: {
    id: string;
    business_name: string;
    logo_url: string | null;
  };
  services: {
    name: string;
    price: number;
  };
  review?: {
    id: string;
    rating: number;
    comment: string;
    is_locked: boolean;
  } | null;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

export default function BookingsPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();

  const [dbUser, setDbUser] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Chat Modal State
  const [activeChatBooking, setActiveChatBooking] = useState<Booking | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // AI Assistant State
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Hello! I am your Serch Assistant. How can I help you find or manage services today?' }
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  // Load bookings
  async function loadData() {
    try {
      const token = await getToken();
      if (!token) return;

      const supabaseClient = getSupabaseClient(token);
      
      // Get DB user first
      const { data: userData } = await supabaseClient
        .from('users')
        .select('id, role')
        .eq('clerk_user_id', user?.id)
        .single();

      if (userData) {
        setDbUser(userData);

        // Fetch bookings
        const { data: bookingsData } = await supabaseClient
          .from('bookings')
          .select(`
            id,
            booking_date,
            start_time,
            end_time,
            status,
            notes,
            providers (
              id,
              business_name,
              logo_url
            ),
            services (
              name,
              price
            )
          `)
          .eq('seeker_id', userData.id)
          .order('booking_date', { ascending: false });

        if (bookingsData) {
          // Join reviews manually or select
          const bookingIds = bookingsData.map((b: any) => b.id);
          const { data: reviewsData } = await supabaseClient
            .from('reviews')
            .select('id, rating, comment, is_locked, booking_id')
            .in('booking_id', bookingIds);

          const formatted = (bookingsData as any[]).map((b) => {
            const rev = reviewsData?.find((r: any) => r.booking_id === b.id) || null;
            return {
              ...b,
              review: rev
            };
          });

          setBookings(formatted);
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

  // Subscribe to Realtime Chat when active booking changes
  useEffect(() => {
    if (!activeChatBooking) return;

    // Fetch initial chat history
    async function loadChat() {
      const token = await getToken();
      const client = getSupabaseClient(token);
      const { data } = await client
        .from('chat_messages')
        .select('id, sender_id, message, created_at')
        .eq('booking_id', activeChatBooking!.id)
        .order('created_at', { ascending: true });

      if (data) {
        setChatMessages(data);
      }
    }
    loadChat();

    // Subscribe to database changes
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

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const token = await getToken();
      const client = getSupabaseClient(token);
      const { error } = await client
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;
      toast('Booking cancelled successfully', 'success');
      loadData();
    } catch (err) {
      toast('Failed to cancel booking', 'error');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBooking || !dbUser) return;

    setSubmittingReview(true);
    try {
      const token = await getToken();
      const client = getSupabaseClient(token);

      const { error } = await client
        .from('reviews')
        .insert({
          booking_id: reviewBooking.id,
          seeker_id: dbUser.id,
          provider_id: reviewBooking.providers.id,
          rating,
          comment,
          is_locked: true, // locked immediately
        });

      if (error) throw error;

      toast('Review submitted! It has been locked.', 'success');
      setReviewBooking(null);
      setComment('');
      loadData();
    } catch (err) {
      toast('Could not submit review.', 'error');
    } finally {
      setSubmittingReview(false);
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
        body: JSON.stringify({ message: userText, bookings: bookings }),
      });
      const data = await response.json();
      setAiMessages((prev) => [...prev, { sender: 'ai', text: data.reply || 'I am having trouble answering that right now.' }]);
    } catch (err) {
      setAiMessages((prev) => [...prev, { sender: 'ai', text: 'I simulated a response: Serch platform connects homeowners with top providers. Your bookings are currently visible on this panel.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center p-8">
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
    <div className="flex flex-col min-h-screen bg-stone-50/50">
      <Navbar />
      <main className="flex-grow pt-28 pb-16 max-w-5xl mx-auto w-full px-6 relative">
        <h1 className="font-display text-3xl font-bold text-espresso mb-8">My Bookings</h1>

      {bookings.length === 0 ? (
        <div className="bg-white border border-champagne rounded-2xl p-12 text-center shadow-sm">
          <Calendar className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h3 className="font-display font-semibold text-espresso text-base mb-1">No bookings found</h3>
          <p className="text-stone-500 text-sm mb-6">You haven&apos;t booked any services yet.</p>
          <Link href="/search" className="bg-primary hover:bg-slate-800 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-all">
            Find Providers
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white border border-champagne/60 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-champagne/20 border border-champagne/40 rounded-xl flex items-center justify-center text-accent text-lg font-bold">
                  {booking.providers.business_name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-display font-bold text-espresso text-base">{booking.providers.business_name}</h3>
                  <p className="text-xs font-semibold text-accent mt-0.5">{booking.services.name}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-stone-500 text-xs mt-3 font-sans">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {booking.booking_date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                    <span className="font-bold text-slate-700">{booking.services.price} CAD</span>
                  </div>
                </div>
              </div>

              {/* Status Badge & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-t md:border-t-0 border-champagne/40 pt-4 md:pt-0">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border w-max ${
                  booking.status === 'confirmed'
                    ? 'bg-teal-50 border-teal-200 text-teal-800'
                    : booking.status === 'completed'
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : booking.status === 'cancelled'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  {booking.status}
                </span>

                <div className="flex items-center gap-2">
                  {/* Chat Button */}
                  {(booking.status === 'confirmed' || booking.status === 'pending') && (
                    <button
                      onClick={() => setActiveChatBooking(booking)}
                      className="p-2 rounded-lg bg-stone-50 border border-champagne/50 hover:bg-stone-100 text-slate-700 transition-all"
                      title="Chat with Pro"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  )}

                  {/* Cancel Button */}
                  {(booking.status === 'pending' || booking.status === 'confirmed') && (
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      className="p-2 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 transition-all"
                      title="Cancel Booking"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}

                  {/* Review / locked display */}
                  {booking.status === 'completed' && !booking.review && (
                    <button
                      onClick={() => setReviewBooking(booking)}
                      className="bg-accent hover:bg-teal-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all"
                    >
                      Leave Review
                    </button>
                  )}

                  {booking.review && (
                    <div className="flex items-center gap-1.5 bg-stone-50 border border-champagne/60 px-3 py-1.5 rounded-lg text-xs text-stone-500 font-sans">
                      <Lock className="w-3.5 h-3.5 text-stone-400" />
                      <span>Locked Review ({booking.review.rating} ★)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Submission Modal */}
      {reviewBooking && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmitReview} className="bg-white border border-champagne rounded-2xl p-6 shadow-2xl max-w-md w-full flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-champagne/40 pb-3">
              <h2 className="font-display font-bold text-espresso text-lg">Leave a Review</h2>
              <button type="button" onClick={() => setReviewBooking(null)} className="text-stone-400 hover:text-stone-600">&times;</button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Rating</label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-amber-500"
                  >
                    <Star className={`w-7 h-7 ${star <= rating ? 'fill-amber-500' : 'text-stone-200'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Comment</label>
              <textarea
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience working with this professional..."
                rows={4}
                className="w-full border border-champagne rounded-xl p-3 text-sm focus:outline-none focus:border-accent"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-1.5 font-sans leading-relaxed">
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Reviews cannot be edited after submission.</span>
            </div>

            <button
              type="submit"
              disabled={submittingReview}
              className="w-full bg-primary hover:bg-slate-800 text-white font-semibold text-sm py-3 rounded-xl transition-all"
            >
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
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
                  {activeChatBooking.providers.business_name}
                </h3>
                <p className="text-[10px] text-teal-600 font-bold uppercase tracking-wide flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-ping"></span> Active Chat
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
                  Start messaging to discuss booking details.
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
              <button type="submit" className="p-2.5 bg-accent hover:bg-teal-700 text-white rounded-xl transition-all shadow-sm">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating AI Assistant Chat Panel */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setShowAiAssistant(!showAiAssistant)}
          className="bg-primary hover:bg-slate-800 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-5 h-5 text-gold" />
          <span className="text-xs font-bold font-sans">Ask AI</span>
        </button>

        {showAiAssistant && (
          <div className="absolute bottom-16 right-0 bg-white border border-champagne rounded-2xl shadow-2xl w-80 h-[400px] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-primary text-white p-3 flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <Bot className="w-5 h-5 text-gold" />
                <span className="text-xs font-bold font-sans">Serch AI Assistant</span>
              </div>
              <button onClick={() => setShowAiAssistant(false)} className="text-stone-300 hover:text-white font-bold">&times;</button>
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
                placeholder="Ask about booking logic, blocked slots..."
                className="flex-grow border border-champagne rounded-xl px-3 py-2 text-[11px] focus:outline-none focus:border-accent"
              />
              <button type="submit" className="p-2 bg-primary hover:bg-slate-800 text-white rounded-xl">
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
    <Footer />
  </div>
);
}
