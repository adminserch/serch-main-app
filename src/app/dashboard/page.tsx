'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import { supabase, getSupabaseClient } from '@/lib/supabase';
import { useToast } from '@/components/Providers';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Award, 
  FileCheck,
  ChevronRight
} from 'lucide-react';

interface Stats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  activeServices: number;
  todayVisits: number;
}

interface Appointment {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string | null;
  services: {
    name: string;
    price: number;
  };
  users: {
    full_name: string;
    email: string;
  };
}

export default function DashboardOverview() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [providerStatus, setProviderStatus] = useState<string>('approved');
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    activeServices: 0,
    todayVisits: 0
  });
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);

  useEffect(() => {
    async function loadStats() {
      try {
        const token = await getToken();
        if (!token) return;

        const client = getSupabaseClient(token);

        // Get provider details first
        const { data: userData } = await client
          .from('users')
          .select('id')
          .eq('clerk_user_id', user?.id)
          .single();

        if (userData) {
          const { data: provider } = await client
            .from('providers')
            .select('id, status')
            .eq('user_id', userData.id)
            .maybeSingle();

          if (provider) {
            setProviderStatus(provider.status);
            // Fetch bookings
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
                  full_name,
                  email
                )
              `)
              .eq('provider_id', provider.id);

            // Fetch active services
            const { data: services } = await client
              .from('services')
              .select('id')
              .eq('provider_id', provider.id)
              .eq('is_active', true);

            if (bookings) {
              const total = bookings.length;
              const pending = bookings.filter((b: any) => b.status === 'pending').length;
              const confirmed = bookings.filter((b: any) => b.status === 'confirmed').length;
              const completed = bookings.filter((b: any) => b.status === 'completed').length;
              const activeServices = services?.length || 0;

              const todayStr = new Date().toISOString().split('T')[0];
              const todayVisits = bookings.filter((b: any) => b.booking_date === todayStr && b.status === 'confirmed').length;

              setStats({
                total,
                pending,
                confirmed,
                completed,
                activeServices,
                todayVisits
              });

              // Set upcoming (pending or confirmed, sorted by date)
              const sortedUpcoming = bookings
                .filter((b: any) => b.status === 'pending' || b.status === 'confirmed')
                .sort((a: any, b: any) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime())
                .slice(0, 5);

              setUpcoming(sortedUpcoming as any[]);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      loadStats();
    }
  }, [user]);

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
    <div className="flex flex-col gap-8">
      {/* Hero Welcome banner */}
      <div className="bg-gradient-to-r from-primary to-slate-800 text-white rounded-2xl p-8 relative overflow-hidden shadow-sm">
        <div className="relative z-10">
          {providerStatus === 'approved' ? (
            <div className="inline-flex items-center gap-1 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase mb-4">
              <Award className="w-3.5 h-3.5" /> Verified Provider
            </div>
          ) : providerStatus === 'pending' ? (
            <div className="inline-flex items-center gap-1 bg-amber-500/20 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider text-amber-300 uppercase mb-4 border border-amber-500/30 animate-pulse">
              <Clock className="w-3.5 h-3.5 mr-1" /> Awaiting Verification
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 bg-red-500/20 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider text-red-300 uppercase mb-4 border border-red-500/30">
              <AlertCircle className="w-3.5 h-3.5 mr-1" /> Profile Suspended
            </div>
          )}
          
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-stone-300 text-sm max-w-md">
            {providerStatus === 'approved'
              ? 'Manage your schedule, confirm booking requests, and add new services to your profile.'
              : providerStatus === 'pending'
              ? 'Your application is currently under review by our admin team. Seekers will be able to find and book you once approved.'
              : 'Your provider account is currently suspended or rejected. Please reach out to platform support.'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-champagne/60 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Total Visits</span>
          <span className="text-2xl font-bold font-display text-espresso block">{stats.total}</span>
        </div>
        <div className="bg-white border border-champagne/60 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Pending Requests</span>
          <span className="text-2xl font-bold font-display text-amber-600 block">{stats.pending}</span>
        </div>
        <div className="bg-white border border-champagne/60 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Active Services</span>
          <span className="text-2xl font-bold font-display text-accent block">{stats.activeServices}</span>
        </div>
        <div className="bg-white border border-champagne/60 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Today&apos;s Visits</span>
          <span className="text-2xl font-bold font-display text-purple-700 block">{stats.todayVisits}</span>
        </div>
      </div>

      {/* Upcoming appointments table list */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display text-lg font-bold text-espresso">Upcoming Appointments</h2>
          <Link href="/dashboard/appointments" className="text-xs font-semibold text-accent hover:underline flex items-center gap-0.5">
            Manage Bookings <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="bg-white border border-champagne/60 rounded-xl p-8 text-center text-sm text-stone-400 font-sans border-dashed">
            No upcoming appointments scheduled.
          </div>
        ) : (
          <div className="bg-white border border-champagne/60 rounded-xl overflow-hidden shadow-sm">
            <div className="divide-y divide-champagne/40">
              {upcoming.map((appt) => (
                <div key={appt.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-sans font-bold text-espresso text-sm">{appt.users.full_name}</h3>
                    <p className="text-xs text-accent font-medium mt-0.5">{appt.services.name}</p>
                    <div className="flex items-center gap-3 text-stone-500 text-xs mt-2 font-sans">
                      <span className="flex items-center gap-0.5"><Calendar className="w-3.5 h-3.5" /> {appt.booking_date}</span>
                      <span className="flex items-center gap-0.5"><Clock className="w-3.5 h-3.5" /> {formatTime(appt.start_time)} - {formatTime(appt.end_time)}</span>
                    </div>
                  </div>

                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border w-max ${
                    appt.status === 'confirmed'
                      ? 'bg-purple-50 border-purple-200 text-purple-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    {appt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
