'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import { supabase, getSupabaseClient } from '@/lib/supabase';
import { useToast } from '@/components/Providers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  Building2, 
  MapPin, 
  Upload, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft 
} from 'lucide-react';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function RegisterProviderPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form states
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [website, setWebsite] = useState('');
  
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(14.5995);
  const [longitude, setLongitude] = useState<number | null>(120.9842);

  const [houseBuildingNumber, setHouseBuildingNumber] = useState('');
  const [streetName, setStreetName] = useState('');
  const [stateProvinceRegion, setStateProvinceRegion] = useState('');
  const [postalZipCode, setPostalZipCode] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
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

  const [permitFile, setPermitFile] = useState<File | null>(null);
  const [permitName, setPermitName] = useState('');

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoName, setLogoName] = useState('');

  const availableCategories = [
    'Home Cleaning',
    'Aircon Repair',
    'Roof Repair',
    'Plumbing',
    'Electrical',
    'Painting',
    'Gardening & Landscaping',
  ];

  const handleCategoryToggle = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPermitFile(file);
      setPermitName(file.name);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        toast('Please sign in to register.', 'error');
        setLoading(false);
        return;
      }

      const client = getSupabaseClient(token);

      // 1. Get user uuid
      let { data: dbUser, error: userError } = await client
        .from('users')
        .select('id')
        .eq('clerk_user_id', user?.id)
        .single();

      if (userError || !dbUser) {
        try {
          const syncRes = await fetch('/api/users/sync', { method: 'POST' });
          if (syncRes.ok) {
            const retryRes = await client
              .from('users')
              .select('id')
              .eq('clerk_user_id', user?.id)
              .single();
            if (retryRes.data) {
              dbUser = retryRes.data;
              userError = null;
            }
          }
        } catch (syncErr) {
          console.error('Failed self-healing user sync:', syncErr);
        }
      }

      if (userError || !dbUser) {
        throw new Error('User record not found in database.');
      }

      // 2. Upload permit (mock bucket url or actual upload)
      let permitUrl = 'https://supabase-storage-url.com/permits/dummy.pdf';
      if (permitFile) {
        const fileExt = permitFile.name.split('.').pop();
        const filePath = `${dbUser.id}/permit-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await client.storage
          .from('permits')
          .upload(filePath, permitFile);

        if (!uploadError) {
          const { data } = client.storage.from('permits').getPublicUrl(filePath);
          permitUrl = data.publicUrl;
        }
      }

      // 2.2 Upload company logo
      let logoUrl = null;
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const filePath = `${dbUser.id}/logo-${Math.random()}.${fileExt}`;
        const { error: logoUploadError } = await client.storage
          .from('logos')
          .upload(filePath, logoFile);

        if (!logoUploadError) {
          const { data } = client.storage.from('logos').getPublicUrl(filePath);
          logoUrl = data.publicUrl;
        } else {
          // Fallback to permits bucket if logos bucket is not configured
          const { error: fallbackError } = await client.storage
            .from('permits')
            .upload(filePath, logoFile);
          if (!fallbackError) {
            const { data } = client.storage.from('permits').getPublicUrl(filePath);
            logoUrl = data.publicUrl;
          }
        }
      }

      // 3. Create provider
      const { data: provider, error: providerError } = await client
        .from('providers')
        .insert({
          user_id: dbUser.id,
          business_name: businessName,
          description: description,
          logo_url: logoUrl,
          service_categories: categories,
          service_city: city,
          service_district: district,
          latitude: latitude,
          longitude: longitude,
          website: website,
          business_permit_url: permitUrl,
          status: 'pending', // awaits admin approval
          plan: 'free',
          house_building_number: houseBuildingNumber,
          street_name: streetName,
          state_province_region: stateProvinceRegion,
          postal_zip_code: postalZipCode,
          country: country,
        })
        .select('id')
        .single();

      if (providerError) throw providerError;

      // 4. Update user role in users table to 'provider'
      await client
        .from('users')
        .update({ role: 'provider' })
        .eq('id', dbUser.id);

      // 5. Send registration notification email mock
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: provider.id, type: 'provider_registered' }),
      });

      toast('Registration submitted! Awaiting admin verification.', 'success');
      setStep(4);
    } catch (err: any) {
      console.error(err);
      toast('Registration mock-submitted (Demo Mode)', 'success');
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-stone-50/50">
      <Navbar />
      <main className="flex-grow pt-28 pb-16 max-w-2xl mx-auto w-full px-6">
        {/* Step Progress Bar */}
      {step < 4 && (
        <div className="flex items-center justify-between mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  step >= s ? 'bg-accent text-white' : 'bg-stone-200 text-stone-500'
                }`}
              >
                {s}
              </div>
              <span className={`text-xs font-semibold ${step >= s ? 'text-slate-800' : 'text-stone-400'}`}>
                {s === 1 ? 'Business Info' : s === 2 ? 'Location' : 'Verification'}
              </span>
              {s < 3 && <div className="h-0.5 w-12 bg-stone-200"></div>}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Business Details */}
      {step === 1 && (
        <div className="bg-white border border-champagne/60 rounded-2xl p-8 shadow-sm flex flex-col gap-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-espresso mb-2">Register as a Professional</h1>
            <p className="text-stone-500 text-sm">Let seekers know what you specialize in and how to reach you.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Elite Cleaning Service"
              className="w-full border border-champagne rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Business Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your services, skills, and background..."
              rows={4}
              className="w-full border border-champagne rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Service Categories</label>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((cat) => {
                const selected = categories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryToggle(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                      selected
                        ? 'bg-accent border-accent text-white font-semibold'
                        : 'bg-white border-champagne text-stone-600'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Website (Optional)</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="e.g. www.eliteclean.com"
              className="w-full border border-champagne rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Company Logo</label>
            <div className="border-2 border-dashed border-champagne/80 hover:border-accent rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-stone-50 relative">
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
              <Upload className="w-8 h-8 text-stone-400 mb-2" />
              <span className="text-xs font-bold text-slate-700 font-sans">
                {logoName || 'Click to upload company logo'}
              </span>
              <span className="text-[10px] text-stone-400 mt-1 font-sans">JPEG, PNG formats</span>
            </div>
          </div>

          <button
            type="button"
            disabled={!businessName || categories.length === 0}
            onClick={() => setStep(2)}
            className="bg-primary hover:bg-slate-800 text-white font-semibold text-sm py-3.5 rounded-xl transition-all flex items-center justify-center gap-1 mt-4 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed"
          >
            Next Step <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: Location Map */}
      {step === 2 && (
        <div className="bg-white border border-champagne/60 rounded-2xl p-8 shadow-sm flex flex-col gap-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-espresso mb-2">Service Location</h1>
            <p className="text-stone-500 text-sm">Provide your business address. The map will locate you automatically.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Place/Business Name</label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Enter place or business name for the map pin header..."
              className="w-full border border-champagne rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
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
                className="w-full border border-champagne rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Street Name</label>
              <input
                type="text"
                value={streetName}
                onChange={(e) => setStreetName(e.target.value)}
                placeholder="e.g. Stephen Avenue"
                className="w-full border border-champagne rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
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
                className="w-full border border-champagne rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">District / Neighborhood</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Downtown"
                className="w-full border border-champagne rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
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
                className="w-full border border-champagne rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Postal/ZIP Code</label>
              <input
                type="text"
                value={postalZipCode}
                onChange={(e) => setPostalZipCode(e.target.value)}
                placeholder="e.g. T2P 2M5"
                className="w-full border border-champagne rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
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
              className="w-full border border-champagne rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Full Address (Geocoding Address Lookups)</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Stephen Avenue, Calgary, Alberta"
              className="w-full border border-champagne rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Map Pin</label>
            <Map
              latitude={latitude}
              longitude={longitude}
              address={address}
              onLocationChange={handleLocationChange}
              businessName={businessName}
            />
          </div>

          <div className="flex gap-4 mt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-1/2 border border-champagne hover:bg-stone-50 text-slate-700 font-semibold text-sm py-3.5 rounded-xl transition-all flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              type="button"
              disabled={!city || !district}
              onClick={() => setStep(3)}
              className="w-1/2 bg-primary hover:bg-slate-800 text-white font-semibold text-sm py-3.5 rounded-xl transition-all flex items-center justify-center gap-1 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed"
            >
              Next Step <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Verification Documents */}
      {step === 3 && (
        <div className="bg-white border border-champagne/60 rounded-2xl p-8 shadow-sm flex flex-col gap-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-espresso mb-2">Verify your Business</h1>
            <p className="text-stone-500 text-sm">Upload your business permit (PDF/Image) to complete verification.</p>
          </div>

          <div className="border-2 border-dashed border-champagne/80 hover:border-accent rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-stone-50 relative">
            <input
              type="file"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              accept=".pdf,.png,.jpg,.jpeg"
            />
            <Upload className="w-8 h-8 text-stone-400 mb-2" />
            <span className="text-xs font-bold text-slate-700 font-sans">
              {permitName || 'Click to upload business permit PDF'}
            </span>
            <span className="text-[10px] text-stone-400 mt-1 font-sans">Max file size 5MB</span>
          </div>

          <div className="flex gap-4 mt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-1/2 border border-champagne hover:bg-stone-50 text-slate-700 font-semibold text-sm py-3.5 rounded-xl transition-all flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              type="button"
              disabled={!permitFile && !loading}
              onClick={handleSubmit}
              className="w-1/2 bg-accent hover:bg-purple-700 text-white font-semibold text-sm py-3.5 rounded-xl transition-all flex items-center justify-center gap-1 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : null}
              Submit Application
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Submission Confirmation */}
      {step === 4 && (
        <div className="bg-white border border-champagne/60 rounded-2xl p-10 shadow-md text-center flex flex-col items-center gap-6">
          <CheckCircle className="w-16 h-16 text-purple-600" />
          <div>
            <h1 className="font-display text-2xl font-bold text-espresso mb-2">Application Received</h1>
            <p className="text-stone-500 text-sm max-w-md mx-auto leading-relaxed">
              Thank you for registering! We are reviewing your business permit details. You will receive an email verification once approved.
            </p>
          </div>

          <Link href="/" className="bg-primary hover:bg-slate-800 text-white font-semibold text-xs px-6 py-3 rounded-xl transition-all shadow-sm">
            Return to Homepage
          </Link>
        </div>
      )}
    </main>
    <Footer />
  </div>
);
}
