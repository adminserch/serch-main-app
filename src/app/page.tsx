'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import searchButtonLogo from '@/images/serch-button-logo.png';
import { useRouter } from 'next/navigation';
import {
  useUser
} from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import { Search, MapPin, Star, ShieldCheck, Sparkles, Home, ChevronRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

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
    <div className="flex flex-col min-h-screen">
      {/* Top Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-36 pb-32 px-6 overflow-hidden bg-gradient-to-b from-champagne/40 via-champagne/20 to-transparent">
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-1.5 bg-white border border-champagne px-3 py-1 rounded-full shadow-sm mb-6">
            <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
            <span className="text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Curated Local Marketplace</span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight text-espresso mb-6 leading-tight">
            Find Trusted Services Near You — <span className="text-purple-600">Fast</span>
          </h1>
          <p className="font-sans text-lg md:text-xl text-stone-600 max-w-2xl mx-auto mb-12 leading-relaxed">
            SERCH connects you with trusted local professionals and businesses anytime, anywhere.
          </p>
          <div className="font-display text-5xl md:text-7xl font-bold tracking-tight text-espresso mb-6 leading-tight">
            Find. <span className="text-purple-600">Book</span>. Trust.
          </div>
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="bg-white/95 backdrop-blur rounded-2xl md:rounded-full p-2.5 mx-auto max-w-4xl shadow-lg border border-champagne/60 flex flex-col md:flex-row items-center gap-2">
            <div className="flex-grow flex items-center bg-stone-50 rounded-xl md:rounded-full px-5 py-3 w-full border border-transparent focus-within:border-accent/40 transition-colors">
              <Search className="text-stone-400 w-5 h-5 mr-3 flex-shrink-0" />
              <input
                className="w-full bg-transparent border-none focus:outline-none text-espresso font-sans placeholder:text-stone-400 p-0 text-md"
                placeholder="What service do you need?"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <button type="submit" className="flex-shrink-0 transition-transform active:scale-95 hover:opacity-90 bg-primary hover:bg-slate-800 text-white font-semibold text-md px-6 py-3.5 rounded-xl md:rounded-full shadow-sm flex items-center gap-2">
              <Image
                src={searchButtonLogo}
                alt="Search Icon"
                height={24}
                className="h-6 w-6 object-cover rounded-full border-2 border-white"
                priority
              />
              <span>Search</span>
            </button>
          </form>

          {/* Popular Categories tag links */}
          <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs text-stone-600 font-sans">
            <span className="px-4 py-2 rounded-full bg-white border border-champagne hover:border-gold hover:bg-champagne/10 cursor-pointer transition-all shadow-sm" onClick={() => setQuery('Cleaning')}>Home Cleaning</span>
            <span className="px-4 py-2 rounded-full bg-white border border-champagne hover:border-gold hover:bg-champagne/10 cursor-pointer transition-all shadow-sm" onClick={() => setQuery('Aircon')}>Aircon Repair</span>
            <span className="px-4 py-2 rounded-full bg-white border border-champagne hover:border-gold hover:bg-champagne/10 cursor-pointer transition-all shadow-sm" onClick={() => setQuery('Roofing')}>Roof Repair</span>
            <span className="px-4 py-2 rounded-full bg-white border border-champagne hover:border-gold hover:bg-champagne/10 cursor-pointer transition-all shadow-sm" onClick={() => setQuery('Plumbing')}>Plumbing</span>
          </div>
        </div>
      </section>

      {/* Bento Grid: Featured Professionals */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-espresso mb-3">Providers</h2>
            <p className="font-sans text-stone-500 max-w-xl">
              Discover highly-rated experts, meticulously vetted for quality, reliability, and professional excellence.
            </p>
          </div>
          <Link href="/search" className="font-sans font-semibold text-accent hover:text-purple-700 flex items-center gap-1 group transition-colors text-sm">
            View All Providers <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {providersToShow.map((prov) => (
            <div key={prov.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-champagne/60 transition-all duration-300 flex flex-col group">
              <div className="h-52 bg-champagne/30 relative flex items-center justify-center overflow-hidden">
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-champagne/40 z-10">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Verified Provider</span>
                </div>

                {prov.logo_url ? (
                  <img src={prov.logo_url} alt={prov.business_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-champagne/50 to-gold/30 flex items-center justify-center text-stone-400 group-hover:scale-105 transition-transform duration-700">
                    <Home className="w-16 h-16 opacity-30" />
                  </div>
                )}
              </div>

              <div className="p-6 flex-grow flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-display text-lg font-bold text-espresso group-hover:text-accent transition-colors">
                      {prov.business_name}
                    </h3>
                    <div className="flex items-center gap-1 bg-stone-50 border border-champagne/50 px-2 py-0.5 rounded-lg flex-shrink-0">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-bold text-slate-700">{prov.avg_rating}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-stone-500 text-xs mb-4">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{prov.service_district}, {prov.service_city}</span>
                  </div>

                  <p className="text-stone-600 text-sm font-sans line-clamp-3 leading-relaxed">
                    {prov.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-champagne/40 flex items-center justify-between">
                  <span className="text-xs text-stone-400 font-sans">{prov.review_count} Reviews</span>
                  <Link href={`/providers/${prov.id}`} className="text-xs font-semibold text-primary hover:text-accent transition-colors flex items-center gap-0.5">
                    View Profile <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
