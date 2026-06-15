'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, useUser, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { supabase, getSupabaseClient } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useToast } from '@/components/Providers';
import { 
  Users, 
  Building2, 
  CalendarDays, 
  ShieldAlert, 
  Award, 
  FolderEdit, 
  Trash2, 
  Check, 
  XCircle,
  Eye,
  Sliders,
  Star
} from 'lucide-react';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

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
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
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

export default function AdminDashboard() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'stats' | 'providers' | 'categories' | 'reviews'>('stats');
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
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [submittingCategory, setSubmittingCategory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentCategoryPage, setCurrentCategoryPage] = useState(1);

  async function checkAdminAndLoad() {
    try {
      const token = await getToken();
      if (!token) {
        router.push('/');
        return;
      }

      // Verify user role via secure server sync API to avoid client-side RLS/JWT config errors
      const response = await fetch('/api/users/sync', { method: 'POST' });
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
          payload: { providerId, currentVerified: current }
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
    if (!categoryName || !categorySlug) return;

    setSubmittingCategory(true);
    try {
      const response = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_category',
          payload: {
            name: categoryName,
            slug: categorySlug.toLowerCase().replace(/\s+/g, '-')
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add category');
      }

      toast('Category added successfully', 'success');
      setCategoryName('');
      setCategorySlug('');
      checkAdminAndLoad();
    } catch (err) {
      toast('Could not add category.', 'error');
    } finally {
      setSubmittingCategory(false);
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
    <div className="flex flex-col min-h-screen">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Panel Content */}
      <div className="flex-grow pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-8">
      <div className="flex justify-between items-center border-b border-champagne/60 pb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-espresso">Admin Panel</h1>
          <p className="text-stone-500 text-xs font-sans mt-1">Platform management console for Serch.</p>
        </div>

        {/* Tab Selection & Navigation */}
        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className="px-4 py-2 rounded-xl text-xs font-bold border border-accent text-accent hover:bg-purple-50 transition-all uppercase tracking-wider bg-white shadow-sm"
          >
            Find Providers
          </Link>
          <div className="flex items-center gap-2">
            {['stats', 'providers', 'categories', 'reviews'].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all uppercase tracking-wider ${
                  activeTab === t
                    ? 'bg-primary border-primary text-white shadow-sm'
                    : 'bg-white border-champagne text-stone-600 hover:border-gold'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab 1: Stats Overview */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-champagne/60 rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <Users className="w-8 h-8 text-accent" />
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Total Users</span>
              <span className="text-3xl font-bold font-display text-espresso">{stats.usersCount}</span>
            </div>
          </div>

          <div className="bg-white border border-champagne/60 rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <Building2 className="w-8 h-8 text-primary" />
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Total Providers</span>
              <span className="text-3xl font-bold font-display text-espresso">{stats.providersCount}</span>
            </div>
          </div>

          <div className="bg-white border border-champagne/60 rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <CalendarDays className="w-8 h-8 text-purple-700" />
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Total Bookings</span>
              <span className="text-3xl font-bold font-display text-espresso">{stats.bookingsCount}</span>
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
                          {p.business_name}
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
                      <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border ${
                        p.status === 'approved'
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

                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          type="button"
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            currentPage === pageNum
                              ? 'bg-accent border-accent text-white shadow-xs'
                              : 'bg-white border-champagne text-stone-600 hover:border-gold'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

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
          </div>
        );
      })()}

      {/* Tab 3: Categories CRUD */}
      {activeTab === 'categories' && (() => {
        const itemsPerPage = 10;
        const indexOfLastItem = currentCategoryPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        const currentCategories = categories.slice(indexOfFirstItem, indexOfLastItem);
        const totalPages = Math.ceil(categories.length / itemsPerPage);

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <form onSubmit={handleAddCategory} className="bg-white border border-champagne/60 rounded-2xl p-6 shadow-sm flex flex-col gap-4 h-max">
              <h2 className="font-display font-bold text-espresso text-base flex items-center gap-1.5">
                <FolderEdit className="w-4.5 h-4.5 text-accent" /> Add Category
              </h2>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Category Name</label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Roof Repair"
                  className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Slug</label>
                <input
                  type="text"
                  required
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value)}
                  placeholder="e.g. roof-repair"
                  className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
                />
              </div>
              <button
                type="submit"
                disabled={submittingCategory}
                className="w-full bg-primary hover:bg-slate-800 text-white font-semibold text-xs py-3 rounded-xl transition-all shadow-sm"
              >
                {submittingCategory ? 'Adding...' : 'Add Category'}
              </button>
            </form>

            <div className="lg:col-span-2 bg-white border border-champagne/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[400px]">
              <div>
                <h2 className="font-display font-bold text-espresso text-base mb-4">Active Categories</h2>
                <div className="flex flex-col gap-3">
                  {currentCategories.map((c) => (
                    <div key={c.id} className="p-3 border border-champagne/50 bg-stone-50/50 rounded-xl flex items-center justify-between font-sans text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">{c.name}</span>
                        <span className="text-[10px] text-stone-500">Slug: {c.slug}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-champagne/30 flex-wrap gap-4">
                  <span className="text-xs text-stone-500 font-sans">
                    Page {currentCategoryPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentCategoryPage === 1}
                      onClick={() => setCurrentCategoryPage(1)}
                      className="px-2.5 py-1.5 rounded-lg border border-champagne text-[10px] font-bold text-slate-700 bg-white hover:border-gold disabled:opacity-40 disabled:hover:border-champagne transition-all"
                      title="First Page"
                    >
                      &lt;&lt;
                    </button>
                    <button
                      type="button"
                      disabled={currentCategoryPage === 1}
                      onClick={() => setCurrentCategoryPage(prev => Math.max(prev - 1, 1))}
                      className="px-3 py-1.5 rounded-lg border border-champagne text-[10px] font-bold text-slate-700 bg-white hover:border-gold disabled:opacity-40 disabled:hover:border-champagne transition-all"
                      title="Previous Page"
                    >
                      &lt;
                    </button>

                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          type="button"
                          key={pageNum}
                          onClick={() => setCurrentCategoryPage(pageNum)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            currentCategoryPage === pageNum
                              ? 'bg-accent border-accent text-white shadow-xs'
                              : 'bg-white border-champagne text-stone-600 hover:border-gold'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      disabled={currentCategoryPage === totalPages}
                      onClick={() => setCurrentCategoryPage(prev => Math.min(prev + 1, totalPages))}
                      className="px-3 py-1.5 rounded-lg border border-champagne text-[10px] font-bold text-slate-700 bg-white hover:border-gold disabled:opacity-40 disabled:hover:border-champagne transition-all"
                      title="Next Page"
                    >
                      &gt;
                    </button>
                    <button
                      type="button"
                      disabled={currentCategoryPage === totalPages}
                      onClick={() => setCurrentCategoryPage(totalPages)}
                      className="px-2.5 py-1.5 rounded-lg border border-champagne text-[10px] font-bold text-slate-700 bg-white hover:border-gold disabled:opacity-40 disabled:hover:border-champagne transition-all"
                      title="Last Page"
                    >
                      &gt;&gt;
                    </button>
                  </div>
                </div>
              )}
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
                          className={`w-3 h-3 ${
                            i < rev.rating ? 'text-amber-500 fill-amber-500' : 'text-stone-200'
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
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
