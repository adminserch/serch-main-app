'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { supabase, getSupabaseClient, supabaseAdmin } from '@/lib/supabase';
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
  const [useAdminBypass, setUseAdminBypass] = useState(false);

  // Weekly Hours Edit states
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [localHours, setLocalHours] = useState<Availability[]>([]);
  const [savingHours, setSavingHours] = useState(false);

  // Form states
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [blockReason, setBlockReason] = useState('');
  const [savingBlock, setSavingBlock] = useState(false);

  // Helper to resolve the correct database client
  const getDbClient = async () => {
    if (useAdminBypass) {
      console.log('Using Public Anonymous Fallback Client');
      return supabase;
    }
    try {
      const token = await getToken();
      if (!token) {
        console.warn('No Clerk token found, falling back to public client');
        return supabase;
      }
      return getSupabaseClient(token);
    } catch (err) {
      console.warn('Error fetching Clerk token, using public client fallback:', err);
      return supabase;
    }
  };

  const formatTime12h = (timeStr: string) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hours = Number(h);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  async function loadData() {
    try {
      const token = await getToken();
      console.log('loadData token obtained:', !!token);

      let client = getSupabaseClient(token);

      let { data: uData, error: uError } = await client
        .from('users')
        .select('id')
        .eq('clerk_user_id', user?.id)
        .single();

      if (uError || !uData) {
        console.warn('Clerk user lookup via authenticated client failed. Using public client fallback:', uError);
        client = supabase;
        setUseAdminBypass(true);
        
        const fallbackRes = await supabase
          .from('users')
          .select('id')
          .eq('clerk_user_id', user?.id)
          .single();
        uData = fallbackRes.data;
      }

      console.log('users select response:', uData);

      if (uData) {
        let { data: pData, error: pError } = await client
          .from('providers')
          .select('id')
          .eq('user_id', uData.id)
          .single();

        if (pError || !pData) {
          console.warn('Provider lookup via client failed. Trying public client fallback...', pError);
          client = supabase;
          setUseAdminBypass(true);
          const fallbackRes = await supabase
            .from('providers')
            .select('id')
            .eq('user_id', uData.id)
            .single();
          pData = fallbackRes.data;
        }

        console.log('providers select response:', pData);

        if (pData) {
          setProvider(pData);
          console.log('Provider state set successfully:', pData);

          // Get availabilities
          let { data: aData } = await client
            .from('provider_availability')
            .select('id, day_of_week, start_time, end_time, is_available')
            .eq('provider_id', pData.id)
            .order('day_of_week', { ascending: true });

          // Seed default availabilities if none exist (Mon-Fri 9am-5pm open, Sat-Sun closed)
          if (aData && aData.length === 0) {
            console.log('No availabilities found, seeding default business hours...');
            const defaultAvailabilities = [];
            for (let i = 0; i < 7; i++) {
              const isWeekday = i >= 1 && i <= 5; // Monday (1) to Friday (5)
              defaultAvailabilities.push({
                provider_id: pData.id,
                day_of_week: i,
                start_time: '09:00:00',
                end_time: '17:00:00',
                is_available: isWeekday
              });
            }

            const { error: seedError } = await client
              .from('provider_availability')
              .insert(defaultAvailabilities);

            if (!seedError) {
              const { data: refetched } = await client
                .from('provider_availability')
                .select('id, day_of_week, start_time, end_time, is_available')
                .eq('provider_id', pData.id)
                .order('day_of_week', { ascending: true });
              if (refetched) aData = refetched;
            } else {
              console.error('Error seeding provider default availabilities:', seedError);
            }
          }

          if (aData) setAvailabilities(aData);

          // Get blocked dates
          const { data: bData } = await client
            .from('blocked_dates')
            .select('id, date, reason')
            .eq('provider_id', pData.id)
            .order('date', { ascending: true });

          if (bData) setBlockedDates(bData);
        } else {
          console.warn('No provider record found for user_id:', uData.id);
        }
      } else {
        console.warn('No user record found for clerk_user_id:', user?.id);
      }
    } catch (err) {
      console.error('Error in loadData:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      console.log('User detected, loading data...');
      loadData();
    } else {
      console.log('User not loaded yet.');
    }
  }, [user]);

  const startEditing = () => {
    setLocalHours(JSON.parse(JSON.stringify(availabilities)));
    setIsEditingHours(true);
  };

  const cancelEditing = () => {
    setIsEditingHours(false);
  };

  const handleToggleDayLocal = (dayOfWeek: number) => {
    setLocalHours((prev) =>
      prev.map((a) =>
        a.day_of_week === dayOfWeek ? { ...a, is_available: !a.is_available } : a
      )
    );
  };

  const handleUpdateTimeRangeLocal = (dayOfWeek: number, start: string, end: string) => {
    setLocalHours((prev) =>
      prev.map((a) =>
        a.day_of_week === dayOfWeek ? { ...a, start_time: start, end_time: end } : a
      )
    );
  };

  const handleSaveHours = async () => {
    setSavingHours(true);
    try {
      const client = await getDbClient();
      const promises = localHours.map((item) => {
        return client
          .from('provider_availability')
          .update({
            is_available: item.is_available,
            start_time: item.start_time,
            end_time: item.end_time,
          })
          .eq('id', item.id);
      });

      const results = await Promise.all(promises);
      const hasError = results.some((r) => r.error);
      if (hasError) {
        throw new Error('Some updates failed');
      }

      toast('Business hours saved successfully', 'success');
      setIsEditingHours(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast('Failed to save business hours', 'error');
    } finally {
      setSavingHours(false);
    }
  };

  const handleBlockDate = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleBlockDate triggered. Provider:', provider, 'Selected Date:', selectedDate);
    if (!provider) {
      console.warn('Block date ignored: provider state is null.');
      return;
    }

    setSavingBlock(true);
    try {
      const client = await getDbClient();

      const offset = selectedDate.getTimezoneOffset();
      const localDate = new Date(selectedDate.getTime() - offset * 60 * 1000);
      const formattedDate = localDate.toISOString().split('T')[0];
      console.log('Formatted block date string:', formattedDate);

      const { data, error } = await client
        .from('blocked_dates')
        .insert({
          provider_id: provider.id,
          date: formattedDate,
          is_available: false,
          reason: blockReason || null
        })
        .select();

      if (error) {
        console.error('Supabase block_dates insert error:', error);
        throw error;
      }
      
      console.log('Supabase block_dates insert success:', data);
      toast('Date blocked successfully', 'success');
      setBlockReason('');
      loadData();
    } catch (err: any) {
      console.error('Failed to block date:', err);
      toast(err.message || 'Could not block this date. It may already be blocked.', 'error');
    } finally {
      setSavingBlock(false);
    }
  };

  const handleUnblockDate = async (id: string, dateStr: string) => {
    const formattedDate = (() => {
      try {
        return new Date(dateStr).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC'
        });
      } catch (e) {
        return dateStr;
      }
    })();

    const confirmed = window.confirm(`Are you sure you want to unblock ${formattedDate}?`);
    if (!confirmed) return;

    try {
      const client = await getDbClient();
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
        <div className="flex justify-between items-center border-b border-champagne/30 pb-4 mb-2">
          <div>
            <h2 className="font-display text-xl font-bold text-espresso mb-1">Weekly Business Hours</h2>
            <p className="text-stone-500 text-xs font-sans">Set the recurring weekly times when you are open for bookings.</p>
          </div>
          {!isEditingHours && (
            <button
              onClick={startEditing}
              className="bg-accent hover:bg-teal-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
            >
              Edit Hours
            </button>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {(isEditingHours ? localHours : availabilities).map((dayData, idx) => {
            const active = dayData.is_available;

            return (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-champagne/30 last:border-b-0 last:pb-0">
                {isEditingHours ? (
                  // Edit Mode Row
                  <>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => handleToggleDayLocal(dayData.day_of_week)}
                        className="rounded text-accent focus:ring-accent w-4 h-4"
                      />
                      <span className="text-xs font-bold text-slate-800 w-24 select-none">{DOW_NAMES[dayData.day_of_week]}</span>
                    </label>

                    {active ? (
                      <div className="flex items-center gap-2 font-sans text-xs">
                        <input
                          type="time"
                          value={(dayData.start_time || '09:00:00').substring(0, 5)}
                          onChange={(e) => handleUpdateTimeRangeLocal(dayData.day_of_week, `${e.target.value}:00`, dayData.end_time || '17:00:00')}
                          className="border border-champagne rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent"
                        />
                        <span className="text-stone-400">to</span>
                        <input
                          type="time"
                          value={(dayData.end_time || '17:00:00').substring(0, 5)}
                          onChange={(e) => handleUpdateTimeRangeLocal(dayData.day_of_week, dayData.start_time || '09:00:00', `${e.target.value}:00`)}
                          className="border border-champagne rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-stone-400 italic font-sans py-1.5 pr-2">Closed</span>
                    )}
                  </>
                ) : (
                  // Read-Only Mode Row
                  <>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={active}
                        disabled
                        className="rounded text-accent/50 w-4 h-4 cursor-default opacity-60"
                      />
                      <span className="text-xs font-bold text-slate-800 w-24">{DOW_NAMES[dayData.day_of_week]}</span>
                    </div>

                    {active ? (
                      <span className="text-xs text-slate-700 font-sans font-medium py-1.5">
                        {formatTime12h(dayData.start_time)} to {formatTime12h(dayData.end_time)}
                      </span>
                    ) : (
                      <span className="text-xs text-stone-400 italic font-sans py-1.5 pr-2">Closed</span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {isEditingHours && (
          <div className="flex gap-4 mt-6 pt-4 border-t border-champagne/40">
            <button
              onClick={handleSaveHours}
              disabled={savingHours}
              className="bg-primary hover:bg-slate-800 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {savingHours ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : null}
              Save Changes
            </button>
            <button
              onClick={cancelEditing}
              disabled={savingHours}
              className="border border-champagne hover:bg-stone-50 text-slate-700 font-semibold text-xs px-6 py-2.5 rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>
        )}
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
                    <span className="font-bold text-slate-800 block">
                      {(() => {
                        try {
                          return new Date(b.date).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            timeZone: 'UTC'
                          });
                        } catch (e) {
                          return b.date;
                        }
                      })()}
                    </span>
                    {b.reason && <span className="text-[10px] text-stone-500 italic">Reason: {b.reason}</span>}
                  </div>
                  <button
                    onClick={() => handleUnblockDate(b.id, b.date)}
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
