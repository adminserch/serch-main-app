'use strict';
'use client';

import { useToast } from '@/components/Providers';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@clerk/nextjs';
import {
  ArrowLeft,
  Award,
  Clock,
  DollarSign,
  Edit,
  FileText,
  Globe,
  Mail,
  MapPin,
  Phone,
  Plus,
  Star,
  Trash2,
  Upload,
  XCircle
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

interface Provider {
  id: string;
  user_id: string;
  business_name: string;
  description: string;
  service_city: string;
  service_district: string;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  business_permit_url: string | null;
  is_verified: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  logo_url: string | null;
  service_categories: string[];
  house_building_number?: string;
  street_name?: string;
  state_province_region?: string;
  postal_zip_code?: string;
  country?: string;
  users?: {
    email: string;
    full_name: string;
    phone: string | null;
  };
}

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  category_id: string;
  is_active: boolean;
  images: string[];
}

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  services: {
    name: string;
  } | null;
  users: {
    full_name: string;
  } | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  users: {
    full_name: string;
  } | null;
}

interface Category {
  id: string;
  name: string;
}

export default function ProviderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const providerId = params.id as string;
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [permitSignedUrl, setPermitSignedUrl] = useState<string | null>(null);
  const [showPermitPreview, setShowPermitPreview] = useState(true);

  // Edit Mode states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    business_name: '',
    description: '',
    service_city: '',
    service_district: '',
    latitude: 14.5995,
    longitude: 120.9842,
    website: '',
    service_categories: [] as string[],
    house_building_number: '',
    street_name: '',
    state_province_region: '',
    postal_zip_code: '',
    country: '',
    full_address: '',
    logo_url: '',
    business_permit_url: ''
  });

  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoName, setEditLogoName] = useState('');
  const [editPermitFile, setEditPermitFile] = useState<File | null>(null);
  const [editPermitName, setEditPermitName] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Services Modal states
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    price: '100',
    duration_minutes: '60',
    category_id: '',
    is_active: true
  });

  const handleAddressFieldChange = (field: keyof typeof editForm, value: string) => {
    setEditForm(prev => {
      const nextForm = { ...prev, [field]: value };
      const parts = [
        nextForm.house_building_number,
        nextForm.street_name,
        nextForm.service_district,
        nextForm.service_city,
        nextForm.state_province_region,
        nextForm.postal_zip_code,
        nextForm.country
      ].filter(Boolean);
      nextForm.full_address = parts.join(', ');
      return nextForm;
    });
  };

  useEffect(() => {
    checkAdminAndLoadData();
  }, [providerId]);

  const checkAdminAndLoadData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        router.push('/sign-in');
        return;
      }

      const client = getSupabaseClient(token);

      const syncResponse = await fetch('/api/users/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!syncResponse.ok || !syncResponse.headers.get('content-type')?.includes('application/json')) {
        router.push('/');
        return;
      }

      const resData = await syncResponse.json();
      if (!resData.success || !resData.user || resData.user.role !== 'admin') {
        toast('Access denied. Admin role required.', 'error');
        router.push('/');
        return;
      }

      // 1. Fetch provider details with user joins
      const { data: pData, error: pErr } = await client
        .from('providers')
        .select(`
          *,
          users (
            email,
            full_name,
            phone
          )
        `)
        .eq('id', providerId)
        .single();

      if (pErr || !pData) {
        throw new Error('Provider profile not found');
      }

      setProvider(pData as unknown as Provider);

      // Fetch signed URL for the permit/ID
      setPermitSignedUrl(null);
      if (pData.business_permit_url) {
        try {
          const sUrlRes = await fetch(`/api/admin/permit-url?path=${encodeURIComponent(pData.business_permit_url)}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (sUrlRes.ok) {
            const sUrlData = await sUrlRes.json();
            setPermitSignedUrl(sUrlData.signedUrl);
          }
        } catch (err) {
          console.error('Failed to load signed permit URL:', err);
        }
      }

      setEditForm({
        business_name: pData.business_name || '',
        description: pData.description || '',
        service_city: pData.service_city || '',
        service_district: pData.service_district || '',
        latitude: pData.latitude || 14.5995,
        longitude: pData.longitude || 120.9842,
        website: pData.website || '',
        service_categories: pData.service_categories || [],
        house_building_number: pData.house_building_number || '',
        street_name: pData.street_name || '',
        state_province_region: pData.state_province_region || '',
        postal_zip_code: pData.postal_zip_code || '',
        country: pData.country || '',
        full_address: [
          pData.house_building_number,
          pData.street_name,
          pData.service_district,
          pData.service_city,
          pData.state_province_region,
          pData.postal_zip_code,
          pData.country
        ].filter(Boolean).join(', '),
        logo_url: pData.logo_url || '',
        business_permit_url: pData.business_permit_url || ''
      });

      // 2. Fetch services
      const sResponse = await fetch(`/api/services?providerId=${providerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (sResponse.ok) {
        const sData = await sResponse.json();
        setServices(sData.services || []);
      } else {
        let errorMessage = sResponse.statusText;
        const contentType = sResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errData = await sResponse.json();
            errorMessage = errData.error || errData.message || errorMessage;
          } catch {
            // Ignore JSON parsing failure
          }
        }
        throw new Error(`Failed to fetch services (HTTP ${sResponse.status}): ${errorMessage}`);
      }

      // 3. Fetch bookings
      const { data: bData } = await client
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          notes,
          services ( name ),
          users ( full_name )
        `)
        .eq('provider_id', providerId)
        .order('booking_date', { ascending: false });
      setBookings(bData as unknown as Booking[] || []);

      // 4. Fetch reviews
      const { data: rData } = await client
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          users ( full_name )
        `)
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });
      setReviews(rData as unknown as Review[] || []);

      // 5. Fetch Categories for select
      const { data: cData } = await client
        .from('categories')
        .select('id, name')
        .eq('is_active', true);
      setCategories(cData || []);

    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Error loading provider data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'pending' | 'approved' | 'rejected' | 'suspended') => {
    try {
      const token = await getToken();
      if (!token) {
        toast('Not authenticated. Please sign in again.', 'error');
        return;
      }

      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'update_status',
          payload: { providerId, status: newStatus }
        })
      });

      let errorMessage = res.statusText;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const resData = await res.json();
          errorMessage = resData.error || resData.message || errorMessage;
        } catch {
          // Ignore
        }
      } else {
        try {
          errorMessage = await res.text() || errorMessage;
        } catch {
          // Ignore
        }
      }

      if (!res.ok) throw new Error(errorMessage || `Failed to update status (HTTP ${res.status})`);

      toast(`Provider status updated to ${newStatus}`, 'success');
      checkAdminAndLoadData();
    } catch (err: any) {
      toast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleToggleVerified = async () => {
    if (!provider) return;
    try {
      const token = await getToken();
      if (!token) {
        toast('Not authenticated. Please sign in again.', 'error');
        return;
      }

      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'toggle_verified',
          payload: { providerId }
        })
      });

      let errorMessage = res.statusText;
      interface ActionResponse {
        error?: string;
        message?: string;
        is_verified?: boolean;
      }
      let resData: ActionResponse | null = null;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          resData = await res.json();
          errorMessage = (resData?.error) || (resData?.message) || errorMessage;
        } catch {
          // Ignore
        }
      } else {
        try {
          errorMessage = await res.text() || errorMessage;
        } catch {
          // Ignore
        }
      }

      if (!res.ok) throw new Error(errorMessage || `Failed to toggle verification (HTTP ${res.status})`);

      const nextVerifiedState = resData && typeof resData.is_verified === 'boolean'
        ? resData.is_verified
        : !provider.is_verified;

      toast(nextVerifiedState ? 'Provider verified successfully' : 'Verification revoked', 'success');
      checkAdminAndLoadData();
    } catch (err: any) {
      toast(err.message || 'Failed to toggle verification', 'error');
    }
  };

  const handleSaveProfile = async () => {
    setUploadingFiles(true);
    try {
      const token = await getToken();
      const client = getSupabaseClient(token);

      let finalLogoUrl = editForm.logo_url;
      if (editLogoFile) {
        const fileExt = editLogoFile.name.split('.').pop();
        const filePath = `${providerId}/logo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: logoUploadError } = await client.storage
          .from('logos')
          .upload(filePath, editLogoFile);

        if (!logoUploadError) {
          const { data } = client.storage.from('logos').getPublicUrl(filePath);
          finalLogoUrl = data.publicUrl;
        } else {
          // Fallback to permits
          const { error: fallbackError } = await client.storage
            .from('permits')
            .upload(filePath, editLogoFile);
          if (!fallbackError) {
            const { data } = client.storage.from('permits').getPublicUrl(filePath);
            finalLogoUrl = data.publicUrl;
          }
        }
      }

      let finalPermitUrl = editForm.business_permit_url;
      if (editPermitFile) {
        const fileExt = editPermitFile.name.split('.').pop();
        const filePath = `${providerId}/permit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: permitUploadError } = await client.storage
          .from('permits')
          .upload(filePath, editPermitFile);

        if (permitUploadError) {
          toast(permitUploadError.message || 'Failed to upload business permit', 'error');
          setUploadingFiles(false);
          return;
        }

        finalPermitUrl = `permits/${filePath}`;
      }

      const { error } = await client
        .from('providers')
        .update({
          business_name: editForm.business_name,
          description: editForm.description,
          service_city: editForm.service_city,
          service_district: editForm.service_district,
          latitude: editForm.latitude,
          longitude: editForm.longitude,
          website: editForm.website,
          service_categories: editForm.service_categories,
          house_building_number: editForm.house_building_number || null,
          street_name: editForm.street_name || null,
          state_province_region: editForm.state_province_region || null,
          postal_zip_code: editForm.postal_zip_code || null,
          country: editForm.country || null,
          logo_url: finalLogoUrl || null,
          business_permit_url: finalPermitUrl || null
        })
        .eq('id', providerId);

      if (error) throw error;

      toast('Provider profile updated successfully', 'success');
      setEditLogoFile(null);
      setEditLogoName('');
      setEditPermitFile(null);
      setEditPermitName('');
      setIsEditingProfile(false);
      checkAdminAndLoadData();
    } catch (err: any) {
      toast(err.message || 'Failed to update profile', 'error');
    } finally {
      setUploadingFiles(false);
    }
  };

  // Services CRUD
  const handleOpenServiceModal = (service: Service | null = null) => {
    if (service) {
      setEditingService(service);
      setServiceForm({
        name: service.name,
        description: service.description,
        price: String(service.price),
        duration_minutes: String(service.duration_minutes),
        category_id: service.category_id,
        is_active: service.is_active
      });
    } else {
      setEditingService(null);
      setServiceForm({
        name: '',
        description: '',
        price: '100',
        duration_minutes: '60',
        category_id: categories[0]?.id || '',
        is_active: true
      });
    }
    setShowServiceModal(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getToken();

      if (editingService) {
        // Edit Service
        const res = await fetch('/api/services', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            id: editingService.id,
            name: serviceForm.name,
            description: serviceForm.description,
            price: Number(serviceForm.price),
            duration_minutes: Number(serviceForm.duration_minutes),
            category_id: serviceForm.category_id,
            is_active: serviceForm.is_active
          })
        });

        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Failed to update service');
        toast('Service updated successfully', 'success');
      } else {
        // Create Service
        const res = await fetch('/api/services', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            provider_id: providerId,
            name: serviceForm.name,
            description: serviceForm.description,
            price: Number(serviceForm.price),
            duration_minutes: Number(serviceForm.duration_minutes),
            category_id: serviceForm.category_id,
            is_active: serviceForm.is_active,
            images: []
          })
        });

        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Failed to add service');
        toast('Service added successfully', 'success');
      }

      setShowServiceModal(false);
      checkAdminAndLoadData();
    } catch (err: any) {
      toast(err.message || 'Failed to save service', 'error');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      const token = await getToken();

      const res = await fetch(`/api/services?id=${serviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to delete service');
      toast('Service deleted successfully', 'success');
      checkAdminAndLoadData();
    } catch (err: any) {
      toast(err.message || 'Failed to delete service', 'error');
    }
  };

  // Review Moderation
  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      const token = await getToken();

      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'delete_review',
          payload: { reviewId }
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to delete review');

      toast('Review deleted successfully', 'success');
      checkAdminAndLoadData();
    } catch (err: any) {
      toast(err.message || 'Failed to delete review', 'error');
    }
  };

  // Delete Provider Entirely
  const handleDeleteProvider = async () => {
    if (!provider) return;

    try {
      const token = await getToken();

      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'delete_provider',
          payload: { providerId }
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to delete provider');

      toast('Provider profile deleted completely', 'success');
      router.push('/admin?tab=providers');
    } catch (err: any) {
      toast(err.message || 'Failed to delete provider', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[400px]">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4">
        <h2 className="font-display text-xl font-bold text-espresso">Provider Profile Not Found</h2>
        <Link href="/admin?tab=providers" className="bg-primary hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm transition-all font-semibold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-16 max-w-5xl mx-auto w-full">
        
        {/* Back and Breadcrumbs */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/admin?tab=providers" className="flex items-center gap-2 text-stone-500 hover:text-accent font-semibold text-sm transition-all">
            <ArrowLeft className="w-4 h-4" /> Back to Admin Dashboard
          </Link>
          <button 
            onClick={() => setShowDeleteModal(true)} 
            className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 transition-all border border-red-200 bg-red-50/10 px-3.5 py-2 rounded-xl"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Provider Profile
          </button>
        </div>

        {/* Hero Header Card */}
        <div className="bg-white border border-champagne/60 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row gap-8 items-start mb-8">
          {/* Logo */}
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-stone-50 border border-champagne flex-shrink-0 flex items-center justify-center">
            {provider.logo_url ? (
              <img src={provider.logo_url} alt={provider.business_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-accent font-sans">{provider.business_name.charAt(0)}</span>
            )}
          </div>

          {/* Details */}
          <div className="flex-grow">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-espresso">{provider.business_name}</h1>
              {provider.is_verified && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-teal-50 border border-teal-200 text-teal-700 px-2.5 py-1 rounded-full">
                  <Award className="w-3 h-3 text-teal-600" /> Verified
                </span>
              )}
              <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                provider.status === 'approved' ? 'bg-purple-50 border-purple-200 text-purple-800' :
                provider.status === 'rejected' ? 'bg-red-50 border-red-200 text-red-800' :
                provider.status === 'suspended' ? 'bg-stone-100 border-stone-300 text-stone-700' :
                'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                {provider.status}
              </span>
            </div>
            
            <p className="text-stone-500 text-sm mt-2 max-w-2xl leading-relaxed">{provider.description}</p>
            
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-xs text-stone-400">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-stone-400" /> 
                {provider.service_city}{provider.service_district ? `, ${provider.service_district}` : ''}
              </span>
              {provider.website && (
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-stone-400" /> 
                  <a 
                    href={provider.website.startsWith('http') ? provider.website : `https://${provider.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:text-accent underline"
                  >
                    {provider.website}
                  </a>
                </span>
              )}
              {provider.users && (
                <>
                  <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-stone-400" /> {provider.users.email}</span>
                  {provider.users.phone && (
                    <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-stone-400" /> {provider.users.phone}</span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Verification & Approval Actions */}
          <div className="flex flex-col gap-2.5 w-full md:w-auto">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Vetting Actions</h3>
            <button 
              onClick={handleToggleVerified}
              className={`w-full text-xs font-semibold py-2 px-4 rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                provider.is_verified 
                  ? 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700' 
                  : 'bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-800'
              }`}
            >
              <Award className="w-4 h-4 text-teal-600" /> {provider.is_verified ? 'Revoke Vetting Verified' : 'Verify & Approve Provider'}
            </button>
            <div className="flex gap-2">
              <button 
                onClick={() => handleUpdateStatus('approved')}
                disabled={provider.status === 'approved'}
                className="w-1/2 text-xs font-semibold bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 py-2 px-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Approve
              </button>
              <button 
                onClick={() => handleUpdateStatus('rejected')}
                disabled={provider.status === 'rejected'}
                className="w-1/2 text-xs font-semibold bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 py-2 px-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject
              </button>
            </div>
            <button 
              onClick={() => handleUpdateStatus('suspended')}
              disabled={provider.status === 'suspended'}
              className="w-full text-xs font-semibold bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 py-2 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suspend Provider
            </button>
          </div>
        </div>

        {/* Detailed Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column (2/3 width on large screen): Edit profile & Services */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            
            {/* Edit Profile Form */}
            <div className="bg-white border border-champagne/60 rounded-3xl p-8 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display text-xl font-bold text-espresso">Profile Details</h2>
                <button 
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="flex items-center gap-1.5 text-xs font-bold text-accent border border-champagne px-3 py-1.5 rounded-xl hover:bg-stone-50 transition-all"
                >
                  <Edit className="w-3.5 h-3.5" /> {isEditingProfile ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>

              {isEditingProfile ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Business Name</label>
                    <input 
                      type="text" 
                      value={editForm.business_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, business_name: e.target.value }))}
                      className="w-full border border-champagne rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Website</label>
                    <input 
                      type="text" 
                      value={editForm.website}
                      onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full border border-champagne rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Description</label>
                    <textarea 
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full border border-champagne rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent resize-none mb-2"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-champagne/40 pt-4 mt-2">
                    <div className="md:col-span-2">
                      <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Address Details</span>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">House/Building Number</label>
                      <input 
                        type="text" 
                        value={editForm.house_building_number}
                        onChange={(e) => handleAddressFieldChange('house_building_number', e.target.value)}
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent bg-white"
                        placeholder="e.g. 123"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Street Name</label>
                      <input 
                        type="text" 
                        value={editForm.street_name}
                        onChange={(e) => handleAddressFieldChange('street_name', e.target.value)}
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent bg-white"
                        placeholder="e.g. Main Street"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">District / Neighborhood</label>
                      <input 
                        type="text" 
                        value={editForm.service_district}
                        onChange={(e) => handleAddressFieldChange('service_district', e.target.value)}
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent bg-white"
                        placeholder="e.g. Makati"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">City/Locality</label>
                      <input 
                        type="text" 
                        required
                        value={editForm.service_city}
                        onChange={(e) => handleAddressFieldChange('service_city', e.target.value)}
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent bg-white"
                        placeholder="e.g. Manila"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">State/Province/Region</label>
                      <input 
                        type="text" 
                        value={editForm.state_province_region}
                        onChange={(e) => handleAddressFieldChange('state_province_region', e.target.value)}
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent bg-white"
                        placeholder="e.g. Metro Manila"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Postal/Zip Code</label>
                      <input 
                        type="text" 
                        value={editForm.postal_zip_code}
                        onChange={(e) => handleAddressFieldChange('postal_zip_code', e.target.value)}
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent bg-white"
                        placeholder="e.g. 1200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Country</label>
                      <input 
                        type="text" 
                        value={editForm.country}
                        onChange={(e) => handleAddressFieldChange('country', e.target.value)}
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent bg-white"
                        placeholder="e.g. Canada"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Full Address (Geocoding Address Lookups)</label>
                      <input 
                        type="text" 
                        value={editForm.full_address}
                        onChange={(e) => setEditForm(prev => ({ ...prev, full_address: e.target.value }))}
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent bg-white"
                        placeholder="Type address to locate automatically on map"
                      />
                    </div>
                    <div className="md:col-span-2 mt-2">
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Pin Location on Map</label>
                      <Map 
                        latitude={editForm.latitude} 
                        longitude={editForm.longitude} 
                        address={editForm.full_address}
                        businessName={editForm.business_name}
                        onLocationChange={(lat, lng) => {
                          setEditForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
                        }}
                      />
                    </div>
                  </div>

                  {/* Media & Vetting Documents */}
                  <div className="border-t border-champagne/40 pt-4 mt-2">
                    <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Media & Vetting Documents</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Logo Section */}
                      <div className="flex flex-col gap-2">
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Company Logo</label>
                        
                        {!(editLogoFile || editForm.logo_url) ? (
                          <div className="border-2 border-dashed border-champagne/80 hover:border-accent rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-stone-50 relative min-h-[140px]">
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setEditLogoFile(e.target.files[0]);
                                  setEditLogoName(e.target.files[0].name);
                                }
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <Upload className="w-5 h-5 text-stone-400 mb-1.5" />
                            <span className="text-xs font-bold text-slate-700 font-sans text-center">
                              {editLogoName || 'Click to change/upload logo'}
                            </span>
                            <span className="text-[10px] text-stone-400 mt-0.5 font-sans">JPEG, PNG formats</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between bg-stone-50 border border-champagne/45 p-2 rounded-xl mt-1.5 animate-fade-in">
                            <div className="flex items-center gap-3">
                              <img 
                                src={editLogoFile ? URL.createObjectURL(editLogoFile) : editForm.logo_url} 
                                alt="Logo preview" 
                                className="w-12 h-12 rounded-lg object-cover border border-champagne"
                              />
                              <span className="text-[10px] text-stone-500 font-sans">
                                {editLogoFile ? 'Selected logo file' : 'Current active logo'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditLogoFile(null);
                                setEditLogoName('');
                                setEditForm(prev => ({ ...prev, logo_url: '' }));
                              }}
                              className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 transition-colors text-xs font-semibold"
                            >
                              Remove Logo
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Government ID Section */}
                      <div className="flex flex-col gap-2">
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Government ID / Vetting Document</label>
                        
                        {!(editPermitFile || editForm.business_permit_url) ? (
                          <div className="border-2 border-dashed border-champagne/80 hover:border-accent rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-stone-50 relative min-h-[140px]">
                            <input 
                              type="file" 
                              accept="image/*,application/pdf"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setEditPermitFile(e.target.files[0]);
                                  setEditPermitName(e.target.files[0].name);
                                }
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <Upload className="w-5 h-5 text-stone-400 mb-1.5" />
                            <span className="text-xs font-bold text-slate-700 font-sans text-center">
                              {editPermitName || 'Click to change/upload document'}
                            </span>
                            <span className="text-[10px] text-stone-400 mt-0.5 font-sans">PDF, JPEG, PNG formats</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between bg-stone-50 border border-champagne/45 p-2 rounded-xl mt-1.5 animate-fade-in">
                            <div className="flex items-center gap-2 max-w-[65%]">
                              <FileText className="w-5 h-5 text-accent flex-shrink-0" />
                              <span className="text-[10px] text-stone-500 font-sans truncate">
                                {editPermitFile ? editPermitName : 'Current active vetting document'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditPermitFile(null);
                                setEditPermitName('');
                                setEditForm(prev => ({ ...prev, business_permit_url: '' }));
                              }}
                              className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 transition-colors text-xs font-semibold flex-shrink-0"
                            >
                              Remove Document
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                  <div className="flex gap-4 mt-2">
                    <button 
                      onClick={handleSaveProfile} 
                      disabled={uploadingFiles}
                      className="bg-primary hover:bg-slate-800 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-55"
                    >
                      {uploadingFiles ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Saving...
                        </>
                      ) : 'Save Changes'}
                    </button>
                    <button 
                      onClick={() => setIsEditingProfile(false)} 
                      disabled={uploadingFiles}
                      className="border border-champagne hover:bg-stone-50 text-slate-700 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 text-sm">
                  <div>
                    <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Business Name</span>
                    <span className="text-espresso font-semibold font-sans">{provider.business_name}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Website</span>
                    {provider.website ? (
                      <a 
                        href={provider.website.startsWith('http') ? provider.website : `https://${provider.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline font-semibold font-sans block break-all"
                      >
                        {provider.website}
                      </a>
                    ) : (
                      <span className="text-espresso font-semibold font-sans block">None</span>
                    )}
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Description</span>
                    <span className="text-stone-600 font-sans leading-relaxed block">{provider.description || 'No description provided'}</span>
                  </div>
                  <div className="border-t border-champagne/45 pt-4 mt-2">
                    <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Address Details</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">House/Building Number</span>
                        <span className="text-espresso font-semibold font-sans">{provider.house_building_number || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Street Name</span>
                        <span className="text-espresso font-semibold font-sans">{provider.street_name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">District / Neighborhood</span>
                        <span className="text-espresso font-semibold font-sans">{provider.service_district || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">City/Locality</span>
                        <span className="text-espresso font-semibold font-sans">{provider.service_city || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">State/Province/Region</span>
                        <span className="text-espresso font-semibold font-sans">{provider.state_province_region || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Postal/Zip Code</span>
                        <span className="text-espresso font-semibold font-sans">{provider.postal_zip_code || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Country</span>
                        <span className="text-espresso font-semibold font-sans">{provider.country || 'N/A'}</span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Full Address</span>
                        <span className="text-espresso font-semibold font-sans leading-relaxed">
                          {[
                            provider.house_building_number,
                            provider.street_name,
                            provider.service_district,
                            provider.service_city,
                            provider.state_province_region,
                            provider.postal_zip_code,
                            provider.country
                          ].filter(Boolean).join(', ') || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Company Logo Preview</span>
                    {provider.logo_url ? (
                      <div className="mb-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={provider.logo_url} 
                          alt="Company Logo" 
                          className="w-32 h-32 rounded-2xl object-cover border border-champagne/80 shadow-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-stone-500 font-sans text-xs block mb-4">No logo uploaded</span>
                    )}
                  </div>

                  {provider.business_permit_url && (
                    <div className="col-span-1 md:col-span-2">
                      <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Valid Government ID / Verification Document</span>
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        {!permitSignedUrl ? (
                          <div className="flex items-center gap-1.5 text-xs text-stone-400 font-semibold bg-stone-50 px-3.5 py-2 rounded-xl border border-stone-200 cursor-not-allowed">
                            <FileText className="w-4 h-4 text-stone-300" /> Loading document controls...
                          </div>
                        ) : (
                          <>
                            <a 
                              href={permitSignedUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center gap-1.5 text-xs text-accent font-bold hover:text-purple-700 transition-colors bg-stone-50 hover:bg-stone-100 px-3.5 py-2 rounded-xl border border-champagne/40"
                            >
                              <FileText className="w-4 h-4" /> Download/View Vetting Document / ID
                            </a>
                            <button
                              type="button"
                              onClick={() => setShowPermitPreview(!showPermitPreview)}
                              className="flex items-center gap-1.5 text-xs text-purple-700 font-bold hover:text-white hover:bg-purple-700 transition-all bg-purple-50 hover:border-purple-300 px-3.5 py-2 rounded-xl border border-purple-200"
                            >
                              {showPermitPreview ? 'Hide Preview' : 'Show Preview'}
                            </button>
                          </>
                        )}
                      </div>

                      {showPermitPreview && permitSignedUrl && (
                        <div className="border border-champagne/80 rounded-2xl overflow-hidden bg-stone-50 max-w-3xl mt-2 shadow-sm">
                          {provider.business_permit_url.toLowerCase().endsWith('.pdf') ? (
                            <iframe
                              src={permitSignedUrl}
                              title="Government ID Preview"
                              className="w-full h-[500px] bg-white"
                              sandbox="allow-scripts allow-same-origin"
                            />
                          ) : (
                            <div className="p-4 flex justify-center bg-stone-100/50">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={permitSignedUrl}
                                alt="Government ID Preview"
                                className="max-h-[500px] object-contain rounded-lg shadow-sm"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Leaflet Map pin display */}
                  <div className="border-t border-champagne/45 pt-6 mt-4">
                    <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Pinned Location on Map</span>
                    <div className="h-60 rounded-2xl overflow-hidden border border-champagne/60 relative">
                      <Map 
                        latitude={provider.latitude} 
                        longitude={provider.longitude} 
                        address={[
                          provider.house_building_number,
                          provider.street_name,
                          provider.service_district,
                          provider.service_city,
                          provider.state_province_region,
                          provider.postal_zip_code,
                          provider.country
                        ].filter(Boolean).join(', ')}
                        businessName={provider.business_name}
                        viewOnly={true}
                      />
                    </div>
                    <div className="mt-3 text-xs text-stone-400 flex gap-x-4">
                      <span>Latitude: {provider.latitude || 'Not set'}</span>
                      <span>Longitude: {provider.longitude || 'Not set'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Services CRUD Panel */}
            <div className="bg-white border border-champagne/60 rounded-3xl p-8 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display text-xl font-bold text-espresso">Services Vetted ({services.length})</h2>
                <button 
                  onClick={() => handleOpenServiceModal(null)}
                  className="flex items-center gap-1 text-xs font-bold text-white bg-accent hover:bg-purple-700 px-3 py-2 rounded-xl transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Service
                </button>
              </div>

              {services.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-champagne rounded-2xl">
                  <span className="text-stone-400 text-sm block mb-2">No services registered yet.</span>
                  <button 
                    onClick={() => handleOpenServiceModal(null)}
                    className="text-xs font-bold text-accent hover:underline flex items-center gap-0.5 mx-auto"
                  >
                    <Plus className="w-3 h-3" /> Add first service
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {services.map((service) => (
                    <div key={service.id} className="border border-champagne/60 hover:border-champagne rounded-2xl p-5 flex items-start gap-4 transition-all">
                      <div className="flex-grow">
                        <div className="flex items-center gap-2">
                          <h4 className="font-sans font-bold text-espresso text-base">{service.name}</h4>
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            service.is_active ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-stone-50 border-stone-200 text-stone-500'
                          }`}>
                            {service.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-stone-500 text-xs mt-1 leading-relaxed">{service.description}</p>
                        <div className="flex gap-4 mt-3 text-xs font-sans text-stone-400 font-medium">
                          <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-stone-400" /> {service.price} CAD</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-stone-400" /> {service.duration_minutes} min</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button 
                          onClick={() => handleOpenServiceModal(service)}
                          className="p-2 border border-champagne rounded-xl hover:bg-stone-50 transition-all text-slate-700"
                          title="Edit Service"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteService(service.id)}
                          className="p-2 border border-red-100 rounded-xl hover:bg-red-50/20 text-red-500 transition-all"
                          title="Delete Service"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (1/3 width on large screen): Reviews/Bookings summaries */}
          <div className="lg:col-span-1 flex flex-col gap-8">
            
            {/* Bookings panel */}
            <div className="bg-white border border-champagne/60 rounded-3xl p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-espresso mb-4">Recent Bookings ({bookings.length})</h2>
              
              {bookings.length === 0 ? (
                <span className="text-xs text-stone-400 block py-4 text-center">No bookings recorded yet.</span>
              ) : (
                <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
                  {bookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="border border-stone-100 rounded-xl p-3 flex flex-col gap-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-espresso">{booking.services?.name || 'Vetted Service'}</span>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          booking.status === 'completed' ? 'bg-purple-50 border-purple-200 text-purple-800' :
                          booking.status === 'confirmed' ? 'bg-teal-50 border-teal-200 text-teal-800' :
                          booking.status === 'cancelled' ? 'bg-red-50 border-red-200 text-red-800' :
                          'bg-amber-50 border-amber-200 text-amber-800'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      <span className="text-stone-500 font-semibold">{booking.users?.full_name || 'Seeker Client'}</span>
                      <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                        <span>{booking.booking_date}</span>
                        <span>{booking.start_time} - {booking.end_time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reviews panel */}
            <div className="bg-white border border-champagne/60 rounded-3xl p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-espresso mb-4">Customer Reviews ({reviews.length})</h2>
              
              {reviews.length === 0 ? (
                <span className="text-xs text-stone-400 block py-4 text-center">No reviews submitted yet.</span>
              ) : (
                <div className="flex flex-col gap-4 max-h-80 overflow-y-auto pr-1">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-espresso">{review.users?.full_name || 'Anonymous Seeker'}</span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < review.rating ? 'fill-gold text-gold' : 'text-stone-200'}`} 
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-stone-500 mt-1 leading-relaxed">{review.comment}</p>
                      <div className="flex items-center justify-between mt-2.5">
                        <span className="text-[10px] text-stone-400">{new Date(review.created_at).toLocaleDateString()}</span>
                        <button 
                          onClick={() => handleDeleteReview(review.id)}
                          className="flex items-center gap-0.5 text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors border border-red-100 bg-red-50/10 px-2 py-1 rounded-lg"
                        >
                          <Trash2 className="w-3 h-3" /> Remove Review
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      {/* Services Add/Edit Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-espresso/30 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white border border-champagne rounded-3xl p-8 max-w-md w-full shadow-lg flex flex-col gap-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowServiceModal(false)}
              className="absolute top-6 right-6 p-1 border border-champagne rounded-xl hover:bg-stone-50 transition-all text-slate-700"
            >
              <XCircle className="w-5 h-5 text-stone-400 hover:text-stone-600" />
            </button>

            <h3 className="font-display text-xl font-bold text-espresso">{editingService ? 'Edit Service Details' : 'Add New Service'}</h3>

            <form onSubmit={handleSaveService} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Service Name</label>
                <input 
                  type="text" 
                  required
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Deep Cleaning Service"
                  className="w-full border border-champagne rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Description</label>
                <textarea 
                  required
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe details of the service..."
                  rows={3}
                  className="w-full border border-champagne rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Price (CAD)</label>
                  <input 
                    type="number" 
                    required
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="100"
                    className="w-full border border-champagne rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Duration (Min)</label>
                  <input 
                    type="number" 
                    required
                    value={serviceForm.duration_minutes}
                    onChange={(e) => setServiceForm(prev => ({ ...prev, duration_minutes: e.target.value }))}
                    placeholder="60"
                    className="w-full border border-champagne rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Category</label>
                <select 
                  value={serviceForm.category_id}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, category_id: e.target.value }))}
                  className="w-full border border-champagne rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="modal_is_active"
                  checked={serviceForm.is_active}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded text-accent focus:ring-accent border-champagne"
                />
                <label htmlFor="modal_is_active" className="text-xs font-semibold text-slate-700 select-none">Active (Visible on Seeker Searches & Profiles)</label>
              </div>

              <div className="flex gap-4 mt-4">
                <button 
                  type="submit"
                  className="w-1/2 bg-accent hover:bg-purple-700 text-white font-semibold text-sm py-3 rounded-xl transition-all"
                >
                  Save Service
                </button>
                <button 
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="w-1/2 border border-champagne hover:bg-stone-50 text-slate-700 font-semibold text-sm py-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Provider Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-espresso/30 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white border border-champagne rounded-3xl p-8 max-w-md w-full shadow-lg flex flex-col gap-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-6 right-6 p-1 border border-champagne rounded-xl hover:bg-stone-50 transition-all text-slate-700"
            >
              <XCircle className="w-5 h-5 text-stone-400 hover:text-stone-600" />
            </button>

            <h3 className="font-display text-xl font-bold text-espresso">Delete Provider Profile?</h3>
            
            <p className="text-sm text-stone-650 leading-relaxed">
              Are you sure you want to completely delete the provider profile for <strong className="text-espresso font-bold">{provider?.business_name}</strong>? 
              This will permanently delete all services associated with this provider and revert the user role back to seeker. This action cannot be undone.
            </p>

            <div className="flex gap-4 mt-2">
              <button 
                type="button"
                onClick={handleDeleteProvider}
                className="w-1/2 bg-red-500 hover:bg-red-650 text-white font-semibold text-sm py-3 rounded-xl transition-all"
              >
                Delete Profile
              </button>
              <button 
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="w-1/2 border border-champagne hover:bg-stone-50 text-slate-700 font-semibold text-sm py-3 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
