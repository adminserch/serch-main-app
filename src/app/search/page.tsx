'use strict';
'use client';

import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { useAuth, useUser } from '@clerk/nextjs';
import {
  
  Search as SearchIcon,
  ShieldCheck,
  Star,
  X,
  Home
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

interface Provider {
  id: string;
  business_name: string;
  description: string;
  logo_url: string | null;
  service_city: string;
  service_district: string;
  is_verified: boolean;
  latitude: number | null;
  longitude: number | null;
  avg_rating: number;
  review_count: number;
  price_level?: string; // '$', '$$', '$$$'
  categories?: string[];
}

const STATIC_PROVIDERS: Provider[] = [
  {
    id: 'static-1',
    business_name: 'Elena Rostova & Partners',
    description: 'Specializing in high-end residential interior designs and custom renovations with over 15 years of experience.',
    logo_url: null,
    service_city: 'Manila',
    service_district: 'Makati',
    is_verified: true,
    latitude: 14.5547,
    longitude: 121.0244,
    avg_rating: 4.98,
    review_count: 47,
    price_level: '$$$',
    categories: ['Home Cleaning', 'Carpentry']
  },
  {
    id: 'static-2',
    business_name: 'Marcus Chen Electrical Services',
    description: 'Premium smart home integrations, panel upgrades, and high-end lighting installations for luxury homes.',
    logo_url: null,
    service_city: 'Manila',
    service_district: 'BGC',
    is_verified: true,
    latitude: 14.5409,
    longitude: 121.0503,
    avg_rating: 5.0,
    review_count: 32,
    price_level: '$$',
    categories: ['Electrical']
  },
  {
    id: 'static-3',
    business_name: 'Sarah Jenkins Gardens',
    description: 'Landscape architecture and design creating sustainable, serene outdoor living spaces and geometric pathways.',
    logo_url: null,
    service_city: 'Manila',
    service_district: 'Quezon City',
    is_verified: true,
    latitude: 14.6760,
    longitude: 121.0437,
    avg_rating: 4.95,
    review_count: 19,
    price_level: '$$',
    categories: ['Gardening & Landscaping']
  },
  {
    id: 'static-4',
    business_name: 'Apex Aircon & Repair Solutions',
    description: 'Specialist maintenance, leak resolution, gas charging, and full air conditioner installations.',
    logo_url: null,
    service_city: 'Manila',
    service_district: 'Mandaluyong',
    is_verified: false,
    latitude: 14.5794,
    longitude: 121.0359,
    avg_rating: 4.67,
    review_count: 22,
    price_level: '$',
    categories: ['Aircon Repair']
  }
];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('query') || '';
  const initialLoc = searchParams.get('location') || '';

  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const [dbRole, setDbRole] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchLoc, setSearchLoc] = useState(initialLoc);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [compareList, setCompareList] = useState<Provider[]>([]);
  const [showCompareDrawer, setShowCompareDrawer] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
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
          console.error('Error fetching search user details:', err);
        }
      }
    }
    loadUserRole();
  }, [user]);

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, searchLoc, selectedCategory, priceFilter, minRating]);

  // Load providers from DB or fallback
  useEffect(() => {
    async function loadProviders() {
      try {
        const { data: dbProviders, error } = await supabase
          .from('providers')
          .select(`
            id,
            business_name,
            description,
            logo_url,
            service_city,
            service_district,
            is_verified,
            latitude,
            longitude,
            status,
            service_categories
          `)
          .eq('status', 'approved');

        if (!error && dbProviders && dbProviders.length > 0) {
          const formatted = await Promise.all(
            dbProviders.map(async (p: any) => {
              const { data: revData } = await supabase
                .from('reviews')
                .select('rating')
                .eq('provider_id', p.id);

              const count = revData?.length || 0;
              const avg = count > 0 
                ? Number((revData!.reduce((acc: number, curr: any) => acc + curr.rating, 0) / count).toFixed(2)) 
                : 5.0;

              return {
                id: p.id,
                business_name: p.business_name,
                description: p.description || '',
                logo_url: p.logo_url,
                service_city: p.service_city,
                service_district: p.service_district,
                is_verified: p.is_verified,
                latitude: p.latitude,
                longitude: p.longitude,
                avg_rating: avg,
                review_count: count,
                price_level: '$$', // default
                categories: p.service_categories || []
              };
            })
          );
          setProviders(formatted);
          
          // Center on first provider with coordinates
          const withCoords = formatted.find(f => f.latitude && f.longitude);
          if (withCoords) {
            setSelectedProviderId(withCoords.id);
          }
        } else {
          setProviders(STATIC_PROVIDERS);
        }
      } catch (err) {
        console.error(err);
        setProviders(STATIC_PROVIDERS);
      }
    }
    loadProviders();
  }, []);

  // Filter logic
  const filteredProviders = providers.filter((p) => {
    const matchesQuery = searchQuery 
      ? p.business_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesLoc = searchLoc
      ? p.service_city.toLowerCase().includes(searchLoc.toLowerCase()) ||
        p.service_district.toLowerCase().includes(searchLoc.toLowerCase())
      : true;

    const matchesCat = selectedCategory === 'all'
      ? true
      : p.categories?.some(cat => cat.toLowerCase().includes(selectedCategory.toLowerCase()));

    const matchesPrice = priceFilter === 'all'
      ? true
      : p.price_level === priceFilter;

    const matchesRating = p.avg_rating >= minRating;

    return matchesQuery && matchesLoc && matchesCat && matchesPrice && matchesRating;
  });

  const itemsPerPage = 10;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedProviders = filteredProviders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProviders.length / itemsPerPage);

  const toggleCompare = (p: Provider) => {
    if (compareList.some(item => item.id === p.id)) {
      setCompareList(prev => prev.filter(item => item.id !== p.id));
    } else {
      if (compareList.length >= 3) {
        alert('You can compare up to 3 professionals side-by-side.');
        return;
      }
      setCompareList(prev => [...prev, p]);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface transition-colors duration-300">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Content Body */}
      <div className="flex-grow pt-20">
        <main className="max-w-screen-2xl mx-auto px-4 md:px-8 py-6 md:py-10 flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-72 flex-shrink-0 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] overflow-y-auto pr-0 lg:pr-4 custom-scrollbar">
            <h3 className="font-headline text-lg md:text-xl mb-4 md:mb-6 text-on-surface">Refine Search</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 lg:gap-8">
              {/* Categories */}
              <section className="bg-card-bg p-4 rounded-2xl border border-champagne/60 dark:border-zinc-800 lg:border-none lg:p-0">
                <label className="font-label text-xs font-bold uppercase tracking-widest text-outline mb-3 block">Popular Categories</label>
                <div className="space-y-2">
                  {[
                    { id: 'all', label: 'All Services' },
                    { id: 'Home Cleaning', label: 'Home Services' },
                    { id: 'Maintenance', label: 'Maintenance' },
                    { id: 'Creative Services', label: 'Creative Services' },
                    { id: 'Lessons', label: 'Academic Lessons' }
                  ].map((cat) => (
                    <label key={cat.id} className="flex items-center group cursor-pointer">
                      <input
                        type="radio"
                        name="category-filter"
                        checked={selectedCategory === cat.id}
                        onChange={() => setSelectedCategory(cat.id)}
                        className="border-outline-variant text-primary focus:ring-primary mr-3"
                      />
                      <span className="font-body text-sm text-on-surface group-hover:text-primary transition-colors">{cat.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* Price Range & Rating */}
              <div className="space-y-6 lg:space-y-8">
                <section className="bg-card-bg p-4 rounded-2xl border border-champagne/60 dark:border-zinc-800 lg:border-none lg:p-0">
                  <label className="font-label text-xs font-bold uppercase tracking-widest text-outline mb-3 block">Price Filter</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'all', label: 'Any Price' },
                      { id: '$', label: '$ Budget' },
                      { id: '$$', label: '$$ Moderate' },
                      { id: '$$$', label: '$$$ Luxury' }
                    ].map((p) => (
                      <label key={p.id} className="flex items-center group cursor-pointer">
                        <input
                          type="radio"
                          name="price-filter"
                          checked={priceFilter === p.id}
                          onChange={() => setPriceFilter(p.id)}
                          className="border-outline-variant text-primary focus:ring-primary mr-2"
                        />
                        <span className="font-body text-xs text-on-surface group-hover:text-primary transition-colors">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="bg-card-bg p-4 rounded-2xl border border-champagne/60 dark:border-zinc-800 lg:border-none lg:p-0">
                  <label className="font-label text-xs font-bold uppercase tracking-widest text-outline mb-3 block">Minimum Rating</label>
                  <div className="flex gap-2">
                    {[0, 4.5, 4.8].map((ratingVal) => (
                      <button
                        key={ratingVal}
                        onClick={() => setMinRating(ratingVal)}
                        className={`flex-grow px-3 py-2 rounded-lg border text-xs font-semibold font-label transition-all ${
                          minRating === ratingVal
                            ? 'bg-primary text-white border-primary'
                            : 'bg-card-bg border-stone-200 dark:border-zinc-800 text-on-surface hover:bg-stone-50'
                        }`}
                      >
                        {ratingVal === 0 ? (
                          'Any'
                        ) : (
                          <span className="flex items-center gap-1 justify-center">
                            {ratingVal}
                            <Star className="w-3 h-3 fill-current inline-block" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-grow flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-champagne/60 dark:border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-1">Search Results</span>
                <h2 className="font-headline text-2xl font-bold text-on-surface">
                  {filteredProviders.length} Available Providers
                </h2>
              </div>

              {/* Text Search inside Area */}
              <div className="bg-stone-50 dark:bg-zinc-900 border border-champagne/65 dark:border-zinc-800 rounded-full px-4 py-2.5 flex items-center gap-2 text-sm w-full md:w-[350px]">
                <SearchIcon className="w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Filter by keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none focus:outline-none w-full text-on-surface placeholder:text-stone-400"
                />
              </div>
            </div>

            <div className="flex flex-col gap-8">
              {/* Grid of Cards */}
              <div className="flex-grow grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {paginatedProviders.map((p) => {
                  const isCompared = compareList.some(item => item.id === p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProviderId(p.id);
                      }}
                      className={`group bg-card-bg rounded-2xl overflow-hidden border ghost-border card-hover transition-all duration-500 flex flex-col justify-between cursor-pointer ${
                        selectedProviderId === p.id
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-champagne/60 dark:border-zinc-800'
                      }`}
                    >
                      <div>
                        <div className="h-48 relative overflow-hidden bg-slate-100 dark:bg-zinc-900 flex items-center justify-center">
                          {p.logo_url ? (
                            <Image
                              src={p.logo_url}
                              alt={p.business_name}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              className="object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center text-slate-400 transition-transform duration-700 group-hover:scale-110">
                              <Home className="w-16 h-16 opacity-20 text-[#3366cc]" />
                            </div>
                          )}
                          {p.is_verified && (
                            <div className="absolute top-4 right-4 bg-white/90 dark:bg-zinc-800/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter text-primary shadow-sm z-10">
                              Verified Premium
                            </div>
                          )}
                        </div>

                        <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-headline text-xl font-bold mb-1 text-on-surface">{p.business_name}</h3>
                              <div className="flex items-center text-tertiary">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500 mr-1" />
                                <span className="text-sm font-label font-bold text-on-surface">{p.avg_rating}</span>
                                <span className="text-xs font-label text-outline ml-1">({p.review_count} reviews)</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="block text-xs font-label text-outline uppercase tracking-wider">Starts from</span>
                              <span className="text-xl font-bold font-display text-on-surface">$45<span className="text-sm font-normal text-on-surface-variant">/hr</span></span>
                            </div>
                          </div>
                          <p className="text-sm text-on-surface-variant font-body mb-6 line-clamp-2">{p.description || 'Professional and verified service provider.'}</p>
                        </div>
                      </div>

                      <div className="p-6 pt-0 flex gap-3">
                        {filteredProviders.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCompare(p);
                            }}
                            className={`flex-grow font-label text-sm font-semibold py-3 rounded-xl transition-all border ${
                              isCompared
                                ? 'bg-primary/10 border-primary text-primary'
                                : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface border-transparent'
                            }`}
                          >
                            {isCompared ? 'Compared' : 'Compare'}
                          </button>
                        )}
                        <Link
                          href={`/providers/${p.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-grow bg-gradient-to-r from-primary to-[#3366cc] text-white font-label text-sm font-semibold py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-primary/20 text-center"
                        >
                          View Profile
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-16 flex justify-center">
                <nav className="flex items-center gap-2 font-label text-sm">
                  {/* First Page button << */}
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    className="w-10 h-10 rounded-full flex items-center justify-center border border-stone-200 dark:border-zinc-800 text-on-surface-variant hover:bg-surface-container transition-all disabled:opacity-30 cursor-pointer"
                  >
                    &lt;&lt;
                  </button>
                  {/* Prev button < */}
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="w-10 h-10 rounded-full flex items-center justify-center border border-stone-200 dark:border-zinc-800 text-on-surface-variant hover:bg-surface-container transition-all disabled:opacity-30 cursor-pointer"
                  >
                    &lt;
                  </button>

                  {/* Render page numbers */}
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    
                    const isFirst = pageNum === 1;
                    const isLast = pageNum === totalPages;
                    const isWithinRange = Math.abs(pageNum - currentPage) <= 1;

                    if (isFirst || isLast || isWithinRange) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-full font-bold transition-all cursor-pointer ${
                            currentPage === pageNum
                              ? 'bg-primary text-white'
                              : 'hover:bg-surface-container text-on-surface-variant'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }

                    if (pageNum === 2 && currentPage > 3) {
                      return (
                        <span key="leading-ellipsis" className="px-2 text-outline">
                          ...
                        </span>
                      );
                    }

                    if (pageNum === totalPages - 1 && currentPage < totalPages - 2) {
                      return (
                        <span key="trailing-ellipsis" className="px-2 text-outline">
                          ...
                        </span>
                      );
                    }

                    return null;
                  })}

                  {/* Next button > */}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="w-10 h-10 rounded-full flex items-center justify-center border border-stone-200 dark:border-zinc-800 text-on-surface-variant hover:bg-surface-container transition-all disabled:opacity-30 cursor-pointer"
                  >
                    &gt;
                  </button>
                  {/* Last Page button >> */}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-10 h-10 rounded-full flex items-center justify-center border border-stone-200 dark:border-zinc-800 text-on-surface-variant hover:bg-surface-container transition-all disabled:opacity-30 cursor-pointer"
                  >
                    &gt;&gt;
                  </button>
                </nav>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <Footer />

      {/* Slide-Up Comparison Drawer */}
      {showCompareDrawer && (
        <div className="fixed inset-0 bg-slate-900/40 z-55 backdrop-blur-xs flex items-end justify-center">
          <div className="bg-card-bg rounded-t-3xl shadow-2xl max-w-5xl w-full p-6 border-t border-champagne dark:border-zinc-800 max-h-[85vh] overflow-y-auto transform translate-y-0 transition-transform duration-300">
            <div className="flex justify-between items-center border-b border-champagne/80 dark:border-zinc-800 pb-4 mb-6 transition-colors duration-300">
              <h2 className="text-lg font-bold font-display text-espresso">Side-by-Side Comparison</h2>
              <button
                onClick={() => setShowCompareDrawer(false)}
                className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 border-b border-champagne/40 dark:border-zinc-800 pb-6 transition-colors duration-300">
              {compareList.map((p) => (
                <div key={p.id} className="border border-champagne/80 dark:border-zinc-800 rounded-2xl p-4 bg-stone-50 dark:bg-zinc-900/60 flex flex-col justify-between transition-colors duration-300">
                  <div>
                    <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full w-max mb-3 transition-colors duration-300">
                      <ShieldCheck className="w-3.5 h-3.5" /> VERIFIED
                    </div>
                    <h3 className="font-display font-bold text-espresso text-base mb-1 transition-colors duration-300">{p.business_name}</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-350 font-bold mb-3 transition-colors duration-300">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>{p.avg_rating} ({p.review_count} reviews)</span>
                    </div>

                    <p className="text-[11px] text-stone-600 dark:text-stone-300 font-sans leading-relaxed mb-4 line-clamp-4 transition-colors duration-300">
                      {p.description}
                    </p>
                  </div>

                  <Link
                    href={`/providers/${p.id}`}
                    className={`text-xs font-bold py-2 px-3 rounded-lg text-center transition-all mt-4 ${
                      isDark
                        ? 'bg-white hover:bg-slate-200 text-slate-950'
                        : 'bg-primary hover:bg-slate-800 text-white'
                    }`}
                  >
                    Book This Pro
                  </Link>
                </div>
              ))}
              {Array.from({ length: 3 - compareList.length }).map((_, i) => (
                <div key={i} className="border border-dashed border-stone-300 dark:border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center text-xs text-stone-400 dark:text-stone-500 bg-card-bg transition-colors duration-300">
                  Add another expert to compare
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex-grow flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
