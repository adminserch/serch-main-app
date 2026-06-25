'use strict';
'use client';

import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { useToast } from '@/components/Providers';
import { getSupabaseClient, supabase } from '@/lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { useAuth, useUser } from '@clerk/nextjs';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Upload
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

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
  const [businessNameError, setBusinessNameError] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [website, setWebsite] = useState('');
  const [websiteError, setWebsiteError] = useState('');
  
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(14.5995);
  const [longitude, setLongitude] = useState<number | null>(120.9842);

  const [houseBuildingNumber, setHouseBuildingNumber] = useState('');
  const [streetName, setStreetName] = useState('');
  const [stateProvinceRegion, setStateProvinceRegion] = useState('');
  const [postalZipCode, setPostalZipCode] = useState('');
  const [postalError, setPostalError] = useState('');
  const [country, setCountry] = useState('');

  const isValidPostalZip = (code: string) => {
    if (!code) return true;
    const clean = code.trim().toUpperCase();
    const caRegex = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/;
    const usRegex = /^\d{5}(-\d{4})?$/;
    return caRegex.test(clean) || usRegex.test(clean);
  };

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
  const [permitFileError, setPermitFileError] = useState('');

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoName, setLogoName] = useState('');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile]);

  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [servicePrice, setServicePrice] = useState('100');
  const [serviceDuration, setServiceDuration] = useState('60'); // default 60 mins = 1 hour
  const [serviceCategoryId, setServiceCategoryId] = useState('');
  const [serviceIsActive, setServiceIsActive] = useState(true);
  const [serviceImageFile, setServiceImageFile] = useState<File | null>(null);
  const [serviceImageName, setServiceImageName] = useState('');
  const [serviceImagePreviewUrl, setServiceImagePreviewUrl] = useState<string | null>(null);
  const [dbCategories, setDbCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!serviceImageFile) {
      setServiceImagePreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(serviceImageFile);
    setServiceImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [serviceImageFile]);

  useEffect(() => {
    async function loadDbCategories() {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .eq('is_active', true)
          .order('name', { ascending: true });
        
        if (!error && data && data.length > 0) {
          setDbCategories(data);
          setServiceCategoryId(data[0].id);
        } else {
          const fallbackCats = [
            { id: '11111111-1111-1111-1111-111111111111', name: 'Home Cleaning' },
            { id: '22222222-2222-2222-2222-222222222222', name: 'Aircon Repair' },
            { id: '33333333-3333-3333-3333-333333333333', name: 'Roof Repair' },
            { id: '44444444-4444-4444-4444-444444444444', name: 'Plumbing' },
            { id: '55555555-5555-5555-5555-555555555555', name: 'Electrical' },
            { id: '66666666-6666-6666-6666-666666666666', name: 'Painting' },
            { id: '77777777-7777-7777-7777-777777777777', name: 'Gardening & Landscaping' }
          ];
          setDbCategories(fallbackCats);
          setServiceCategoryId(fallbackCats[0].id);
        }
      } catch (err) {
        console.error('Error loading db categories:', err);
      }
    }
    loadDbCategories();
  }, []);


  const handleLocationChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isPdf = file.type 
        ? file.type === 'application/pdf' 
        : file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        setPermitFileError('Only PDF files are allowed.');
        setPermitFile(null);
        setPermitName('');
      } else {
        setPermitFileError('');
        setPermitFile(file);
        setPermitName(file.name);
      }
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    let uploadedLogoBucket: string | null = null;
    let uploadedLogoPath: string | null = null;
    let uploadedPermitPath: string | null = null;
    let uploadedServiceImagePath: string | null = null;
    let clientRef: SupabaseClient | null = null;
    let shouldCleanup = true;

    try {
      const token = await getToken();
      if (!token) {
        toast('Please sign in to register.', 'error');
        setLoading(false);
        return;
      }

      const client = getSupabaseClient(token);
      clientRef = client;

      // 1. Get user uuid
      let { data: dbUser, error: userError } = await client
        .from('users')
        .select('id')
        .eq('clerk_user_id', user?.id)
        .single();

      if (userError || !dbUser) {
        try {
          const syncRes = await fetch('/api/users/sync', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
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

      // 2. Upload company logo if provided
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
          uploadedLogoBucket = 'logos';
          uploadedLogoPath = filePath;
        } else {
          // Fallback to permits bucket if logos bucket is not configured
          const { error: fallbackError } = await client.storage
            .from('permits')
            .upload(filePath, logoFile);
          if (!fallbackError) {
            const { data } = client.storage.from('permits').getPublicUrl(filePath);
            logoUrl = data.publicUrl;
            uploadedLogoBucket = 'permits';
            uploadedLogoPath = filePath;
          }
        }
      }

      // 3. Upload business permit PDF (required)
      if (!permitFile) {
        throw new Error('Business permit PDF is required.');
      }
      const permitExt = permitFile.name.split('.').pop() || 'pdf';
      const permitPath = `${dbUser.id}/permit-${Date.now()}.${permitExt}`;
      const { error: permitUploadError } = await client.storage
        .from('permits')
        .upload(permitPath, permitFile);

      if (permitUploadError) {
        throw new Error('Failed to upload business permit: ' + permitUploadError.message);
      }

      uploadedPermitPath = permitPath;
      const businessPermitUrl = permitPath;

      // 4. Upload service image if provided
      let serviceImageUrl = null;
      if (serviceImageFile) {
        const fileExt = serviceImageFile.name.split('.').pop();
        const filePath = `${dbUser.id}/service-${Math.random()}.${fileExt}`;
        const { error: serviceImageUploadError } = await client.storage
          .from('permits')
          .upload(filePath, serviceImageFile);

        if (!serviceImageUploadError) {
          const { data } = client.storage.from('permits').getPublicUrl(filePath);
          serviceImageUrl = data.publicUrl;
          uploadedServiceImagePath = filePath;
        }
      }

      // 5. Create provider and service via server-side API endpoint to bypass client RLS issues
      let registerRes;
      try {
        registerRes = await fetch('/api/providers/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            businessName,
            description,
            logoUrl,
            categories,
            city,
            district,
            latitude,
            longitude,
            website,
            houseBuildingNumber,
            streetName,
            stateProvinceRegion,
            postalZipCode,
            country,
            serviceName,
            serviceDescription,
            servicePrice,
            serviceDuration,
            serviceCategoryId,
            serviceIsActive,
            serviceImageUrl,
            businessPermitUrl
          })
        });
      } catch (fetchErr) {
        // Ambiguous network error: fetch itself failed, we do not know if the database created the records.
        // Disable cleanup to avoid deleting successfully uploaded files.
        shouldCleanup = false;
        throw fetchErr;
      }

      const registerData = await registerRes.json();
      if (!registerRes.ok) {
        throw new Error(registerData.error || 'Failed to submit application');
      }

      toast('Registration submitted! Awaiting admin verification.', 'success');
      setStep(4);
    } catch (err: unknown) {
      console.error(err);
      
      // Clean up successfully uploaded storage files
      if (shouldCleanup && clientRef) {
        try {
          if (uploadedLogoBucket && uploadedLogoPath) {
            const { error: removeErr } = await clientRef.storage.from(uploadedLogoBucket).remove([uploadedLogoPath]);
            if (removeErr) {
              console.error('Failed to remove uploaded logo on registration failure:', removeErr);
            }
          }
          if (uploadedPermitPath) {
            const { error: removeErr } = await clientRef.storage.from('permits').remove([uploadedPermitPath]);
            if (removeErr) {
              console.error('Failed to remove uploaded permit on registration failure:', removeErr);
            }
          }
          if (uploadedServiceImagePath) {
            const { error: removeErr } = await clientRef.storage.from('permits').remove([uploadedServiceImagePath]);
            if (removeErr) {
              console.error('Failed to remove uploaded service image on registration failure:', removeErr);
            }
          }
        } catch (cleanupErr) {
          console.error('Unexpected error during storage file cleanup:', cleanupErr);
        }
      }

      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      toast('Registration failed: ' + errMsg, 'error');
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
                {s === 1 ? 'Business Info' : s === 2 ? 'Location' : 'Add Service'}
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
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => {
                setBusinessName(e.target.value);
                if (e.target.value.trim()) {
                  setBusinessNameError('');
                }
              }}
              placeholder="e.g. Elite Cleaning Service"
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent ${
                businessNameError ? 'border-red-500 bg-red-50/10' : 'border-champagne'
              }`}
            />
            {businessNameError && (
              <p className="text-xs text-red-500 mt-1">{businessNameError}</p>
            )}
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
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Service Category</label>
            <select
              value={categories[0] || ''}
              onChange={(e) => {
                const val = e.target.value;
                setCategories(val ? [val] : []);
              }}
              required
              className="w-full border border-champagne rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent bg-white"
            >
              <option value="" disabled>Select a category...</option>
              {dbCategories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Website (Optional)</label>
            <input
              type="text"
              value={website}
              onChange={(e) => {
                const val = e.target.value;
                setWebsite(val);
                if (!val) {
                  setWebsiteError('');
                } else if (/^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/.test(val)) {
                  setWebsiteError('');
                } else {
                  setWebsiteError('Please enter a valid website URL (e.g. www.domain.com)');
                }
              }}
              placeholder="e.g. www.eliteclean.com"
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent ${
                websiteError ? 'border-red-500 bg-red-50/10' : 'border-champagne'
              }`}
            />
            {websiteError && (
              <p className="text-xs text-red-500 mt-1">{websiteError}</p>
            )}
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

          {logoPreviewUrl && (
            <div className="w-full">
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Logo Preview</label>
              <div className="border border-champagne/80 rounded-2xl p-6 bg-stone-50/50 flex items-center justify-center relative overflow-hidden min-h-[160px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreviewUrl}
                  alt="Company Logo Preview"
                  className="max-h-40 object-contain rounded-lg"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Business Permit PDF <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-champagne/80 hover:border-accent rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-stone-50 relative">
              <input
                type="file"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept=".pdf,application/pdf"
                required
              />
              <Upload className="w-8 h-8 text-stone-400 mb-2" />
              <span className="text-xs font-bold text-slate-700 font-sans">
                {permitName || 'Click to upload business permit PDF'}
              </span>
              <span className="text-[10px] text-stone-400 mt-1 font-sans">PDF format only</span>
            </div>
            {permitFileError && (
              <p className="text-xs text-red-500 mt-1">{permitFileError}</p>
            )}
          </div>

          <button
            type="button"
            disabled={categories.length === 0 || !permitFile || !!permitFileError}
            onClick={() => {
              if (!businessName.trim()) {
                setBusinessNameError('Business Name is required');
                return;
              }
              if (website.trim() && !/^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/.test(website)) {
                setWebsiteError('Please enter a valid website URL (e.g. www.domain.com)');
                return;
              }
              setBusinessNameError('');
              setWebsiteError('');
              setStep(2);
            }}
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
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Place/Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => {
                setBusinessName(e.target.value);
                if (e.target.value.trim()) {
                  setBusinessNameError('');
                }
              }}
              placeholder="Enter place or business name for the map pin header..."
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent ${
                businessNameError ? 'border-red-500 bg-red-50/10' : 'border-champagne'
              }`}
            />
            {businessNameError && (
              <p className="text-xs text-red-500 mt-1">{businessNameError}</p>
            )}
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
                onChange={(e) => {
                  setPostalZipCode(e.target.value.toUpperCase());
                  setPostalError('');
                }}
                placeholder="e.g. T2P 2M5"
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent ${postalError ? 'border-red-500' : 'border-champagne'}`}
              />
              {postalError && (
                <p className="mt-1 text-xs text-red-500 font-medium">{postalError}</p>
              )}
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
              disabled={
                !businessName.trim() ||
                !city.trim() ||
                !address.trim()
              }
              onClick={() => {
                if (!isValidPostalZip(postalZipCode)) {
                  setPostalError('Please enter a valid Canadian Postal Code (e.g. T2P 2M5) or US ZIP Code (e.g. 90210).');
                  return;
                }
                setPostalError('');
                setBusinessNameError('');
                setStep(3);
              }}
              className="w-1/2 bg-primary hover:bg-slate-800 text-white font-semibold text-sm py-3.5 rounded-xl transition-all flex items-center justify-center gap-1 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed"
            >
              Next Step <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Add New Service */}
      {step === 3 && (
        <div className="bg-white border border-champagne/60 rounded-2xl p-8 shadow-sm flex flex-col gap-6">
          <div className="flex justify-between items-center pb-2">
            <h1 className="font-display text-2xl font-bold text-espresso">Add New Service</h1>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Service Name</label>
            <input
              type="text"
              required
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="e.g. Master Bedroom Cleaning"
              className="w-full border border-champagne rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Description</label>
            <textarea
              required
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              placeholder="Detail what is included in this service..."
              rows={4}
              className="w-full border border-champagne rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Price (CAD)</label>
              <input
                type="number"
                required
                value={servicePrice}
                onChange={(e) => setServicePrice(e.target.value)}
                placeholder="100"
                className="w-full border border-champagne rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Duration (Minutes)</label>
              <select
                value={serviceDuration}
                onChange={(e) => setServiceDuration(e.target.value)}
                className="w-full border border-champagne rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent bg-white"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
                <option value="180">3 hours</option>
                <option value="240">4 hours</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Category</label>
            <select
              value={serviceCategoryId}
              onChange={(e) => setServiceCategoryId(e.target.value)}
              className="w-full border border-champagne rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-accent bg-white"
            >
              {dbCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="serviceIsActive"
              checked={serviceIsActive}
              onChange={(e) => setServiceIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-accent focus:ring-accent border-champagne"
            />
            <label htmlFor="serviceIsActive" className="text-sm font-semibold text-slate-700 select-none">
              Active (Visible on search and profiles)
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Service Image</label>
            <div className="border-2 border-dashed border-champagne/80 hover:border-accent rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-stone-50 relative">
              <input
                type="file"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setServiceImageFile(e.target.files[0]);
                    setServiceImageName(e.target.files[0].name);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept="image/*"
              />
              <Upload className="w-8 h-8 text-stone-400 mb-2" />
              <span className="text-xs font-bold text-slate-700 font-sans">
                {serviceImageName || 'Upload service image'}
              </span>
              <span className="text-[10px] text-stone-400 mt-1 font-sans">JPEG, PNG formats</span>
            </div>
          </div>

          {serviceImagePreviewUrl && (
            <div className="w-full">
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Image Preview</label>
              <div className="border border-champagne/80 rounded-2xl p-6 bg-stone-50/50 flex items-center justify-center relative overflow-hidden min-h-[160px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={serviceImagePreviewUrl}
                  alt="Service Image Preview"
                  className="max-h-40 object-contain rounded-lg"
                />
              </div>
            </div>
          )}

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
              disabled={!serviceName || !servicePrice || loading}
              onClick={handleSubmit}
              className="w-1/2 bg-primary hover:bg-slate-800 text-white font-semibold text-sm py-3.5 rounded-xl transition-all flex items-center justify-center gap-1 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed"
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
