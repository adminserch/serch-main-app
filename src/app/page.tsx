'use client';

import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import {
  useUser
} from '@clerk/nextjs';
import { ChevronDown, ChevronRight, Home, MapPin, Search, Star, Heart } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface FeaturedProvider {
  id: string;
  business_name: string;
  description: string;
  logo_url: string | null;
  service_city: string;
  service_district: string;
  is_verified: boolean;
  avg_rating: number;
  review_count: number;
}

const STATIC_PROVIDERS: FeaturedProvider[] = [
  {
    id: 'static-1',
    business_name: 'Elena Rostova & Partners',
    description: 'Specializing in high-end residential interior designs and custom renovations with over 15 years of experience.',
    logo_url: null,
    service_city: 'Manila',
    service_district: 'Makati',
    is_verified: true,
    avg_rating: 4.98,
    review_count: 47,
  },
  {
    id: 'static-2',
    business_name: 'Marcus Chen Electrical Services',
    description: 'Premium smart home integrations, panel upgrades, and high-end lighting installations for luxury homes.',
    logo_url: null,
    service_city: 'Manila',
    service_district: 'BGC',
    is_verified: true,
    avg_rating: 5.0,
    review_count: 32,
  },
  {
    id: 'static-3',
    business_name: 'Sarah Jenkins Gardens',
    description: 'Landscape architecture and design creating sustainable, serene outdoor living spaces and geometric pathways.',
    logo_url: null,
    service_city: 'Manila',
    service_district: 'Quezon City',
    is_verified: true,
    avg_rating: 4.95,
    review_count: 19,
  }
];

export default function LandingPage() {
  const router = useRouter();
  const { user } = useUser();

  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [liveProviders, setLiveProviders] = useState<FeaturedProvider[]>([]);
  const [dbRole, setDbRole] = useState<string | null>(null);
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

  // Fetch approved providers and current user role
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch providers
        const { data: providersData, error: pError } = await supabase
          .from('providers')
          .select(`
            id,
            business_name,
            description,
            logo_url,
            service_city,
            service_district,
            is_verified
          `)
          .eq('status', 'approved')
          .limit(3);

        if (!pError && providersData && providersData.length > 0) {
          // Fetch average ratings for these providers
          const providersWithRatings = await Promise.all(
            providersData.map(async (prov: any) => {
              const { data: revData } = await supabase
                .from('reviews')
                .select('rating')
                .eq('provider_id', prov.id);

              const count = revData?.length || 0;
              const avg = count > 0
                ? Number((revData!.reduce((acc: number, curr: any) => acc + curr.rating, 0) / count).toFixed(2))
                : 5.0;

              return {
                ...prov,
                avg_rating: avg,
                review_count: count,
              };
            })
          );
          setLiveProviders(providersWithRatings);
        }

        // Fetch user role if authenticated
        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('clerk_user_id', user.id)
            .single();
          if (userData) {
            setDbRole(userData.role);
          }
        }
      } catch (err) {
        console.error('Error fetching landing details:', err);
      }
    }
    loadData();
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?query=${encodeURIComponent(query)}`);
  };

  const providersToShow = liveProviders.length > 0 ? liveProviders : STATIC_PROVIDERS;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Top Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-12 md:pt-32 md:pb-12 overflow-hidden bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <h1 className="font-serif text-5xl md:text-7xl font-bold leading-tight mb-8 text-[#1b1c1d] dark:text-slate-100">
            What <span className="italic font-semibold text-purple-600">service</span><br />do you need?
          </h1>
          {/* Search Container */}
          <form onSubmit={handleSearch} className="bg-white rounded-2xl md:rounded-full p-2 flex flex-col md:flex-row items-stretch md:items-center gap-2 shadow-2xl">
            <div className="flex-grow flex items-center px-4 py-3 gap-3">
              <Search className="h-6 w-6 text-slate-400" />
              <input
                className="w-full border-none focus:ring-0 text-slate-800 text-lg placeholder:text-slate-400 focus:outline-none bg-transparent"
                placeholder="Search services (e.g. house cleaning, plumbing)"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="hidden md:block h-10 w-px bg-slate-200"></div>
            <div className="flex items-center px-4 py-3 gap-2 group cursor-pointer">
              <MapPin className="h-5 w-5 text-[#3366cc]" />
              <span className="text-slate-700 font-medium whitespace-nowrap">Calgary, AB</span>
              <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-[#3366cc] transition-colors" />
            </div>
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 md:py-4 rounded-xl md:rounded-full font-bold transition-all transform active:scale-95 cursor-pointer text-center"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Popular Categories Section */}
      <section className="py-8 bg-background transition-colors duration-300" data-purpose="popular-categories">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="text-[#3366cc] font-semibold tracking-widest uppercase text-xs block">Explore</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2 text-foreground font-serif">Popular Categories</h2>
            </div>
            <Link href="/search" className="text-[#3366cc] font-semibold hover:underline hover:text-purple-600 transition-colors flex items-center gap-1 group text-sm">
              View all
              <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Category Item 1 */}
            <div onClick={() => { setQuery('Cleaning'); router.push('/search?query=Cleaning'); }} className="transition-all duration-300 border border-champagne rounded-2xl p-8 flex flex-col items-center text-center group cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-champagne/10 bg-card-bg">
              <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors">
                <svg className="h-10 w-10 text-[#3366cc] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                </svg>
              </div>
              <span className="font-bold text-foreground">Home Services</span>
            </div>
            {/* Category Item 2 */}
            <div onClick={() => { setQuery('Maintenance'); router.push('/search?query=Maintenance'); }} className="transition-all duration-300 border border-champagne rounded-2xl p-8 flex flex-col items-center text-center group cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-champagne/10 bg-card-bg">
              <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors">
                <svg className="h-10 w-10 text-[#3366cc] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                </svg>
              </div>
              <span className="font-bold text-foreground">Maintenance</span>
            </div>
            {/* Category Item 3 */}
            <div onClick={() => { setQuery('Lessons'); router.push('/search?query=Lessons'); }} className="transition-all duration-300 border border-champagne rounded-2xl p-8 flex flex-col items-center text-center group cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-champagne/10 bg-card-bg">
              <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors">
                <svg className="h-10 w-10 text-[#3366cc] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                </svg>
              </div>
              <span className="font-bold text-foreground">Lessons &amp; Tutoring</span>
            </div>
            {/* Category Item 4 */}
            <div onClick={() => { setQuery('Automotive'); router.push('/search?query=Automotive'); }} className="transition-all duration-300 border border-champagne rounded-2xl p-8 flex flex-col items-center text-center group cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-champagne/10 bg-card-bg">
              <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors">
                <svg className="h-10 w-10 text-[#3366cc] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                </svg>
              </div>
              <span className="font-bold text-foreground">Automotive</span>
            </div>
            {/* Category Item 5 */}
            <div onClick={() => { setQuery('Health'); router.push('/search?query=Health'); }} className="transition-all duration-300 border border-champagne rounded-2xl p-8 flex flex-col items-center text-center group cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-champagne/10 bg-card-bg">
              <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors">
                <svg className="h-10 w-10 text-[#3366cc] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                </svg>
              </div>
              <span className="font-bold text-foreground">Health &amp; Wellness</span>
            </div>
            {/* Category Item 6 */}
            <div onClick={() => { setQuery('Beauty'); router.push('/search?query=Beauty'); }} className="transition-all duration-300 border border-champagne rounded-2xl p-8 flex flex-col items-center text-center group cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-champagne/10 bg-card-bg">
              <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors">
                <svg className="h-10 w-10 text-[#3366cc] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.423 15.621a2 2 0 00.49.921l1.241 1.241a2 2 0 010 2.828l-1.241 1.241a2 2 0 01-2.828 0l-1.241-1.241a2 2 0 00-.921-.49 2 2 0 01-1.503-1.503 2 2 0 00-.49-.921l-1.241-1.241a2 2 0 010-2.828l1.241-1.241a2 2 0 012.828 0l1.241 1.241a2 2 0 00.921.49 2 2 0 011.503 1.503z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                </svg>
              </div>
              <span className="font-bold text-foreground">Beauty &amp; Personal</span>
            </div>
            {/* Category Item 7 */}
            <div onClick={() => { setQuery('Repairs'); router.push('/search?query=Repairs'); }} className="transition-all duration-300 border border-champagne rounded-2xl p-8 flex flex-col items-center text-center group cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-champagne/10 bg-card-bg">
              <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors">
                <svg className="h-10 w-10 text-[#3366cc] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                </svg>
              </div>
              <span className="font-bold text-foreground">Repairs &amp; Services</span>
            </div>
            {/* Category Item 8 */}
            <div onClick={() => router.push('/search')} className="transition-all duration-300 border border-champagne rounded-2xl p-8 flex flex-col items-center text-center group bg-[#f4f7ff] dark:bg-zinc-900 cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-champagne/10">
              <div className="w-20 h-20 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors">
                <svg className="h-10 w-10 text-[#3366cc] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 6h16M4 12h16m-7 6h7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                </svg>
              </div>
              <span className="font-bold text-foreground">More Categories</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Providers Section */}
      <section className="py-8 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300" data-purpose="featured-providers">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="text-[#3366cc] font-semibold tracking-widest uppercase text-xs block">Recommended</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2 text-foreground font-serif">Featured Providers</h2>
            </div>
            <Link href="/search" className="text-[#3366cc] font-semibold hover:underline hover:text-purple-600 transition-colors text-sm">
              View all
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {providersToShow.map((prov, index) => {
              // Custom tags matching reference mockup
              const tagLabel = index === 0 ? 'Top Rated' : index === 1 ? 'Verified' : 'New';
              const tagStyle = index === 0
                ? 'bg-blue-50 dark:bg-blue-950/40 text-[#3366cc] dark:text-blue-300'
                : index === 1
                  ? 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-[#3366cc] dark:text-blue-300';

              return (
                <div key={prov.id} className="bg-card-bg rounded-3xl overflow-hidden border border-champagne group flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="aspect-[16/10] overflow-hidden relative bg-slate-100 dark:bg-zinc-900 flex items-center justify-center">
                      {prov.logo_url ? (
                        <Image src={prov.logo_url} alt={prov.business_name} width={400} height={250} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center text-slate-400 group-hover:scale-105 transition-transform duration-500">
                          <Home className="w-16 h-16 opacity-20 text-[#3366cc]" />
                        </div>
                      )}
                      <button className="absolute top-4 right-4 w-10 h-10 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-red-500 transition-colors shadow-sm cursor-pointer z-10">
                        <Heart className="h-6 w-6" />
                      </button>
                    </div>

                    <div className="p-8 pb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`${tagStyle} text-[10px] uppercase font-bold px-2 py-1 rounded`}>
                          {tagLabel}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-[#3366cc] transition-colors font-serif">
                        {prov.business_name}
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                        {prov.description ? (prov.description.length > 80 ? prov.description.slice(0, 80) + '...' : prov.description) : 'Local Professional'}
                      </p>
                    </div>
                  </div>

                  <div className="p-8 pt-0">
                    <div className="flex items-center justify-between border-t border-champagne pt-6 mb-6">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-5 w-5 text-amber-500 fill-amber-400 stroke-amber-400" />
                        <span className="font-bold text-foreground">{prov.avg_rating || '4.8'}</span>
                        <span className="text-slate-400 text-sm">({prov.review_count ?? '128'} reviews)</span>
                      </div>
                      <span className="text-foreground font-bold">From $45/hr</span>
                    </div>
                    <Link
                      href={`/providers/${prov.id}`}
                      className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-label text-sm font-semibold py-3.5 rounded-2xl transition-all hover:shadow-lg hover:shadow-purple-600/20 text-center"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
