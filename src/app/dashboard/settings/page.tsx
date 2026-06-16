'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { supabase, getSupabaseClient } from '@/lib/supabase';
import { useToast } from '@/components/Providers';
import { Settings, MapPin, Clock, Save, Upload, X } from 'lucide-react';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function ProviderSettings() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();

  const [provider, setProvider] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [savingBookingRules, setSavingBookingRules] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Sync theme with HTML class and global events
  useEffect(() => {
    function checkTheme() {
      if (typeof window !== 'undefined') {
        const isDarkTheme = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
        setIsDark(isDarkTheme);
      }
    }
    checkTheme();
    window.addEventListener('theme-change', checkTheme);
    return () => window.removeEventListener('theme-change', checkTheme);
  }, []);

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

  const [houseBuildingNumber, setHouseBuildingNumber] = useState('');
  const [streetName, setStreetName] = useState('');
  const [stateProvinceRegion, setStateProvinceRegion] = useState('');
  const [postalZipCode, setPostalZipCode] = useState('');
  const [country, setCountry] = useState('');

  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoName, setLogoName] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  useEffect(() => {
    // Dynamically compile geocoding address
    const parts = [
      houseBuildingNumber,
      streetName,
      district,
      city,
      stateProvinceRegion,
      postalZipCode,
      country
    ].filter(Boolean);
    setAddress(parts.join(', '));
  }, [houseBuildingNumber, streetName, district, city, stateProvinceRegion, postalZipCode, country]);

  // Booking config states
  const [slotInterval, setSlotInterval] = useState(30);
  const [bookingNotice, setBookingNotice] = useState(2);

  const [useAdminBypass, setUseAdminBypass] = useState(false);

  async function loadData() {
    try {
      const token = await getToken();
      let client = getSupabaseClient(token);
      if (useAdminBypass) {
        client = supabase;
      }

      let uData = null;
      try {
        const res = await client
          .from('users')
          .select('id, full_name, email, phone')
          .eq('clerk_user_id', user?.id)
          .single();
        if (res.error) throw res.error;
        uData = res.data;
      } catch (err) {
        console.warn('Users select error, falling back to public supabase:', err);
        setUseAdminBypass(true);
        client = supabase;
        const res = await supabase
          .from('users')
          .select('id, full_name, email, phone')
          .eq('clerk_user_id', user?.id)
          .single();
        uData = res.data;
      }

      if (uData) {
        setFullName(uData.full_name || user?.fullName || '');
        setEmail(uData.email || user?.primaryEmailAddress?.emailAddress || '');
        setPhone(uData.phone || user?.primaryPhoneNumber?.phoneNumber || '');

        // Fetch provider
        let pData = null;
        try {
          const res = await client
            .from('providers')
            .select('id, business_name, description, service_city, service_district, latitude, longitude, website, house_building_number, street_name, state_province_region, postal_zip_code, country, logo_url')
            .eq('user_id', uData.id)
            .single();
          if (res.error) throw res.error;
          pData = res.data;
        } catch (err) {
          console.warn('Providers select error, falling back to public supabase:', err);
          const res = await supabase
            .from('providers')
            .select('id, business_name, description, service_city, service_district, latitude, longitude, website, house_building_number, street_name, state_province_region, postal_zip_code, country, logo_url')
            .eq('user_id', uData.id)
            .single();
          pData = res.data;
        }

        if (pData) {
          setProvider(pData);
          setBusinessName(pData.business_name || '');
          setDescription(pData.description || '');
          setWebsite(pData.website || '');
          setCity(pData.service_city || '');
          setDistrict(pData.service_district || '');
          setLatitude(pData.latitude);
          setLongitude(pData.longitude);
          setHouseBuildingNumber(pData.house_building_number || '');
          setStreetName(pData.street_name || '');
          setStateProvinceRegion(pData.state_province_region || '');
          setPostalZipCode(pData.postal_zip_code || '');
          setCountry(pData.country || '');
          setLogoUrl(pData.logo_url || '');

          // Fetch provider settings
          let sData = null;
          try {
            const res = await client
              .from('provider_settings')
              .select('slot_interval_minutes, booking_notice_hours')
              .eq('provider_id', pData.id)
              .single();
            if (res.error) throw res.error;
            sData = res.data;
          } catch (err) {
            console.warn('Provider settings select error, falling back to public supabase:', err);
            const res = await supabase
              .from('provider_settings')
              .select('slot_interval_minutes, booking_notice_hours')
              .eq('provider_id', pData.id)
              .single();
            sData = res.data;
          }

          if (sData) {
            setSettings(sData);
            setSlotInterval(sData.slot_interval_minutes || 30);
            setBookingNotice(sData.booking_notice_hours || 2);
          } else {
            // Seed settings if they don't exist
            let newSettings = null;
            try {
              const res = await client
                .from('provider_settings')
                .insert({
                  provider_id: pData.id,
                  slot_interval_minutes: 30,
                  booking_notice_hours: 2
                })
                .select('slot_interval_minutes, booking_notice_hours')
                .single();
              if (res.error) throw res.error;
              newSettings = res.data;
            } catch (err) {
              console.warn('Provider settings seed error, falling back to public supabase:', err);
              const res = await supabase
                .from('provider_settings')
                .insert({
                  provider_id: pData.id,
                  slot_interval_minutes: 30,
                  booking_notice_hours: 2
                })
                .select('slot_interval_minutes, booking_notice_hours')
                .single();
              newSettings = res.data;
            }

            if (newSettings) {
              setSettings(newSettings);
              setSlotInterval(newSettings.slot_interval_minutes || 30);
              setBookingNotice(newSettings.booking_notice_hours || 2);
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

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    try {
      const token = await getToken();
      let client = getSupabaseClient(token);
      if (useAdminBypass) {
        client = supabase;
      }

      // Get user ID
      let uData = null;
      try {
        const res = await client
          .from('users')
          .select('id')
          .eq('clerk_user_id', user?.id)
          .single();
        if (res.error) throw res.error;
        uData = res.data;
      } catch (err) {
        client = supabase;
        setUseAdminBypass(true);
        const res = await supabase
          .from('users')
          .select('id')
          .eq('clerk_user_id', user?.id)
          .single();
        uData = res.data;
      }

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

      toast('Account details saved successfully', 'success');
      loadData();
    } catch (err) {
      console.error(err);
      toast('Failed to save account details.', 'error');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) return;

    setSavingBusiness(true);
    try {
      const token = await getToken();
      let client = getSupabaseClient(token);
      if (useAdminBypass) {
        client = supabase;
      }

      // Upload Company Logo if changed
      let uploadLogoUrl = logoUrl;
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const filePath = `${provider.id}/logo-${Math.random()}.${fileExt}`;
        const { error: logoUploadError } = await client.storage
          .from('logos')
          .upload(filePath, logoFile);

        if (!logoUploadError) {
          const { data } = client.storage.from('logos').getPublicUrl(filePath);
          uploadLogoUrl = data.publicUrl;
        } else {
          // Fallback to permits bucket
          const { error: fallbackError } = await client.storage
            .from('permits')
            .upload(filePath, logoFile);
          if (!fallbackError) {
            const { data } = client.storage.from('permits').getPublicUrl(filePath);
            uploadLogoUrl = data.publicUrl;
          }
        }
      }

      // Update provider business details
      const { error: pError } = await client
        .from('providers')
        .update({
          business_name: businessName,
          description,
          website,
          logo_url: uploadLogoUrl
        })
        .eq('id', provider.id);

      if (pError) throw pError;

      toast('Business profile saved successfully', 'success');
      loadData();
    } catch (err) {
      console.error(err);
      toast('Failed to save business profile.', 'error');
    } finally {
      setSavingBusiness(false);
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) return;

    setSavingLocation(true);
    try {
      const token = await getToken();
      let client = getSupabaseClient(token);
      if (useAdminBypass) {
        client = supabase;
      }

      // Split address to extract city and district
      const parts = address.split(',').map((p: string) => p.trim()).filter(Boolean);
      let saveDistrict = '';
      let saveCity = '';
      if (parts.length === 1) {
        saveCity = parts[0];
        saveDistrict = parts[0];
      } else if (parts.length === 2) {
        saveDistrict = parts[0];
        saveCity = parts[1];
      } else {
        saveCity = parts[parts.length - 1];
        saveDistrict = parts[parts.length - 2];
      }

      setCity(saveCity);
      setDistrict(saveDistrict);

      // Update provider business details
      const { error: pError } = await client
        .from('providers')
        .update({
          business_name: businessName,
          service_city: city,
          service_district: district,
          latitude,
          longitude,
          house_building_number: houseBuildingNumber,
          street_name: streetName,
          state_province_region: stateProvinceRegion,
          postal_zip_code: postalZipCode,
          country: country
        })
        .eq('id', provider.id);

      if (pError) throw pError;

      toast('Location settings saved successfully', 'success');
      loadData();
    } catch (err) {
      console.error(err);
      toast('Failed to save location settings.', 'error');
    } finally {
      setSavingLocation(false);
    }
  };

  const handleSaveBookingRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) return;

    setSavingBookingRules(true);
    try {
      const token = await getToken();
      let client = getSupabaseClient(token);
      if (useAdminBypass) {
        client = supabase;
      }

      // Update settings
      const { error: sError } = await client
        .from('provider_settings')
        .upsert({
          provider_id: provider.id,
          slot_interval_minutes: slotInterval,
          booking_notice_hours: bookingNotice
        }, { onConflict: 'provider_id' });

      if (sError) throw sError;

      toast('Booking rules saved successfully', 'success');
      loadData();
    } catch (err) {
      console.error(err);
      toast('Failed to save booking rules.', 'error');
    } finally {
      setSavingBookingRules(false);
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Columns: Profile details & Map */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* Personal / Account Details */}
        <form onSubmit={handleSaveAccount} className="bg-white border border-champagne/60 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
          <h2 className="font-display font-semibold text-espresso dark:text-accent text-base flex items-center gap-1.5 border-b border-champagne/40 pb-2">
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
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={savingAccount}
              className={`font-semibold text-xs px-6 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${
                isDark
                  ? 'bg-white-always text-slate-950 hover:bg-stone-100'
                  : 'bg-primary hover:bg-slate-800 text-white'
              }`}
            >
              {savingAccount ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Account Details
            </button>
          </div>
        </form>

        <form onSubmit={handleSaveBusiness} className="bg-white border border-champagne/60 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
          <h2 className="font-display font-semibold text-espresso dark:text-accent text-base flex items-center gap-1.5 border-b border-champagne/40 pb-2">
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

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Company Logo</label>
            <div className="border-2 border-dashed border-champagne/80 hover:border-accent rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-stone-50 relative">
              <input
                type="file"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setLogoFile(e.target.files[0]);
                    setLogoName(e.target.files[0].name);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept="image/*"
              />
              <Upload className="w-6 h-6 text-stone-400 mb-2" />
              <span className="text-xs font-bold text-slate-700 font-sans">
                {logoName || 'Click to change/upload logo'}
              </span>
              <span className="text-[10px] text-stone-400 mt-1 font-sans">JPEG, PNG formats</span>
            </div>

            {/* Logo Image Preview (rendered below the upload input box) */}
            {logoFile ? (
              <div className="mt-3 flex items-center gap-3 bg-stone-50 border border-champagne/45 p-2 rounded-xl">
                <img 
                  src={URL.createObjectURL(logoFile)} 
                  alt="New logo upload preview" 
                  onClick={() => setPreviewImageUrl(URL.createObjectURL(logoFile))}
                  className="w-12 h-12 rounded-lg object-cover border border-champagne cursor-zoom-in hover:opacity-90 transition-opacity" 
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-700">Preview of new logo</span>
                  <span className="text-[10px] text-stone-400 font-sans">{logoName}</span>
                </div>
              </div>
            ) : logoUrl ? (
              <div className="mt-3 flex items-center gap-3 bg-stone-50 border border-champagne/45 p-2 rounded-xl">
                <img 
                  src={logoUrl} 
                  alt="Current active logo preview" 
                  onClick={() => setPreviewImageUrl(logoUrl)}
                  className="w-12 h-12 rounded-lg object-cover border border-champagne cursor-zoom-in hover:opacity-90 transition-opacity" 
                />
                <span className="text-xs text-stone-500 font-sans">Current active logo</span>
              </div>
            ) : null}
          </div>
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={savingBusiness}
              className={`font-semibold text-xs px-6 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${
                isDark
                  ? 'bg-white-always text-slate-950 hover:bg-stone-100'
                  : 'bg-primary hover:bg-slate-800 text-white'
              }`}
            >
              {savingBusiness ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Business Profile
            </button>
          </div>
        </form>

        {/* Location Mapping Settings */}
        <form onSubmit={handleSaveLocation} className="bg-white border border-champagne/60 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
          <h2 className="font-display font-semibold text-espresso text-base flex items-center gap-1.5 border-b border-champagne/40 pb-2">
            <MapPin className="w-4 h-4 text-accent" /> Location Settings
          </h2>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Place/Business Name</label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Enter place or business name for the map pin header..."
              className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">House/Building Number</label>
              <input
                type="text"
                value={houseBuildingNumber}
                onChange={(e) => setHouseBuildingNumber(e.target.value)}
                placeholder="e.g. 123"
                className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Street Name</label>
              <input
                type="text"
                value={streetName}
                onChange={(e) => setStreetName(e.target.value)}
                placeholder="e.g. Stephen Avenue"
                className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">City/Locality</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Calgary"
                className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">District/Neighborhood</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Downtown"
                className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">State/Province/Region</label>
              <input
                type="text"
                value={stateProvinceRegion}
                onChange={(e) => setStateProvinceRegion(e.target.value)}
                placeholder="e.g. Alberta"
                className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Postal/ZIP Code</label>
              <input
                type="text"
                value={postalZipCode}
                onChange={(e) => setPostalZipCode(e.target.value)}
                placeholder="e.g. T2P 2M5"
                className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. Canada"
              className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Full Address (Geocoding Address Lookups)</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Stephen Avenue, Calgary, Alberta"
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
              businessName={businessName}
            />
          </div>
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={savingLocation}
              className={`font-semibold text-xs px-6 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${
                isDark
                  ? 'bg-white-always text-slate-950 hover:bg-stone-100'
                  : 'bg-primary hover:bg-slate-800 text-white'
              }`}
            >
              {savingLocation ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Location Settings
            </button>
          </div>
        </form>
      </div>

      {/* Right Column: Booking configurations */}
      <div className="flex flex-col gap-6">
        <form onSubmit={handleSaveBookingRules} className="bg-white border border-champagne/60 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
          <h2 className="font-display font-semibold text-espresso dark:text-accent text-base flex items-center gap-1.5 border-b border-champagne/40 pb-2">
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
          <div className="mt-2">
            <button
              type="submit"
              disabled={savingBookingRules}
              className={`w-full font-semibold text-xs py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                isDark
                  ? 'bg-white-always text-slate-950 hover:bg-stone-100'
                  : 'bg-primary hover:bg-slate-800 text-white'
              }`}
            >
              {savingBookingRules ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Booking Rules
            </button>
          </div>
        </form>
      </div>

      {/* Lightbox / Image Preview Modal */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-4 backdrop-blur-xs cursor-zoom-out animate-fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] flex items-center justify-center bg-black/40 rounded-2xl overflow-hidden border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-all cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={previewImageUrl} 
              alt="High resolution preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
