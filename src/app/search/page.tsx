'use strict';
'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserButton, useAuth, useUser, SignInButton, SignUpButton } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  Search as SearchIcon, 
  MapPin, 
  Star, 
  ShieldCheck, 
  SlidersHorizontal,
  ChevronRight,
  Plus,
  Check,
  X,
  Compass
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import Map component to prevent SSR issues
const Map = dynamic(() => import('@/components/Map'), { ssr: false });

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
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 14.5995, lng: 120.9842 });
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);

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
            setMapCenter({ lat: withCoords.latitude!, lng: withCoords.longitude! });
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
    <div className="flex flex-col min-h-screen bg-stone-50/50">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Content Body */}
      <div className="flex-grow pt-20 flex flex-col">
        {/* Top Bar / Search Controls */}
        <div className="bg-white border-b border-champagne/60 px-6 py-4 sticky top-20 z-40">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Query */}
              <div className="bg-stone-50 border border-champagne/60 rounded-xl px-3 py-2 flex items-center gap-2 text-sm w-full sm:w-[450px]">
                <SearchIcon className="w-4 h-4 text-stone-400" />
                <input 
                  type="text" 
                  placeholder="What service are you looking for?" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none focus:outline-none w-full text-espresso"
                />
              </div>
            </div>

            {/* Sliders / Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white border border-champagne rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="Home Cleaning">Home Cleaning</option>
                <option value="Aircon Repair">Aircon Repair</option>
                <option value="Roof Repair">Roof Repair</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Gardening & Landscaping">Gardening</option>
              </select>

              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="bg-white border border-champagne rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">Any Price</option>
                <option value="$">$ (Budget)</option>
                <option value="$$">$$ (Moderate)</option>
                <option value="$$$">$$$ (Luxury)</option>
              </select>

              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="bg-white border border-champagne rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value={0}>Any Rating</option>
                <option value={4.5}>4.5+ Stars</option>
                <option value={4.8}>4.8+ Stars</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Body: Split Map / List */}
        <div className="flex-grow flex flex-col lg:flex-row relative">
          {/* Left Side: Results List */}
          <div className="w-full lg:w-1/2 p-6 md:p-10 overflow-y-auto max-h-[calc(100vh-220px)] lg:max-h-[calc(100vh-160px)] flex flex-col gap-6">
            <div>
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider block mb-1">Search Results</span>
              <h2 className="font-display text-2xl font-bold text-espresso">
                {filteredProviders.length} Available Providers
              </h2>
            </div>

            <div className="flex flex-col gap-5">
              {paginatedProviders.map((p) => {
                const isCompared = compareList.some(item => item.id === p.id);
                return (
                  <div 
                    key={p.id} 
                    onClick={() => {
                      if (p.latitude && p.longitude) {
                        setMapCenter({ lat: p.latitude, lng: p.longitude });
                        setSelectedProviderId(p.id);
                      }
                    }}
                    className={`bg-white border p-6 shadow-xs hover:shadow-md hover:border-gold/60 transition-all flex flex-col justify-between gap-4 cursor-pointer rounded-2xl ${
                      selectedProviderId === p.id 
                        ? 'border-accent ring-2 ring-accent/20 bg-teal-50/5' 
                        : 'border-champagne/60'
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Left: Company Logo */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-50 border border-champagne/40 flex-shrink-0 flex items-center justify-center relative">
                        {p.logo_url ? (
                          <img
                             src={p.logo_url}
                             alt={p.business_name}
                             className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-champagne/20 border border-champagne/40 rounded-xl flex items-center justify-center text-accent text-lg font-bold">
                            {p.business_name.charAt(0)}
                          </div>
                        )}
                      </div>

                      {/* Right: Provider Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-4 mb-1 flex-wrap">
                          <h3 className="font-sans font-bold text-espresso text-base hover:text-accent transition-colors truncate">
                            <Link href={`/providers/${p.id}`} onClick={(e) => e.stopPropagation()}>{p.business_name}</Link>
                          </h3>
                          
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {p.is_verified && (
                              <span className="bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" /> Verified Provider
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-stone-500 mb-3 font-sans">
                          <div className="flex items-center gap-0.5">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span className="font-bold text-slate-800">{p.avg_rating}</span>
                            <span>({p.review_count} reviews)</span>
                          </div>
                          <span>•</span>
                          <div className="flex items-center gap-0.5">
                            <MapPin className="w-4 h-4" />
                            <span>{p.service_district}, {p.service_city}</span>
                          </div>
                        </div>

                        <p className="text-stone-600 text-xs font-sans leading-relaxed line-clamp-2">
                          {p.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-champagne/30 pt-4 mt-1">
                      {/* Compare Switch */}
                      {filteredProviders.length > 1 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCompare(p);
                          }}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                            isCompared
                              ? 'bg-accent/10 border-accent text-accent'
                              : 'bg-white border-champagne hover:border-gold text-slate-700'
                          }`}
                        >
                          {isCompared ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          Compare
                        </button>
                      ) : (
                        <div />
                      )}

                      <Link 
                        href={`/providers/${p.id}`} 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-primary hover:bg-slate-800 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all shadow-xs"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                );
              })}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-champagne/30 flex-wrap gap-4">
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
          </div>

          {/* Right Side: Map */}
          <div className="w-full lg:w-1/2 h-[400px] lg:h-[calc(100vh-160px)] sticky top-[160px] border-l border-champagne bg-slate-100">
            <Map 
              latitude={mapCenter.lat} 
              longitude={mapCenter.lng} 
              markers={filteredProviders.map(p => ({
                id: p.id,
                business_name: p.business_name,
                latitude: p.latitude,
                longitude: p.longitude
              }))}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Slide-Up Comparison Drawer */}
      {showCompareDrawer && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 backdrop-blur-xs flex items-end justify-center">
          <div className="bg-white rounded-t-3xl shadow-2xl max-w-5xl w-full p-6 border-t border-champagne max-h-[85vh] overflow-y-auto transform translate-y-0 transition-transform duration-300">
            <div className="flex justify-between items-center border-b border-champagne/80 pb-4 mb-6">
              <h2 className="text-lg font-bold font-display text-espresso">Side-by-Side Comparison</h2>
              <button 
                onClick={() => setShowCompareDrawer(false)}
                className="p-1 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 border-b border-champagne/40 pb-6">
              {compareList.map((p) => (
                <div key={p.id} className="border border-champagne/80 rounded-2xl p-4 bg-stone-50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full w-max mb-3">
                      <ShieldCheck className="w-3.5 h-3.5" /> VERIFIED
                    </div>
                    <h3 className="font-display font-bold text-espresso text-base mb-1">{p.business_name}</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-700 font-bold mb-3">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>{p.avg_rating} ({p.review_count} reviews)</span>
                    </div>
                    
                    <p className="text-[11px] text-stone-600 font-sans leading-relaxed mb-4 line-clamp-4">
                      {p.description}
                    </p>
                  </div>

                  <Link href={`/providers/${p.id}`} className="bg-primary hover:bg-slate-800 text-white text-xs font-bold py-2 px-3 rounded-lg text-center transition-all mt-4">
                    Book This Pro
                  </Link>
                </div>
              ))}
              {Array.from({ length: 3 - compareList.length }).map((_, i) => (
                <div key={i} className="border border-dashed border-stone-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center text-xs text-stone-400 bg-white">
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
