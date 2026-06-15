'use strict';
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUser, useAuth } from '@clerk/nextjs';
import { getSupabaseClient } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

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

function UserSync() {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

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
          console.log('Successfully synced user session via API.');
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
