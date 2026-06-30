'use strict';
'use client';

import { useToast } from '@/components/Providers';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth, useUser } from '@clerk/nextjs';
import {
  Award,
  Building2,
  CalendarDays,
  Check,
  Edit2,
  Eye,
  FolderEdit,
  FolderHeart,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  Users,
  X,
  XCircle
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

const EMOJI_MAP: Record<string, string> = {
  sparkles: '🧹',
  snowflake: '❄️',
  home: '🏠',
  wrench: '🔧',
  zap: '⚡',
  brush: '🖌️',
  bug: '🐛',
  truck: '🚚',
  flower: '🌱',
  hammer: '🔨',
};

function getEmojiForIcon(icon: string | null): string {
  if (!icon) return '📂';
  const trimmed = icon.trim().toLowerCase();
  return EMOJI_MAP[trimmed] || icon;
}

interface Provider {
  id: string;
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
  service_categories?: string[];
  house_building_number?: string | null;
  street_name?: string | null;
  state_province_region?: string | null;
  postal_zip_code?: string | null;
  country?: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  is_active: boolean;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  providers: {
    business_name: string;
  };
  users: {
    full_name: string;
  };
}

function AdminDashboardContent() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab') || 'stats';
  const activeTab = (['stats', 'providers', 'categories', 'reviews'].includes(tabParam) ? tabParam : 'stats') as 'stats' | 'providers' | 'categories' | 'reviews';
  const [loading, setLoading] = useState(true);

  // Data states
  const [providers, setProviders] = useState<Provider[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({
    usersCount: 0,
    providersCount: 0,
    bookingsCount: 0
  });

  // Modal / Form States
  const [selectedProviderMap, setSelectedProviderMap] = useState<Provider | null>(null);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormName, setCategoryFormName] = useState('');
  const [categoryFormSlug, setCategoryFormSlug] = useState('');
  const [categoryFormIcon, setCategoryFormIcon] = useState('sparkles');
  const [categoryFormActive, setCategoryFormActive] = useState(true);
  const [submittingCategory, setSubmittingCategory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // CRUD Form States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    full_name: '',
    business_name: '',
    description: '',
    service_city: '',
    service_district: '',
    latitude: '',
    longitude: '',
    website: '',
    logo_url: '',
    is_verified: false,
    status: 'pending' as 'pending' | 'approved' | 'rejected' | 'suspended',
    categories: [] as string[]
  });

  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [editForm, setEditForm] = useState({
    business_name: '',
    description: '',
    service_city: '',
    service_district: '',
    latitude: '',
    longitude: '',
    website: '',
    logo_url: '',
    is_verified: false,
    status: 'pending' as 'pending' | 'approved' | 'rejected' | 'suspended',
    categories: [] as string[],
    house_building_number: '',
    street_name: '',
    state_province_region: '',
    postal_zip_code: '',
    country: '',
    full_address: ''
  });

  // File Upload states for creating/editing provider logos
  const [createLogoFile, setCreateLogoFile] = useState<File | null>(null);
  const [createLogoName, setCreateLogoName] = useState('');
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoName, setEditLogoName] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingLogo(true);
    try {
      let finalLogoUrl = createForm.logo_url;
      if (createLogoFile) {
        const token = await getToken();
        const client = getSupabaseClient(token);
        const fileExt = createLogoFile.name.split('.').pop();
        const filePath = `admin-uploads/logo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: logoUploadError } = await client.storage
          .from('logos')
          .upload(filePath, createLogoFile);

        if (!logoUploadError) {
          const { data } = client.storage.from('logos').getPublicUrl(filePath);
          finalLogoUrl = data.publicUrl;
        } else {
          // Fallback to permits bucket
          const { error: fallbackError } = await client.storage
            .from('permits')
            .upload(filePath, createLogoFile);
          if (!fallbackError) {
            const { data } = client.storage.from('permits').getPublicUrl(filePath);
            finalLogoUrl = data.publicUrl;
          }
        }
      }

      const response = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_provider',
          payload: {
            ...createForm,
            logo_url: finalLogoUrl,
            latitude: createForm.latitude ? parseFloat(createForm.latitude) : null,
            longitude: createForm.longitude ? parseFloat(createForm.longitude) : null,
            service_categories: createForm.categories
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create provider');
      }

      toast('Provider created successfully', 'success');
      setShowCreateModal(false);
      setCreateLogoFile(null);
      setCreateLogoName('');
      setCreateForm({
        email: '',
        full_name: '',
        business_name: '',
        description: '',
        service_city: '',
        service_district: '',
        latitude: '',
        longitude: '',
        website: '',
        logo_url: '',
        is_verified: false,
        status: 'pending',
        categories: []
      });
      checkAdminAndLoad();
    } catch (err: any) {
      toast(err.message || 'Failed to create provider', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleUpdateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvider) return;

    setUploadingLogo(true);
    try {
      let finalLogoUrl = editForm.logo_url;
      if (editLogoFile) {
        const token = await getToken();
        const client = getSupabaseClient(token);
        const fileExt = editLogoFile.name.split('.').pop();
        const filePath = `${editingProvider.id}/logo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: logoUploadError } = await client.storage
          .from('logos')
          .upload(filePath, editLogoFile);

        if (!logoUploadError) {
          const { data } = client.storage.from('logos').getPublicUrl(filePath);
          finalLogoUrl = data.publicUrl;
        } else {
          // Fallback to permits bucket
          const { error: fallbackError } = await client.storage
            .from('permits')
            .upload(filePath, editLogoFile);
          if (!fallbackError) {
            const { data } = client.storage.from('permits').getPublicUrl(filePath);
            finalLogoUrl = data.publicUrl;
          }
        }
      }

      const response = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_provider',
          payload: {
            providerId: editingProvider.id,
            ...editForm,
            logo_url: finalLogoUrl,
            latitude: editForm.latitude ? parseFloat(editForm.latitude) : null,
            longitude: editForm.longitude ? parseFloat(editForm.longitude) : null,
            service_categories: editForm.categories
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update provider');
      }

      toast('Provider updated successfully', 'success');
      setEditingProvider(null);
      setEditLogoFile(null);
      setEditLogoName('');
      checkAdminAndLoad();
    } catch (err: any) {
      toast(err.message || 'Failed to update provider', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const [providerToDelete, setProviderToDelete] = useState<Provider | null>(null);

  const handleDeleteProvider = async (providerId: string) => {
    try {
      const response = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_provider',
          payload: { providerId }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete provider');
      }

      toast('Provider deleted successfully', 'success');
      setProviderToDelete(null);
      checkAdminAndLoad();
    } catch (err: any) {
      toast(err.message || 'Failed to delete provider', 'error');
    }
  };

  async function checkAdminAndLoad() {
    try {
      const token = await getToken();
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/users/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        router.push('/');
        return;
      }

      const resData = await response.json();
      if (!resData.success || !resData.user || resData.user.role !== 'admin') {
        router.push('/');
        return;
      }

      // Fetch all stats and tables in a single server-side API call to avoid RLS/JWT constraints
      const dataResponse = await fetch('/api/admin/data');
      if (!dataResponse.ok || !dataResponse.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Failed to load admin data: Invalid response format');
      }

      const adminData = await dataResponse.json();
      if (adminData.success) {
        setStats(adminData.stats);
        setProviders(adminData.providers);
        setCategories(adminData.categories);
        setReviews(adminData.reviews);
      }

    } catch (err) {
      console.error('Admin dashboard loading error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      checkAdminAndLoad();
    }
  }, [user]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!editingCategory) {
      setCategoryFormSlug(categoryFormName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  }, [categoryFormName, editingCategory]);

  // Sync full address search term for geocoding when individual fields change
  useEffect(() => {
    if (editingProvider) {
      const parts = [
        editForm.house_building_number,
        editForm.street_name,
        editForm.service_district,
        editForm.service_city,
        editForm.state_province_region,
        editForm.postal_zip_code,
        editForm.country
      ].filter(Boolean);
      setEditForm(prev => ({ ...prev, full_address: parts.join(', ') }));
    }
  }, [
    editForm.house_building_number,
    editForm.street_name,
    editForm.service_district,
    editForm.service_city,
    editForm.state_province_region,
    editForm.postal_zip_code,
    editForm.country,
    editingProvider
  ]);

  const handleUpdateStatus = async (providerId: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          payload: { providerId, status }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      toast(`Provider status set to ${status}`, 'success');
      checkAdminAndLoad();
    } catch (err) {
      toast('Failed to update provider status.', 'error');
    }
  };

  const handleToggleVerified = async (providerId: string, current: boolean) => {
    try {
      const response = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_verified',
          payload: { providerId }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle verification');
      }

      toast(`Verification badge toggled`, 'success');
      checkAdminAndLoad();
    } catch (err) {
      toast('Failed to toggle verification.', 'error');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormName || !categoryFormSlug) return;

    setSubmittingCategory(true);
    try {
      const response = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_category',
          payload: {
            name: categoryFormName,
            slug: categoryFormSlug.toLowerCase().replace(/\s+/g, '-'),
            icon: categoryFormIcon || null,
            is_active: categoryFormActive
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add category');
      }

      toast('Category added successfully', 'success');
      setCategoryFormName('');
      setCategoryFormSlug('');
      setCategoryFormIcon('sparkles');
      setCategoryFormActive(true);
      setShowCategoryForm(false);
      checkAdminAndLoad();
    } catch (err: any) {
      toast(err.message || 'Could not add category.', 'error');
    } finally {
      setSubmittingCategory(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !categoryFormName || !categoryFormSlug) return;

    setSubmittingCategory(true);
    try {
      const response = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_category',
          payload: {
            categoryId: editingCategory.id,
            name: categoryFormName,
            slug: categoryFormSlug.toLowerCase().replace(/\s+/g, '-'),
            icon: categoryFormIcon || null,
            is_active: categoryFormActive
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update category');
      }

      toast('Category updated successfully', 'success');
      setEditingCategory(null);
      setCategoryFormName('');
      setCategoryFormSlug('');
      setCategoryFormIcon('sparkles');
      setCategoryFormActive(true);
      setShowCategoryForm(false);
      checkAdminAndLoad();
    } catch (err: any) {
      toast(err.message || 'Could not update category.', 'error');
    } finally {
      setSubmittingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? This might impact services using it.')) return;

    try {
      const response = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_category',
          payload: { categoryId }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to delete category');
      }

      toast('Category deleted successfully', 'success');
      checkAdminAndLoad();
    } catch (err: any) {
      toast(err.message || 'Could not delete category.', 'error');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to remove this review?')) return;

    try {
      const response = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_review',
          payload: { reviewId }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to moderate review');
      }

      toast('Review removed successfully', 'success');
      checkAdminAndLoad();
    } catch (err) {
      toast('Could not moderate review.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center p-8 min-h-screen">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Tab 1: Stats Overview */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-stone-900 border border-champagne/60 rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <Users className="w-8 h-8 text-accent animate-pulse" />
            <div>
              <span className="text-[10px] font-bold text-stone-400 dark:text-white uppercase tracking-wider block">Total Users</span>
              <span className="text-3xl font-bold font-display text-stone-900 dark:text-white">{stats.usersCount}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-champagne/60 rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <Building2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div>
              <span className="text-[10px] font-bold text-stone-400 dark:text-white uppercase tracking-wider block">Total Providers</span>
              <span className="text-3xl font-bold font-display text-stone-900 dark:text-white">{stats.providersCount}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-champagne/60 rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <CalendarDays className="w-8 h-8 text-purple-700 dark:text-purple-400" />
            <div>
              <span className="text-[10px] font-bold text-stone-400 dark:text-white uppercase tracking-wider block">Total Bookings</span>
              <span className="text-3xl font-bold font-display text-stone-900 dark:text-white">{stats.bookingsCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Provider Approvals */}
      {activeTab === 'providers' && (() => {
        const itemsPerPage = 10;
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        const currentProviders = providers.slice(indexOfFirstItem, indexOfLastItem);
        const totalPages = Math.ceil(providers.length / itemsPerPage);

        return (
          <div className="flex flex-col gap-6">
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setCreateForm({
                    email: '',
                    full_name: '',
                    business_name: '',
                    description: '',
                    service_city: '',
                    service_district: '',
                    latitude: '',
                    longitude: '',
                    website: '',
                    logo_url: '',
                    is_verified: false,
                    status: 'pending',
                    categories: []
                  });
                  setShowCreateModal(true);
                }}
                className="px-4 py-2.5 bg-primary hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-black rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Provider
              </button>
            </div>
            <div className="bg-white border border-champagne/60 rounded-2xl overflow-hidden shadow-sm">
              <div className="divide-y divide-champagne/30">
                {currentProviders.map((p) => (
                  <div key={p.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {/* Left: Company Logo */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-50 border border-champagne/40 flex-shrink-0 flex items-center justify-center relative">
                        {p.logo_url ? (
                          <img
                            src={p.logo_url}
                            alt={p.business_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-champagne/20 border border-champagne/40 rounded-xl flex items-center justify-center text-accent text-sm font-bold">
                            {p.business_name.charAt(0)}
                          </div>
                        )}
                      </div>

                      {/* Right: Info Details */}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-sans font-bold text-espresso text-base flex items-center gap-2">
                          <Link href={`/admin/providers/${p.id}`} className="hover:text-accent hover:underline">
                            {p.business_name}
                          </Link>
                          {p.is_verified && <Award className="w-4 h-4 text-accent" />}
                        </h3>
                        <p className="text-stone-500 text-xs mt-1 font-sans">{p.description}</p>
                        <div className="flex flex-wrap items-center gap-4 text-stone-400 text-xs mt-3">
                          <span>City: {p.service_city}</span>
                          <span>District: {p.service_district}</span>
                          {p.website && <span>Website: {p.website}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* Status Badge */}
                      <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border ${p.status === 'approved'
                          ? 'bg-purple-50 border-purple-200 text-purple-800'
                          : p.status === 'rejected'
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}>
                        {p.status}
                      </span>

                      {/* View Map Location */}
                      <button
                        onClick={() => setSelectedProviderMap(p)}
                        className="p-2 bg-stone-50 hover:bg-stone-100 border border-champagne/60 rounded-lg text-slate-700 text-xs font-semibold flex items-center gap-1"
                        title="View Pinned Location"
                      >
                        <Eye className="w-4 h-4" /> Location
                      </button>

                      {/* Verification Toggle */}
                      <button
                        onClick={() => handleToggleVerified(p.id, p.is_verified)}
                        className="p-2 bg-stone-50 hover:bg-stone-100 border border-champagne/60 rounded-lg text-slate-700 text-xs font-semibold flex items-center gap-1"
                        title="Toggle Verification Badge"
                      >
                        <Award className="w-4 h-4" /> Verify
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => {
                           setEditForm({
                            business_name: p.business_name || '',
                            description: p.description || '',
                            service_city: p.service_city || '',
                            service_district: p.service_district || '',
                            latitude: p.latitude !== null && p.latitude !== undefined ? String(p.latitude) : '',
                            longitude: p.longitude !== null && p.longitude !== undefined ? String(p.longitude) : '',
                            website: p.website || '',
                            logo_url: p.logo_url || '',
                            is_verified: p.is_verified || false,
                            status: p.status || 'pending',
                            categories: p.service_categories || [],
                            house_building_number: p.house_building_number || '',
                            street_name: p.street_name || '',
                            state_province_region: p.state_province_region || '',
                            postal_zip_code: p.postal_zip_code || '',
                            country: p.country || '',
                            full_address: [
                              p.house_building_number,
                              p.street_name,
                              p.service_district,
                              p.service_city,
                              p.state_province_region,
                              p.postal_zip_code,
                              p.country
                            ].filter(Boolean).join(', ')
                          });
                          setEditingProvider(p);
                        }}
                        className="p-2 bg-stone-50 hover:bg-stone-100 border border-champagne/60 rounded-lg text-slate-700 hover:text-accent transition-colors flex items-center gap-1 font-semibold text-xs"
                        title="Edit Provider Details"
                      >
                        <FolderEdit className="w-4 h-4" /> Edit
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => setProviderToDelete(p)}
                        className="p-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-700 transition-all flex items-center gap-1 font-semibold text-xs"
                        title="Delete Provider"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>

                      {/* Approve / Reject Actions */}
                      {p.status === 'pending' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateStatus(p.id, 'approved')}
                            className="p-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-lg transition-all"
                            title="Approve Provider"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(p.id, 'rejected')}
                            className="p-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg transition-all"
                            title="Reject Provider"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center px-6 py-4 bg-stone-50 border-t border-champagne/30 flex-wrap gap-4">
                  <span className="text-xs text-stone-500 font-sans">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(1)}
                      className="px-2.5 py-1.5 rounded-lg border border-champagne text-[10px] font-bold text-slate-700 bg-white hover:border-gold disabled:opacity-40 disabled:hover:border-champagne transition-all"
                      title="First Page"
                    >
                      &lt;&lt;
                    </button>
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="px-3 py-1.5 rounded-lg border border-champagne text-[10px] font-bold text-slate-700 bg-white hover:border-gold disabled:opacity-40 disabled:hover:border-champagne transition-all"
                      title="Previous Page"
                    >
                      &lt;
                    </button>

                    {(() => {
                      const pages: (number | string)[] = [];
                      const range = 1;
                      for (let i = 1; i <= totalPages; i++) {
                        if (
                          i === 1 ||
                          i === totalPages ||
                          (i >= currentPage - range && i <= currentPage + range)
                        ) {
                          pages.push(i);
                        } else if (
                          (i === 2 && currentPage - range > 2) ||
                          (i === totalPages - 1 && currentPage + range < totalPages - 1)
                        ) {
                          pages.push('...');
                        }
                      }
                      const filteredPages = pages.filter((page, index) => {
                        if (page === '...' && pages[index - 1] === '...') {
                          return false;
                        }
                        return true;
                      });

                      return filteredPages.map((page, idx) => {
                        if (page === '...') {
                          return (
                            <span key={`dots-${idx}`} className="px-2 text-stone-400 text-xs select-none">
                              ...
                            </span>
                          );
                        }

                        const pageNum = page as number;
                        return (
                          <button
                            type="button"
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${currentPage === pageNum
                                ? 'bg-accent border-accent text-white shadow-xs'
                                : 'bg-white border-champagne text-stone-600 hover:border-gold'
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      });
                    })()}

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="px-3 py-1.5 rounded-lg border border-champagne text-[10px] font-bold text-slate-700 bg-white hover:border-gold disabled:opacity-40 disabled:hover:border-champagne transition-all"
                      title="Next Page"
                    >
                      &gt;
                    </button>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-2.5 py-1.5 rounded-lg border border-champagne text-[10px] font-bold text-slate-700 bg-white hover:border-gold disabled:opacity-40 disabled:hover:border-champagne transition-all"
                      title="Last Page"
                    >
                      &gt;&gt;
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Location modal */}
            {selectedProviderMap && (
              <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
                <div className="bg-white border border-champagne rounded-2xl p-6 shadow-2xl max-w-lg w-full flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-champagne/45 pb-3">
                    <h3 className="font-display font-bold text-espresso text-base">
                      Location: {selectedProviderMap.business_name}
                    </h3>
                    <button onClick={() => setSelectedProviderMap(null)} className="text-stone-400 hover:text-stone-600 font-bold text-lg">&times;</button>
                  </div>
                  <Map
                    latitude={selectedProviderMap.latitude}
                    longitude={selectedProviderMap.longitude}
                    viewOnly={true}
                  />
                </div>
              </div>
            )}

            {/* Create Provider Modal */}
            {showCreateModal && (
              <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
                <form onSubmit={handleCreateProvider} className="bg-white border border-champagne rounded-2xl p-6 shadow-2xl max-w-2xl w-full flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center border-b border-champagne/45 pb-3">
                    <h3 className="font-display font-bold text-espresso text-base flex items-center gap-1.5">
                      <Plus className="w-5 h-5 text-accent" /> Add New Provider
                    </h3>
                    <button type="button" onClick={() => {
                      setShowCreateModal(false);
                      setCreateLogoFile(null);
                      setCreateLogoName('');
                    }} className="text-stone-400 hover:text-stone-600 font-bold text-lg">&times;</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* User Account Details */}
                    <div className="md:col-span-2 border-b border-champagne/40 pb-2">
                      <h4 className="font-display font-bold text-xs text-stone-400 uppercase tracking-wider">User Account Settings</h4>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Owner Email</label>
                      <input
                        type="email"
                        required
                        value={createForm.email}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="owner@example.com"
                        className="w-full border border-champagne rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Owner Full Name</label>
                      <input
                        type="text"
                        required
                        value={createForm.full_name}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="John Doe"
                        className="w-full border border-champagne rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-accent"
                      />
                    </div>

                    {/* Business Details */}
                    <div className="md:col-span-2 border-b border-champagne/40 pb-2 mt-2">
                      <h4 className="font-display font-bold text-xs text-stone-400 uppercase tracking-wider">Business Details</h4>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Business Name</label>
                      <input
                        type="text"
                        required
                        value={createForm.business_name}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, business_name: e.target.value }))}
                        placeholder="e.g. Acme Cleaning Services"
                        className="w-full border border-champagne rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Website URL</label>
                      <input
                        type="text"
                        value={createForm.website}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="e.g. www.acmecleaning.com"
                        className="w-full border border-champagne rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Description</label>
                      <textarea
                        value={createForm.description}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Provide details about the business, services offered, etc."
                        rows={3}
                        className="w-full border border-champagne rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-accent"
                      />
                    </div>

                    {/* Location & Contact */}
                    <div className="md:col-span-2 border-b border-champagne/40 pb-2 mt-2">
                      <h4 className="font-display font-bold text-xs text-stone-400 uppercase tracking-wider">Location & Branding</h4>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Service City</label>
                      <input
                        type="text"
                        required
                        value={createForm.service_city}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, service_city: e.target.value }))}
                        placeholder="e.g. Manila"
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Service District</label>
                      <input
                        type="text"
                        required
                        value={createForm.service_district}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, service_district: e.target.value }))}
                        placeholder="e.g. Makati"
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={createForm.latitude}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, latitude: e.target.value }))}
                        placeholder="e.g. 14.5995"
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={createForm.longitude}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, longitude: e.target.value }))}
                        placeholder="e.g. 120.9842"
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent bg-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Company Logo</label>
                      <div className="border-2 border-dashed border-champagne/80 hover:border-accent rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-stone-50 relative">
                        <input
                          type="file"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setCreateLogoFile(e.target.files[0]);
                              setCreateLogoName(e.target.files[0].name);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          accept="image/*"
                        />
                        <Upload className="w-6 h-6 text-stone-400 mb-2" />
                        <span className="text-xs font-bold text-slate-700 font-sans">
                          Click to upload provider logo
                        </span>
                        <span className="text-[10px] text-stone-400 mt-1 font-sans">JPEG, PNG formats</span>
                      </div>

                      {/* Logo Image Preview (rendered below the upload input box) */}
                      {createLogoFile ? (
                        <div className="mt-3 flex items-center gap-3 bg-stone-50 border border-champagne/45 p-2 rounded-xl">
                          <img
                            src={URL.createObjectURL(createLogoFile)}
                            alt="New logo upload preview"
                            onClick={() => setPreviewImageUrl(URL.createObjectURL(createLogoFile))}
                            className="w-12 h-12 rounded-lg object-cover border border-champagne cursor-zoom-in hover:opacity-90 transition-opacity animate-fade-in"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-700">Preview of logo</span>
                            <span className="text-[10px] text-stone-400 font-sans">{createLogoName}</span>
                          </div>
                        </div>
                      ) : createForm.logo_url ? (
                        <div className="mt-3 flex items-center gap-3 bg-stone-50 border border-champagne/45 p-2 rounded-xl">
                          <img
                            src={createForm.logo_url}
                            alt="Provided logo URL preview"
                            onClick={() => setPreviewImageUrl(createForm.logo_url)}
                            className="w-12 h-12 rounded-lg object-cover border border-champagne cursor-zoom-in hover:opacity-90 transition-opacity animate-fade-in"
                          />
                          <span className="text-xs text-stone-500 font-sans">Preview of logo URL</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Or Paste Logo URL</label>
                      <input
                        type="text"
                        value={createForm.logo_url}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, logo_url: e.target.value }))}
                        placeholder="https://example.com/logo.png"
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Status</label>
                      <select
                        value={createForm.status}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, status: e.target.value as any }))}
                        className="w-full border border-champagne rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-accent bg-white"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>

                    {/* Status & Verify Options */}
                    <div className="md:col-span-2 flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        id="create_is_verified"
                        checked={createForm.is_verified}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, is_verified: e.target.checked }))}
                        className="rounded border-champagne text-primary focus:ring-accent"
                      />
                      <label htmlFor="create_is_verified" className="text-xs font-semibold text-stone-600 cursor-pointer">
                        Is Verified (Verified Badge)
                      </label>
                    </div>

                    {/* Service Categories Multi-Select */}
                    <div className="md:col-span-2 border-b border-champagne/40 pb-2 mt-2">
                      <h4 className="font-display font-bold text-xs text-stone-400 uppercase tracking-wider">Service Categories</h4>
                    </div>

                    <div className="md:col-span-2 grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-xl border border-champagne/50 font-sans">
                      {categories.map((c) => {
                        const isChecked = createForm.categories.includes(c.name);
                        return (
                          <div key={c.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`create_cat_${c.id}`}
                              checked={isChecked}
                              onChange={() => {
                                setCreateForm(prev => {
                                  const list = prev.categories.includes(c.name)
                                    ? prev.categories.filter(x => x !== c.name)
                                    : [...prev.categories, c.name];
                                  return { ...prev, categories: list };
                                });
                              }}
                              className="rounded border-champagne text-primary focus:ring-accent"
                            />
                            <label htmlFor={`create_cat_${c.id}`} className="text-[11px] text-stone-600 cursor-pointer">
                              {c.name}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-champagne/45">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setCreateLogoFile(null);
                        setCreateLogoName('');
                      }}
                      className="px-4 py-2.5 border border-champagne text-stone-600 hover:bg-stone-50 rounded-xl text-xs font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploadingLogo}
                      className="px-4 py-2.5 bg-primary hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                      {uploadingLogo ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Saving...
                        </>
                      ) : 'Add Provider'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Edit Provider Modal */}
            {editingProvider && (
              <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
                <form onSubmit={handleUpdateProvider} className="bg-white border border-champagne rounded-2xl p-6 shadow-2xl max-w-2xl w-full flex flex-col gap-4 max-h-[90vh] overflow-y-auto font-sans">
                  <div className="flex justify-between items-center border-b border-champagne/45 pb-3">
                    <h3 className="font-display font-bold text-espresso text-base flex items-center gap-1.5">
                      <FolderEdit className="w-5 h-5 text-accent" /> Edit Provider Profile
                    </h3>
                    <button type="button" onClick={() => {
                      setEditingProvider(null);
                      setEditLogoFile(null);
                      setEditLogoName('');
                    }} className="text-stone-400 hover:text-stone-600 font-bold text-lg">&times;</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Business Details */}
                    <div className="md:col-span-2 border-b border-champagne/40 pb-2">
                      <h4 className="font-display font-bold text-xs text-stone-400 uppercase tracking-wider">Business Details</h4>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Business Name</label>
                      <input
                        type="text"
                        required
                        value={editForm.business_name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, business_name: e.target.value }))}
                        placeholder="e.g. Acme Cleaning Services"
                        className="w-full border border-champagne rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Website URL</label>
                      <input
                        type="text"
                        value={editForm.website}
                        onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="e.g. www.acmecleaning.com"
                        className="w-full border border-champagne rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Provide details about the business, services offered, etc."
                        rows={3}
                        className="w-full border border-champagne rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-accent"
                      />
                    </div>

                    {/* Location & Address */}
                    <div className="md:col-span-2 border-b border-champagne/40 pb-2 mt-2">
                      <h4 className="font-display font-bold text-xs text-stone-400 uppercase tracking-wider">Location & Address</h4>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">House/Building Number</label>
                      <input
                        type="text"
                        value={editForm.house_building_number}
                        onChange={(e) => setEditForm(prev => ({ ...prev, house_building_number: e.target.value }))}
                        placeholder="e.g. 123"
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Street Name</label>
                      <input
                        type="text"
                        value={editForm.street_name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, street_name: e.target.value }))}
                        placeholder="e.g. Main Street"
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">District / Neighborhood</label>
                      <input
                        type="text"
                        value={editForm.service_district}
                        onChange={(e) => setEditForm(prev => ({ ...prev, service_district: e.target.value }))}
                        placeholder="e.g. Makati"
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">City/Locality</label>
                      <input
                        type="text"
                        required
                        value={editForm.service_city}
                        onChange={(e) => setEditForm(prev => ({ ...prev, service_city: e.target.value }))}
                        placeholder="e.g. Manila"
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">State/Province/Region</label>
                      <input
                        type="text"
                        value={editForm.state_province_region}
                        onChange={(e) => setEditForm(prev => ({ ...prev, state_province_region: e.target.value }))}
                        placeholder="e.g. Metro Manila"
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Postal/Zip Code</label>
                      <input
                        type="text"
                        value={editForm.postal_zip_code}
                        onChange={(e) => setEditForm(prev => ({ ...prev, postal_zip_code: e.target.value }))}
                        placeholder="e.g. 1200"
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Country</label>
                      <input
                        type="text"
                        value={editForm.country}
                        onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                        placeholder="e.g. Canada"
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent bg-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Full Address (Geocoding Address Lookups)</label>
                      <input
                        type="text"
                        value={editForm.full_address}
                        onChange={(e) => setEditForm(prev => ({ ...prev, full_address: e.target.value }))}
                        placeholder="Type address to locate automatically on map"
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={editForm.latitude}
                        onChange={(e) => setEditForm(prev => ({ ...prev, latitude: e.target.value }))}
                        placeholder="e.g. 14.5995"
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={editForm.longitude}
                        onChange={(e) => setEditForm(prev => ({ ...prev, longitude: e.target.value }))}
                        placeholder="e.g. 120.9842"
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent bg-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Pin Location on Map</label>
                      <Map
                        latitude={editForm.latitude ? parseFloat(editForm.latitude) : null}
                        longitude={editForm.longitude ? parseFloat(editForm.longitude) : null}
                        address={editForm.full_address}
                        onLocationChange={(lat, lng) => {
                          setEditForm(prev => ({
                            ...prev,
                            latitude: String(lat),
                            longitude: String(lng)
                          }));
                        }}
                        businessName={editForm.business_name}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Company Logo</label>
                      <div className="border-2 border-dashed border-champagne/80 hover:border-accent rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-stone-50 relative">
                        <input
                          type="file"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setEditLogoFile(e.target.files[0]);
                              setEditLogoName(e.target.files[0].name);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          accept="image/*"
                        />
                        <Upload className="w-6 h-6 text-stone-400 mb-2" />
                        <span className="text-xs font-bold text-slate-700 font-sans">
                          Click to upload provider logo
                        </span>
                        <span className="text-[10px] text-stone-400 mt-1 font-sans">JPEG, PNG formats</span>
                      </div>

                      {/* Logo Image Preview (rendered below the upload input box) */}
                      {editLogoFile ? (
                        <div className="mt-3 flex items-center gap-3 bg-stone-50 border border-champagne/45 p-2 rounded-xl">
                          <img
                            src={URL.createObjectURL(editLogoFile)}
                            alt="New logo upload preview"
                            onClick={() => setPreviewImageUrl(URL.createObjectURL(editLogoFile))}
                            className="w-12 h-12 rounded-lg object-cover border border-champagne cursor-zoom-in hover:opacity-90 transition-opacity animate-fade-in"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-700">Preview of new logo</span>
                            <span className="text-[10px] text-stone-400 font-sans">{editLogoName}</span>
                          </div>
                        </div>
                      ) : editForm.logo_url ? (
                        <div className="mt-3 flex items-center gap-3 bg-stone-50 border border-champagne/45 p-2 rounded-xl">
                          <img
                            src={editForm.logo_url}
                            alt="Current active logo preview"
                            onClick={() => setPreviewImageUrl(editForm.logo_url)}
                            className="w-12 h-12 rounded-lg object-cover border border-champagne cursor-zoom-in hover:opacity-90 transition-opacity animate-fade-in"
                          />
                          <span className="text-xs text-stone-500 font-sans">Current active logo</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Or Edit Logo URL</label>
                      <input
                        type="text"
                        value={editForm.logo_url}
                        onChange={(e) => setEditForm(prev => ({ ...prev, logo_url: e.target.value }))}
                        placeholder="https://example.com/logo.png"
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Status</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                        className="w-full border border-champagne rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-accent bg-white"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>

                    {/* Status & Verify Options */}
                    <div className="md:col-span-2 flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        id="edit_is_verified"
                        checked={editForm.is_verified}
                        onChange={(e) => setEditForm(prev => ({ ...prev, is_verified: e.target.checked }))}
                        className="rounded border-champagne text-primary focus:ring-accent"
                      />
                      <label htmlFor="edit_is_verified" className="text-xs font-semibold text-stone-600 cursor-pointer">
                        Is Verified (Verified Badge)
                      </label>
                    </div>

                    {/* Service Categories Multi-Select */}
                    <div className="md:col-span-2 border-b border-champagne/40 pb-2 mt-2">
                      <h4 className="font-display font-bold text-xs text-stone-400 uppercase tracking-wider">Service Categories</h4>
                    </div>

                    <div className="md:col-span-2 grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-xl border border-champagne/50">
                      {categories.map((c) => {
                        const isChecked = editForm.categories.includes(c.name);
                        return (
                          <div key={c.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`edit_cat_${c.id}`}
                              checked={isChecked}
                              onChange={() => {
                                setEditForm(prev => {
                                  const list = prev.categories.includes(c.name)
                                    ? prev.categories.filter(x => x !== c.name)
                                    : [...prev.categories, c.name];
                                  return { ...prev, categories: list };
                                });
                              }}
                              className="rounded border-champagne text-primary focus:ring-accent"
                            />
                            <label htmlFor={`edit_cat_${c.id}`} className="text-[11px] text-stone-600 cursor-pointer">
                              {c.name}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-champagne/45">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProvider(null);
                        setEditLogoFile(null);
                        setEditLogoName('');
                      }}
                      className="px-4 py-2.5 border border-champagne text-stone-600 hover:bg-stone-50 rounded-xl text-xs font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploadingLogo}
                      className="px-4 py-2.5 bg-primary hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                      {uploadingLogo ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Saving...
                        </>
                      ) : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {providerToDelete && (
              <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
                <div className="bg-white border border-champagne rounded-2xl p-6 shadow-2xl max-w-md w-full flex flex-col gap-4 font-sans">
                  <div className="flex items-center gap-3 text-red-600">
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                      <Trash2 className="w-5 h-5 animate-pulse" />
                    </div>
                    <h3 className="font-display font-bold text-espresso text-lg">
                      Delete Provider Profile?
                    </h3>
                  </div>

                  <p className="text-stone-600 text-xs leading-relaxed">
                    Are you sure you want to delete the business profile for <strong className="text-espresso font-bold">{providerToDelete.business_name}</strong>?
                    This action will permanently delete all services associated with this provider and revert their user account role back to a seeker. This cannot be undone.
                  </p>

                  <div className="flex justify-end gap-3 mt-4 pt-2">
                    <button
                      type="button"
                      onClick={() => setProviderToDelete(null)}
                      className="px-4 py-2.5 border border-champagne text-stone-600 hover:bg-stone-50 rounded-xl text-xs font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProvider(providerToDelete.id)}
                      className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      Delete Profile
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Tab 3: Categories CRUD */}
      {activeTab === 'categories' && (() => {
        const filteredCategories = categories.filter((c) =>
          c.name.toLowerCase().includes(categorySearchQuery.toLowerCase()) ||
          c.slug.toLowerCase().includes(categorySearchQuery.toLowerCase())
        );

        return (
          <div className="flex flex-col gap-6">
            {/* Header section with "+ Add Category" button */}
            <div className="flex justify-between items-center border-b border-champagne/40 pb-4 flex-wrap gap-4">
              <div>
                <h1 className="font-display text-2xl font-bold text-espresso tracking-tight">Categories Directory</h1>
                <p className="text-stone-500 text-xs font-sans mt-0.5">Manage and organize platform service categories.</p>
              </div>
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryFormName('');
                  setCategoryFormSlug('');
                  setCategoryFormIcon('sparkles');
                  setCategoryFormActive(true);
                  setShowCategoryForm(true);
                }}
                className="bg-primary hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-black font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Category
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Categories List & Search */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={categorySearchQuery}
                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-champagne rounded-xl text-xs focus:outline-none focus:border-accent"
                  />
                </div>

                {filteredCategories.length === 0 ? (
                  <div className="bg-white border border-champagne rounded-2xl p-12 text-center shadow-sm">
                    <FolderHeart className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                    <p className="text-stone-400 text-sm font-sans">No categories found matching your query.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredCategories.map((c) => (
                      <div
                        key={c.id}
                        className="bg-white border border-champagne/60 rounded-xl p-5 shadow-sm flex flex-col justify-between gap-4 hover:border-accent/40 transition-all bg-stone-50/20"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-stone-50 border border-champagne/50 flex items-center justify-center text-espresso text-base">
                              {getEmojiForIcon(c.icon)}
                            </div>
                            <div>
                              <h3 className="font-sans font-bold text-espresso text-sm leading-tight">{c.name}</h3>
                              <span className="text-[10px] text-stone-400 font-mono">/{c.slug}</span>
                            </div>
                          </div>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${c.is_active
                              ? 'bg-purple-50 border-purple-200 text-purple-800'
                              : 'bg-stone-50 border-stone-200 text-stone-500'
                            }`}>
                            {c.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-stone-400 font-sans border-t border-champagne/30 pt-3 mt-1">
                          <span>Icon: <span className="font-mono text-espresso font-bold">{c.icon || 'sparkles'}</span></span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingCategory(c);
                                setCategoryFormName(c.name);
                                setCategoryFormSlug(c.slug);
                                setCategoryFormIcon(c.icon || 'sparkles');
                                setCategoryFormActive(c.is_active);
                                setShowCategoryForm(true);
                              }}
                              className="p-1.5 hover:bg-stone-100 border border-champagne/60 rounded-lg text-slate-700 hover:text-accent transition-all"
                              title="Edit Category"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(c.id)}
                              className="p-1.5 hover:bg-red-100 bg-red-50/50 border border-red-200 rounded-lg text-red-700 transition-all"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Inline Edit/Add Form */}
              <div className="flex flex-col gap-6">
                {showCategoryForm ? (
                  <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory} className="bg-white border border-champagne/80 rounded-2xl p-6 shadow-md flex flex-col gap-4 sticky top-24 font-sans">
                    <div className="flex justify-between items-center border-b border-champagne/45 pb-3">
                      <h2 className="font-display font-bold text-espresso text-sm uppercase tracking-wider">
                        {editingCategory ? 'Edit Category' : 'New Category'}
                      </h2>
                      <button type="button" onClick={() => setShowCategoryForm(false)} className="text-stone-400 hover:text-stone-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Category Name</label>
                      <input
                        type="text"
                        required
                        value={categoryFormName}
                        onChange={(e) => setCategoryFormName(e.target.value)}
                        placeholder="e.g. Roof Repair"
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Slug</label>
                      <input
                        type="text"
                        required
                        value={categoryFormSlug}
                        onChange={(e) => setCategoryFormSlug(e.target.value)}
                        placeholder="e.g. roof-repair"
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Icon Name / Emoji</label>
                      <div className="mb-2 flex items-center justify-center w-12 h-12 rounded-lg bg-champagne/20 border border-champagne/45 text-2xl animate-fade-in">
                        {getEmojiForIcon(categoryFormIcon)}
                      </div>
                      <input
                        type="text"
                        value={categoryFormIcon}
                        onChange={(e) => setCategoryFormIcon(e.target.value)}
                        placeholder="e.g. sparkles, wrench, zap or 🧹"
                        className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="checkbox"
                        id="category_active"
                        checked={categoryFormActive}
                        onChange={(e) => setCategoryFormActive(e.target.checked)}
                        className="rounded text-accent focus:ring-accent"
                      />
                      <label htmlFor="category_active" className="text-xs font-semibold text-stone-600 select-none cursor-pointer">
                        Mark as Active
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingCategory}
                      className="w-full bg-primary hover:bg-slate-800 text-white font-semibold text-xs py-3 rounded-xl transition-all shadow-sm mt-2 flex items-center justify-center gap-1.5"
                    >
                      {submittingCategory ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Save Category
                    </button>
                  </form>
                ) : (
                  <div className="bg-stone-50/50 border border-dashed border-champagne rounded-2xl p-6 text-center text-stone-400 text-xs py-12">
                    Select a category to edit or create a new one to begin editing here.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tab 4: Review Moderation */}
      {activeTab === 'reviews' && (
        <div className="bg-white border border-champagne/60 rounded-2xl overflow-hidden shadow-sm">
          {reviews.length === 0 ? (
            <p className="p-8 text-center text-xs text-stone-400 italic font-sans">No reviews found.</p>
          ) : (
            <div className="divide-y divide-champagne/30">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-6 flex items-start justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-xs font-bold text-slate-800">{rev.users.full_name}</span>
                      <span className="text-stone-400 text-[10px]">reviewed</span>
                      <span className="text-xs font-bold text-accent">{rev.providers.business_name}</span>
                    </div>
                    <div className="flex items-center gap-0.5 mb-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < rev.rating ? 'text-amber-500 fill-amber-500' : 'text-stone-200'
                            }`}
                        />
                      ))}
                    </div>
                    <p className="text-stone-600 text-xs font-sans leading-relaxed">{rev.comment}</p>
                  </div>

                  <button
                    onClick={() => handleDeleteReview(rev.id)}
                    className="p-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-700 transition-all text-xs font-semibold flex items-center gap-1"
                    title="Remove Review"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-8 h-[50vh]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}
