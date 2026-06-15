'use strict';

interface ProviderAvailability {
  day_of_week: number;
  start_time: string; // "HH:MM:SS" or "HH:MM"
  end_time: string;
  is_available: boolean;
}

interface BlockedDate {
  date: string; // "YYYY-MM-DD"
  is_available: boolean;
}

interface ExistingBooking {
  booking_date: string; // "YYYY-MM-DD"
  start_time: string; // "HH:MM:SS" or "HH:MM"
  end_time: string;
  status: string;
}

interface ProviderSettings {
  slot_interval_minutes: number;
  booking_notice_hours: number;
}

export interface NormalizedSlot {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Parses a "HH:MM" or "HH:MM:SS" string and combines it with a given Date object (set to local time).
 */
export function combineDateAndTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const parts = timeStr.split(':');
  const hours = Number(parts[0] || 0);
  const minutes = Number(parts[1] || 0);
  const seconds = Number(parts[2] || 0);

  // Return a new Date object representing this exact local date and time
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

/**
 * Formats a Date object to Supabase-compatible "YYYY-MM-DD" date string (local time).
 */
export function formatLocalSubspaceDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a Date object to Supabase-compatible "HH:MM:00" time string (local time).
 */
export function formatLocalSubspaceTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}:00`;
}

/**
 * Calculates available slots for a provider on a specific date.
 */
export function getAvailableSlots(
  selectedDateStr: string, // "YYYY-MM-DD"
  serviceDuration: number, // in minutes
  settings: ProviderSettings,
  availabilities: ProviderAvailability[],
  blockedDates: BlockedDate[],
  bookings: ExistingBooking[]
): NormalizedSlot[] {
  const slots: NormalizedSlot[] = [];

  // 1. Skip blocked dates
  const isBlocked = blockedDates.some(
    (b) => b.date === selectedDateStr && !b.is_available
  );
  if (isBlocked) {
    return [];
  }

  // 2. Identify the working hours for this day of week
  const selectedDate = new Date(selectedDateStr + 'T12:00:00'); // set safe hour to parse DOW in local time
  const dayOfWeek = selectedDate.getDay();

  const dayAvailability = availabilities.find(
    (a) => a.day_of_week === dayOfWeek && a.is_available
  );
  if (!dayAvailability) {
    return [];
  }

  // 3. Generate candidate slots inside working hours
  const startWorkingDate = combineDateAndTime(selectedDateStr, dayAvailability.start_time);
  const endWorkingDate = combineDateAndTime(selectedDateStr, dayAvailability.end_time);

  const slotIntervalMs = settings.slot_interval_minutes * 60 * 1000;
  const serviceDurationMs = serviceDuration * 60 * 1000;
  const now = new Date();
  const noticeCutoffTime = now.getTime() + settings.booking_notice_hours * 60 * 60 * 1000;

  let currentStart = startWorkingDate.getTime();
  const endWorkingLimit = endWorkingDate.getTime();

  while (currentStart + serviceDurationMs <= endWorkingLimit) {
    const currentEnd = currentStart + serviceDurationMs;

    const startDate = new Date(currentStart);
    const endDate = new Date(currentEnd);

    // Respect booking notice time (only allow slots after current time + notice notice_hours)
    if (currentStart >= noticeCutoffTime) {
      // 4. Overlap checks with existing appointments (ignoring cancelled ones)
      const isOverlapping = bookings.some((booking) => {
        if (booking.status === 'cancelled') return false;

        const bookingStart = combineDateAndTime(booking.booking_date, booking.start_time).getTime();
        const bookingEnd = combineDateAndTime(booking.booking_date, booking.end_time).getTime();

        // Overlap rule: new_start < existing_end AND new_end > existing_start
        return currentStart < bookingEnd && currentEnd > bookingStart;
      });

      if (!isOverlapping) {
        const formatTime = (d: Date) => {
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        };
        slots.push({
          start: startDate,
          end: endDate,
          label: `${formatTime(startDate)} - ${formatTime(endDate)}`,
        });
      }
    }

    // Advance by the slot interval
    currentStart += slotIntervalMs;
  }

  return slots;
}
