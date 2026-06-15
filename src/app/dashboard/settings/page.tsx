'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { supabase, getSupabaseClient } from '@/lib/supabase';
import { useToast } from '@/components/Providers';
import { Settings, MapPin, Clock, Save } from 'lucide-react';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function ProviderSettings() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();

  const [provider, setProvider] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // User details states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Form states
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Booking config states
  const [slotInterval, setSlotInterval] = useState(30);
  const [bookingNotice, setBookingNotice] = useState(2);

  async function loadData() {
    try {
      const token = await getToken();
      if (!token) return;

      const client = getSupabaseClient(token);

      const { data: uData } = await client
        .from('users')
        .select('id, full_name, email, phone')
        .eq('clerk_user_id', user?.id)
        .single();

      if (uData) {
        setFullName(uData.full_name || '');
        setEmail(uData.email || '');
        setPhone(uData.phone || '');

        // Fetch provider
        const { data: pData } = await client
          .from('providers')
          .select('id, business_name, description, service_city, service_district, latitude, longitude, website')
          .eq('user_id', uData.id)
          .single();

        if (pData) {
          setProvider(pData);
          setBusinessName(pData.business_name);
          setDescription(pData.description || '');
          setWebsite(pData.website || '');
          setCity(pData.service_city);
          setDistrict(pData.service_district);
          setLatitude(pData.latitude);
          setLongitude(pData.longitude);
          
          // Populate the geocoding search address with saved city & district
          const districtPart = pData.service_district ? pData.service_district : '';
          const cityPart = pData.service_city ? pData.service_city : '';
          setAddress(`${districtPart}${districtPart && cityPart ? ', ' : ''}${cityPart}`);

          // Fetch provider settings
          const { data: sData } = await client
            .from('provider_settings')
            .select('slot_interval_minutes, booking_notice_hours')
            .eq('provider_id', pData.id)
            .single();

          if (sData) {
            setSettings(sData);
            setSlotInterval(sData.slot_interval_minutes);
            setBookingNotice(sData.booking_notice_hours);
          } else {
            // Seed settings if they don't exist
            const { data: newSettings } = await client
              .from('provider_settings')
              .insert({
                provider_id: pData.id,
                slot_interval_minutes: 30,
                booking_notice_hours: 2
              })
              .select('slot_interval_minutes, booking_notice_hours')
              .single();

            if (newSettings) {
              setSettings(newSettings);
              setSlotInterval(newSettings.slot_interval_minutes);
              setBookingNotice(newSettings.booking_notice_hours);
            }
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

  const handleLocationChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) return;

    setSaving(true);
    try {
      const token = await getToken();
      const client = getSupabaseClient(token);

      // Get user ID
      const { data: uData } = await client
        .from('users')
        .select('id')
        .eq('clerk_user_id', user?.id)
        .single();

      if (!uData) throw new Error('User record not found');

      // Update user details
      const { error: uError } = await client
        .from('users')
        .update({
          full_name: fullName,
          email,
          phone
        })
        .eq('id', uData.id);

      if (uError) throw uError;

      // Update provider business details
      const { error: pError } = await client
        .from('providers')
        .update({
          business_name: businessName,
          description,
          website,
          service_city: city,
          service_district: district,
          latitude,
          longitude
        })
        .eq('id', provider.id);

      if (pError) throw pError;

      // Update settings
      const { error: sError } = await client
        .from('provider_settings')
        .upsert({
          provider_id: provider.id,
          slot_interval_minutes: slotInterval,
          booking_notice_hours: bookingNotice
        }, { onConflict: 'provider_id' });

      if (sError) throw sError;

      toast('Settings saved successfully', 'success');
      loadData();
    } catch (err) {
      toast('Failed to save settings.', 'error');
    } finally {
      setSaving(false);
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
    <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Columns: Profile details & Map */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* Personal / Account Details */}
        <div className="bg-white border border-champagne/60 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
          <h2 className="font-display font-semibold text-espresso text-base flex items-center gap-1.5 border-b border-champagne/40 pb-2">
            <Settings className="w-4 h-4 text-accent" /> Account Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +63 917 123 4567"
              className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="bg-white border border-champagne/60 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
          <h2 className="font-display font-semibold text-espresso text-base flex items-center gap-1.5 border-b border-champagne/40 pb-2">
            <Settings className="w-4 h-4 text-accent" /> Business Profile
          </h2>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Business Name</label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">About / Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Website</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Location Mapping Settings */}
        <div className="bg-white border border-champagne/60 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
          <h2 className="font-display font-semibold text-espresso text-base flex items-center gap-1.5 border-b border-champagne/40 pb-2">
            <MapPin className="w-4 h-4 text-accent" /> Location Settings
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">City</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">District</label>
              <input
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Geocoding Address Lookups</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Search address to adjust map..."
              className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Map Location Pin</label>
            <Map
              latitude={latitude}
              longitude={longitude}
              address={address}
              onLocationChange={handleLocationChange}
            />
          </div>
        </div>
      </div>

      {/* Right Column: Booking configurations & save button */}
      <div className="flex flex-col gap-6">
        <div className="bg-white border border-champagne/60 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
          <h2 className="font-display font-semibold text-espresso text-base flex items-center gap-1.5 border-b border-champagne/40 pb-2">
            <Clock className="w-4 h-4 text-accent" /> Booking Rules
          </h2>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Slot Interval (Minutes)</label>
            <select
              value={slotInterval}
              onChange={(e) => setSlotInterval(Number(e.target.value))}
              className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs bg-white focus:outline-none focus:border-accent"
            >
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes</option>
              <option value={45}>45 Minutes</option>
              <option value={60}>60 Minutes</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Minimum Booking Notice (Hours)</label>
            <select
              value={bookingNotice}
              onChange={(e) => setBookingNotice(Number(e.target.value))}
              className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs bg-white focus:outline-none focus:border-accent"
            >
              <option value={1}>1 Hour</option>
              <option value={2}>2 Hours</option>
              <option value={4}>4 Hours</option>
              <option value={12}>12 Hours</option>
              <option value={24}>24 Hours (1 Day)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-primary hover:bg-slate-800 text-white font-semibold text-sm py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Settings
        </button>
      </div>
    </form>
  );
}
