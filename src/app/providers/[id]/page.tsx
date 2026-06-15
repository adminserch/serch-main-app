'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { supabase } from '@/lib/supabase';
import { getAvailableSlots, formatLocalSubspaceDate, formatLocalSubspaceTime } from '@/lib/availability';
import { 
  ShieldCheck, 
  Star, 
  MapPin, 
  Clock, 
  DollarSign, 
  Calendar as CalendarIcon, 
  MessageSquare, 
  Globe 
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { SignInButton, SignUpButton, UserButton, useAuth, useUser } from '@clerk/nextjs';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  users: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface Provider {
  id: string;
  business_name: string;
  description: string;
  service_city: string;
  service_district: string;
  is_verified: boolean;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
}

export default function ProviderProfilePage() {
  const params = useParams();
  const router = useRouter();
  const providerId = params.id as string;

  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const [dbRole, setDbRole] = useState<string | null>(null);

  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);

  // Load user role to show appropriate navbar link
  useEffect(() => {
    async function loadUserRole() {
      if (user) {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('clerk_user_id', user.id)
            .single();
          if (userData) {
            setDbRole(userData.role);
          }
        } catch (err) {
          console.error(err);
        }
      }
    }
    loadUserRole();
  }, [user]);

  // Load provider details, services, reviews
  useEffect(() => {
    async function loadData() {
      try {
        // 1. Fetch provider details
        const { data: pData } = await supabase
          .from('providers')
          .select('id, business_name, description, service_city, service_district, is_verified, latitude, longitude, website')
          .eq('id', providerId)
          .single();

        if (pData) {
          setProvider(pData);
        } else {
          // Fallback static profile
          setProvider({
            id: providerId,
            business_name: 'Elena Rostova & Partners',
            description: 'Specializing in high-end residential interior designs and custom renovations with over 15 years of experience. We offer bespoke space planning, detailing, project management, and styling.',
            service_city: 'Manila',
            service_district: 'Makati',
            is_verified: true,
            latitude: 14.5547,
            longitude: 121.0244,
            website: 'www.elenarostova.com'
          });
        }

        // 2. Fetch services
        const { data: sData } = await supabase
          .from('services')
          .select('id, name, description, price, duration_minutes')
          .eq('provider_id', providerId)
          .eq('is_active', true);

        if (sData && sData.length > 0) {
          setServices(sData);
          setSelectedService(sData[0]);
        } else {
          // Fallback static services
          const staticServices = [
            { id: 's-1', name: 'Design Consultation', description: '1-on-1 expert spatial design layout consultation.', price: 1500, duration_minutes: 60 },
            { id: 's-2', name: 'Bespoke Carpentry Planning', description: 'Detailed plans for custom walk-in cabinets, wardrobes, and kitchen counters.', price: 4500, duration_minutes: 120 },
          ];
          setServices(staticServices);
          setSelectedService(staticServices[0]);
        }

        // 3. Fetch reviews
        const { data: rData } = await supabase
          .from('reviews')
          .select(`
            id,
            rating,
            comment,
            created_at,
            users (
              full_name,
              avatar_url
            )
          `)
          .eq('provider_id', providerId);

        if (rData) {
          setReviews(rData as any);
        } else {
          setReviews([
            {
              id: 'rev-1',
              rating: 5,
              comment: 'Elena and her team completely transformed our Makati condo. Her attention to detail and choice of textures was exceptional.',
              created_at: new Date().toISOString(),
              users: { full_name: 'Sophia Anderson', avatar_url: null }
            }
          ]);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      }
    }
    loadData();
  }, [providerId]);

  // Load and calculate slots when date or service changes
  useEffect(() => {
    if (!providerId || !selectedService) return;

    async function loadSlots() {
      try {
        const dateStr = formatLocalSubspaceDate(selectedDate);

        // Fetch settings, availabilities, blocked dates, and bookings for this provider
        const { data: settings } = await supabase
          .from('provider_settings')
          .select('slot_interval_minutes, booking_notice_hours')
          .eq('provider_id', providerId)
          .single();

        const { data: avail } = await supabase
          .from('provider_availability')
          .select('day_of_week, start_time, end_time, is_available')
          .eq('provider_id', providerId);

        const { data: blocked } = await supabase
          .from('blocked_dates')
          .select('date, is_available')
          .eq('provider_id', providerId);

        const { data: bookings } = await supabase
          .from('bookings')
          .select('booking_date, start_time, end_time, status')
          .eq('provider_id', providerId)
          .eq('booking_date', dateStr);

        // Set default settings/availabilities if not in DB
        const providerSettings = settings || { slot_interval_minutes: 30, booking_notice_hours: 2 };
        const providerAvail = avail && avail.length > 0 ? avail : [
          { day_of_week: 1, start_time: '09:00:00', end_time: '18:00:00', is_available: true },
          { day_of_week: 2, start_time: '09:00:00', end_time: '18:00:00', is_available: true },
          { day_of_week: 3, start_time: '09:00:00', end_time: '18:00:00', is_available: true },
          { day_of_week: 4, start_time: '09:00:00', end_time: '18:00:00', is_available: true },
          { day_of_week: 5, start_time: '09:00:00', end_time: '18:00:00', is_available: true },
        ];
        const providerBlocked = blocked || [];
        const providerBookings = bookings || [];

        const generated = getAvailableSlots(
          dateStr,
          selectedService!.duration_minutes,
          providerSettings,
          providerAvail,
          providerBlocked,
          providerBookings
        );

        setAvailableSlots(generated);
        setSelectedSlot(null);
      } catch (err) {
        console.error(err);
      }
    }
    loadSlots();
  }, [providerId, selectedService, selectedDate]);

  const handleBook = () => {
    if (!selectedService || !selectedSlot) return;

    const dateStr = formatLocalSubspaceDate(selectedDate);
    const startStr = formatLocalSubspaceTime(selectedSlot.start);
    const endStr = formatLocalSubspaceTime(selectedSlot.end);

    router.push(
      `/checkout?providerId=${providerId}&serviceId=${selectedService.id}&date=${dateStr}&start=${startStr}&end=${endStr}`
    );
  };

  if (!provider) {
    return (
      <div className="flex-grow flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const avgRating = reviews.length > 0 
    ? Number((reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(2)) 
    : 5.0;

  return (
    <div className="flex flex-col min-h-screen bg-stone-50/50">
      {/* Top Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-champagne/50 shadow-sm">
        <div className="flex justify-between items-center px-6 md:px-12 h-20 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-10">
            <Link href="/" className="font-display text-2xl font-bold text-primary tracking-tight">
              Serch
            </Link>
            <div className="hidden md:flex gap-8 items-center">
              <Link href="/search" className="text-stone-600 font-medium hover:text-accent transition-colors text-sm tracking-wide">
                Find Professionals
              </Link>
              {dbRole === 'provider' && (
                <Link href="/dashboard" className="text-stone-600 font-medium hover:text-accent transition-colors text-sm tracking-wide">
                  Provider Dashboard
                </Link>
              )}
              {dbRole === 'admin' && (
                <Link href="/admin" className="text-stone-600 font-medium hover:text-accent transition-colors text-sm tracking-wide">
                  Admin Panel
                </Link>
              )}
              {isSignedIn && dbRole === 'seeker' && (
                <Link href="/bookings" className="text-stone-600 font-medium hover:text-accent transition-colors text-sm tracking-wide">
                  My Bookings
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isSignedIn ? (
              <div className="flex items-center gap-4">
                <UserButton />
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <SignInButton mode="modal">
                  <button className="text-stone-600 font-semibold hover:text-accent transition-colors text-sm tracking-wide">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="bg-primary hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-sm">
                    Become a Pro
                  </button>
                </SignUpButton>
              </div>
            )}
          </div>
        </div>
      </nav>
      {/* Main Content Body */}
      <main className="flex-grow pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row gap-10">
          {/* Left side: Profile Info, Map, Reviews */}
          <div className="w-full lg:w-3/5 flex flex-col gap-8">
            <div className="bg-white border border-champagne/60 rounded-2xl p-8 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h1 className="font-display text-3xl font-bold text-espresso">{provider.business_name}</h1>
                {provider.is_verified && (
                  <div className="bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                    <ShieldCheck className="w-4 h-4" /> Serch Verified
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-stone-500 mb-6 font-sans">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="font-semibold text-slate-700">{avgRating}</span>
                  <span>({reviews.length} Reviews)</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{provider.service_district}, {provider.service_city}</span>
                </div>
              </div>

              <p className="text-stone-600 font-sans leading-relaxed mb-6">
                {provider.description}
              </p>

              {provider.website && (
                <div className="flex items-center gap-2 text-xs text-accent font-sans font-medium">
                  <Globe className="w-4 h-4" />
                  <a href={`https://${provider.website}`} target="_blank" rel="noreferrer" className="hover:underline">
                    {provider.website}
                  </a>
                </div>
              )}
            </div>

            {/* Map Pinned Location */}
            <div>
              <h2 className="font-display text-xl font-bold text-espresso mb-4">Location</h2>
              <Map 
                latitude={provider.latitude} 
                longitude={provider.longitude} 
                viewOnly={true} 
              />
            </div>

            {/* Reviews Section */}
            <div>
              <h2 className="font-display text-xl font-bold text-espresso mb-6">Customer Reviews</h2>
              <div className="flex flex-col gap-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="bg-white border border-champagne/50 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-champagne/40 flex items-center justify-center font-bold text-accent font-sans">
                          {rev.users.full_name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-display font-semibold text-espresso text-sm">{rev.users.full_name}</h4>
                          <span className="text-[10px] text-stone-400 font-sans">
                            {new Date(rev.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating ? 'text-amber-500 fill-amber-500' : 'text-stone-200'
                            }`} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-stone-600 text-sm font-sans leading-relaxed">
                      {rev.comment}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right side: Interactive Calendar & Checkout Selection */}
          <div className="w-full lg:w-2/5 flex flex-col gap-8">
            <div className="bg-white border border-champagne/60 rounded-2xl p-6 shadow-md sticky top-36">
              <h2 className="font-display text-xl font-bold text-espresso mb-6">Book an Appointment</h2>

              {/* Service Selector */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Select Service</label>
                <div className="flex flex-col gap-2">
                  {services.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedService(s)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                        selectedService?.id === s.id
                          ? 'bg-accent/5 border-accent'
                          : 'bg-white border-champagne/80 hover:border-gold'
                      }`}
                    >
                      <div>
                        <h3 className="font-sans font-semibold text-espresso text-sm">{s.name}</h3>
                        <p className="text-[11px] text-stone-400 font-sans mt-0.5">{s.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-stone-500">
                          <span className="flex items-center gap-0.5"><Clock className="w-3.5 h-3.5 text-stone-400" /> {s.duration_minutes} min</span>
                          <span className="flex items-center gap-0.5"><DollarSign className="w-3.5 h-3.5 text-stone-400" /> {s.price} PHP</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Picker */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Select Date</label>
                <Calendar
                  onChange={(val) => setSelectedDate(val as Date)}
                  value={selectedDate}
                  minDate={new Date()}
                />
              </div>

              {/* Slots Selector */}
              {selectedService && (
                <div className="mb-8">
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                    Available Slots ({availableSlots.length})
                  </label>
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {availableSlots.map((slot, idx) => {
                        const isSelected = selectedSlot?.start.getTime() === slot.start.getTime();
                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-2 px-3 rounded-lg text-xs font-medium font-sans border text-center transition-all ${
                              isSelected
                                ? 'bg-accent border-accent text-white shadow-sm'
                                : 'bg-stone-50 border-champagne hover:border-gold text-slate-700'
                            }`}
                          >
                            {slot.label.split(' - ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-stone-50 border border-dashed border-stone-200 text-center text-xs text-stone-400 font-sans">
                      No slots available on this date.
                    </div>
                  )}
                </div>
              )}

              {/* Checkout Trigger */}
              <button
                onClick={handleBook}
                disabled={!selectedSlot || !selectedService}
                className={`w-full py-3.5 rounded-xl text-center text-sm font-semibold transition-all shadow-sm ${
                  selectedSlot && selectedService
                    ? 'bg-primary hover:bg-slate-800 text-white cursor-pointer'
                    : 'bg-stone-100 border border-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                Confirm & Proceed
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-espresso text-stone-300 w-full py-16 mt-auto border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <div>
            <div className="font-display text-xl font-bold text-white mb-2 tracking-tight">Serch</div>
            <p className="text-xs text-stone-400 max-w-sm">
              Connecting premium local service professionals with seeking clients. Verified quality, transparent calendars, secure bookings.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-xs font-medium font-sans">
            <Link href="#" className="hover:text-white transition-colors">Trust &amp; Safety</Link>
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-12 border-t border-stone-800 mt-8 pt-8 text-center text-xs text-stone-500 font-sans">
          &copy; 2026 Serch Technologies. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
