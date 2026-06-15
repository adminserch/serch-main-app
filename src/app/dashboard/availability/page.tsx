'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { supabase, getSupabaseClient } from '@/lib/supabase';
import { useToast } from '@/components/Providers';
import { Calendar as CalendarIcon, Clock, Plus, Trash2, ShieldAlert } from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface BlockedDate {
  id: string;
  date: string;
  reason: string | null;
}

const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AvailabilityManager() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();

  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);

  // Form states
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [blockReason, setBlockReason] = useState('');
  const [savingBlock, setSavingBlock] = useState(false);

  async function loadData() {
    try {
      const token = await getToken();
      if (!token) return;

      const client = getSupabaseClient(token);

      const { data: uData } = await client
        .from('users')
        .select('id')
        .eq('clerk_user_id', user?.id)
        .single();

      if (uData) {
        const { data: pData } = await client
          .from('providers')
          .select('id')
          .eq('user_id', uData.id)
          .single();

        if (pData) {
          setProvider(pData);

          // Get availabilities
          const { data: aData } = await client
            .from('provider_availability')
            .select('id, day_of_week, start_time, end_time, is_available')
            .eq('provider_id', pData.id)
            .order('day_of_week', { ascending: true });

          if (aData) setAvailabilities(aData);

          // Get blocked dates
          const { data: bData } = await client
            .from('blocked_dates')
            .select('id, date, reason')
            .eq('provider_id', pData.id)
            .order('date', { ascending: true });

          if (bData) setBlockedDates(bData);
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

  const handleToggleDay = async (dayOfWeek: number, existing: Availability | undefined) => {
    if (!provider) return;

    try {
      const token = await getToken();
      const client = getSupabaseClient(token);

      if (existing) {
        // Toggle availability status, ensuring default hours are set if previously empty/null
        const { error } = await client
          .from('provider_availability')
          .update({ 
            is_available: !existing.is_available,
            start_time: existing.start_time || '09:00:00',
            end_time: existing.end_time || '17:00:00'
          })
          .eq('id', existing.id);

        if (error) throw error;
        toast(`${DOW_NAMES[dayOfWeek]} availability updated`, 'success');
      } else {
        // Insert new default hours (9am to 5pm)
        const { error } = await client
          .from('provider_availability')
          .insert({
            provider_id: provider.id,
            day_of_week: dayOfWeek,
            start_time: '09:00:00',
            end_time: '17:00:00',
            is_available: true
          });

        if (error) throw error;
        toast(`${DOW_NAMES[dayOfWeek]} availability enabled`, 'success');
      }
      loadData();
    } catch (err) {
      toast('Failed to update business hours', 'error');
    }
  };

  const handleUpdateTimeRange = async (id: string, start: string, end: string) => {
    try {
      const token = await getToken();
      const client = getSupabaseClient(token);
      const { error } = await client
        .from('provider_availability')
        .update({ 
          start_time: start || '09:00:00', 
          end_time: end || '17:00:00' 
        })
        .eq('id', id);

      if (error) throw error;
      toast('Business hours range updated', 'success');
      loadData();
    } catch (err) {
      toast('Failed to update hours range.', 'error');
    }
  };

  const handleBlockDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) return;

    setSavingBlock(true);
    try {
      const token = await getToken();
      const client = getSupabaseClient(token);

      const offset = selectedDate.getTimezoneOffset();
      const localDate = new Date(selectedDate.getTime() - offset * 60 * 1000);
      const formattedDate = localDate.toISOString().split('T')[0];

      const { error } = await client
        .from('blocked_dates')
        .insert({
          provider_id: provider.id,
          date: formattedDate,
          is_available: false,
          reason: blockReason || null
        });

      if (error) throw error;
      toast('Date blocked successfully', 'success');
      setBlockReason('');
      loadData();
    } catch (err) {
      toast('Could not block this date. It may already be blocked.', 'error');
    } finally {
      setSavingBlock(false);
    }
  };

  const handleUnblockDate = async (id: string) => {
    try {
      const token = await getToken();
      const client = getSupabaseClient(token);
      const { error } = await client
        .from('blocked_dates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast('Date unblocked', 'success');
      loadData();
    } catch (err) {
      toast('Could not unblock date.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 h-[50vh]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      {/* Business Hours */}
      <div className="bg-white border border-champagne/60 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
        <div>
          <h2 className="font-display text-xl font-bold text-espresso mb-1">Weekly Business Hours</h2>
          <p className="text-stone-500 text-xs font-sans">Set the recurring weekly times when you are open for bookings.</p>
        </div>

        <div className="flex flex-col gap-4">
          {DOW_NAMES.map((dayName, idx) => {
            const current = availabilities.find(a => a.day_of_week === idx);
            const active = current?.is_available || false;

            return (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-champagne/30 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => handleToggleDay(idx, current)}
                    className="rounded text-accent focus:ring-accent w-4 h-4"
                  />
                  <span className="text-xs font-bold text-slate-800 w-24 select-none">{dayName}</span>
                </div>

                {active && current && (
                  <div className="flex items-center gap-2 font-sans text-xs">
                    <input
                      type="time"
                      value={(current.start_time || '09:00:00').substring(0, 5)}
                      onChange={(e) => handleUpdateTimeRange(current.id, `${e.target.value}:00`, current.end_time || '17:00:00')}
                      className="border border-champagne rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent"
                    />
                    <span className="text-stone-400">to</span>
                    <input
                      type="time"
                      value={(current.end_time || '17:00:00').substring(0, 5)}
                      onChange={(e) => handleUpdateTimeRange(current.id, current.start_time || '09:00:00', `${e.target.value}:00`)}
                      className="border border-champagne rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent"
                    />
                  </div>
                )}

                {!active && (
                  <span className="text-xs text-stone-400 italic font-sans py-1.5">Closed</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Blocked Dates Override */}
      <div className="flex flex-col gap-6">
        {/* Block new date form */}
        <div className="bg-white border border-champagne/60 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-espresso mb-1">Block Specific Dates</h2>
            <p className="text-stone-500 text-xs font-sans">Temporarily block days off or holidays to override weekly hours.</p>
          </div>

          <form onSubmit={handleBlockDate} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Select Date</label>
              <Calendar
                onChange={(val) => setSelectedDate(val as Date)}
                value={selectedDate}
                minDate={new Date()}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Reason (Optional)</label>
              <input
                type="text"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g. Christmas, Family Vacation"
                className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
              />
            </div>

            <button
              type="submit"
              disabled={savingBlock}
              className="bg-primary hover:bg-slate-800 text-white font-semibold text-xs py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              {savingBlock ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : null}
              Block Selected Date
            </button>
          </form>
        </div>

        {/* Blocked dates listings */}
        <div className="bg-white border border-champagne/60 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <h2 className="font-display text-base font-bold text-espresso">Currently Blocked Dates</h2>
          
          {blockedDates.length === 0 ? (
            <p className="text-stone-400 text-xs font-sans italic">No custom blocked dates added.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {blockedDates.map((b) => (
                <div key={b.id} className="p-3 border border-champagne/60 bg-stone-50/50 rounded-xl flex items-center justify-between gap-4 font-sans text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block">{b.date}</span>
                    {b.reason && <span className="text-[10px] text-stone-500 italic">Reason: {b.reason}</span>}
                  </div>
                  <button
                    onClick={() => handleUnblockDate(b.id)}
                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
