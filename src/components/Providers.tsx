'use strict';
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUser, useAuth } from '@clerk/nextjs';
import { supabase, getSupabaseClient } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import AiAssistant from './AiAssistant';

// Toast Context Types
type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes default
    },
  },
});

function ChatNotificationSync() {
  const { user } = useUser();
  const { isSignedIn, getToken } = useAuth();
  const { toast } = useToast();
  const [dbUserId, setDbUserId] = useState<string | null>(null);

  // Get DB user ID when signed in
  useEffect(() => {
    if (!isSignedIn || !user) {
      setDbUserId(null);
      return;
    }
    async function fetchDbUser() {
      try {
        const token = await getToken();
        const client = getSupabaseClient(token);
        const { data } = await client
          .from('users')
          .select('id')
          .eq('clerk_user_id', user?.id)
          .single();
        if (data) {
          setDbUserId(data.id);
        }
      } catch (err) {
        console.error('Error fetching db user for notifications:', err);
      }
    }
    fetchDbUser();
  }, [isSignedIn, user, getToken]);

  // Subscribe to all incoming chat messages for seeker / provider notifications
  useEffect(() => {
    if (!dbUserId) return;

    const tokenPromise = getToken();

    const channel = supabase
      .channel('global-chat-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload: any) => {
          // Ignore if it's sent by this user
          if (payload.new.sender_id === dbUserId) return;

          try {
            const token = await tokenPromise;
            const client = getSupabaseClient(token);
            
            // Check if this message belongs to a booking where the user is either the seeker or the provider
            const { data: booking, error } = await client
              .from('bookings')
              .select('id, seeker_id, provider_id, providers(business_name, user_id), users(full_name)')
              .eq('id', payload.new.booking_id)
              .single();

            if (!error && booking) {
              const isSeeker = booking.seeker_id === dbUserId;
              
              // If current user is seeker
              if (isSeeker) {
                toast(`New message from ${booking.providers.business_name}: "${payload.new.message}"`, 'info');
              } else {
                // If current user is provider (checking if their provider record user_id matches or provider_id matches)
                const { data: providerInfo } = await client
                  .from('providers')
                  .select('id')
                  .eq('user_id', dbUserId)
                  .maybeSingle();

                if (providerInfo && booking.provider_id === providerInfo.id) {
                  toast(`New message from ${booking.users.full_name}: "${payload.new.message}"`, 'info');
                }
              }
            }
          } catch (err) {
            console.error('Error in global chat notification listener:', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dbUserId, getToken, toast]);

  return null;
}

function UserSync() {
  const { user } = useUser();
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn) {
        // Mark session as active in local & session storage
        if (typeof window !== 'undefined') {
          localStorage.setItem('serch_session_active', 'true');
          sessionStorage.setItem('serch_session_active', 'true');
        }
      } else {
        // Not signed in. Check if we previously had an active session
        if (typeof window !== 'undefined') {
          const hadSession = 
            localStorage.getItem('serch_session_active') === 'true' ||
            sessionStorage.getItem('serch_session_active') === 'true';

          if (hadSession) {
            // Clear React Query cache & browser storage
            queryClient.clear();
            localStorage.clear();
            sessionStorage.clear();
            // Hard redirect to home to wipe in-memory cache/states cleanly
            window.location.href = '/';
          }
        }
      }
    }
  }, [isLoaded, isSignedIn]);

  const { getToken } = useAuth();

  useEffect(() => {
    async function testJwt() {
      if (typeof window === 'undefined') return;
      if (process.env.NEXT_PUBLIC_USE_CLERK_JWT !== 'true') return; // skip test if JWT is disabled in env config
      if (sessionStorage.getItem('serch_jwt_bypass') !== null) return; // already checked

      try {
        const token = await getToken();
        if (!token) return;

        const testClient = getSupabaseClient(token);
        const { error } = await testClient.from('users').select('id').limit(1).maybeSingle();

        if (error && (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('key') || error.message?.includes('decode'))) {
          console.warn('Serch: Supabase JWT integration with Clerk is not configured on the dashboard. Enabling anon fallback mode to prevent 401 console logs.');
          sessionStorage.setItem('serch_jwt_bypass', 'true');
          // Dispatch event to notify settings/etc. to update their clients
          window.dispatchEvent(new Event('jwt-bypass-detected'));
        } else {
          sessionStorage.setItem('serch_jwt_bypass', 'false');
        }
      } catch (err) {
        console.warn('Error testing Supabase JWT connection:', err);
      }
    }
    if (isSignedIn) {
      testJwt();
    }
  }, [isSignedIn, getToken]);

  useEffect(() => {
    async function syncUser() {
      if (!user) return;

      try {
        const response = await fetch('/api/users/sync', {
          method: 'POST',
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.error('Failed to sync user via API:', errData.error || JSON.stringify(errData));
        } else {
          const data = await response.json().catch(() => ({}));
          
          // User role synced successfully, no automatic redirects needed to allow browsing public pages
        }
      } catch (err) {
        console.error('Failed to run UserSync:', err);
      }
    }

    syncUser();
  }, [user, pathname, router]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ToastContext.Provider value={{ toast }}>
        <UserSync />
        <ChatNotificationSync />
        <AiAssistant />
        {children}
        
        {/* Toast Container */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`p-4 rounded-xl shadow-lg border text-sm flex items-center justify-between transition-all duration-300 transform translate-y-0 opacity-100 ${
                t.type === 'success'
                  ? 'bg-purple-50 border-purple-200 text-purple-800'
                  : t.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <span>{t.message}</span>
              <button
                onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
                className="ml-3 text-slate-400 hover:text-slate-600 font-bold"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    </QueryClientProvider>
  );
}
