'use client';

import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, Star, ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

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
  price_level?: string;
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

function CompareContent() {
  const searchParams = useSearchParams();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProviders() {
      setLoading(true);
      const idsParam = searchParams.get('ids');
      if (!idsParam) {
        setProviders([]);
        setLoading(false);
        return;
      }

      const ids = idsParam.split(',').filter(Boolean);
      if (ids.length === 0) {
        setProviders([]);
        setLoading(false);
        return;
      }

      try {
        // Separate database IDs from static IDs
        const staticIds = ids.filter(id => id.startsWith('static-'));
        const dbIds = ids.filter(id => !id.startsWith('static-'));

        let dbResults: Provider[] = [];

        if (dbIds.length > 0) {
          const { data, error } = await supabase
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
            .in('id', dbIds);

          if (!error && data) {
            interface DbProvider {
              id: string;
              business_name: string;
              description: string | null;
              logo_url: string | null;
              service_city: string;
              service_district: string | null;
              is_verified: boolean;
              latitude: number | null;
              longitude: number | null;
              status: string;
              service_categories: string[] | null;
            }

            interface ReviewRow {
              rating: number;
            }

            dbResults = await Promise.all(
              (data as DbProvider[]).map(async (p) => {
                const { data: revData } = await supabase
                  .from('reviews')
                  .select('rating')
                  .eq('provider_id', p.id);

                const count = revData?.length || 0;
                const avg = count > 0 
                  ? Number(((revData as ReviewRow[]).reduce((acc: number, curr: ReviewRow) => acc + curr.rating, 0) / count).toFixed(2)) 
                  : 5.0;

                return {
                  id: p.id,
                  business_name: p.business_name,
                  description: p.description || '',
                  logo_url: p.logo_url,
                  service_city: p.service_city,
                  service_district: p.service_district || '',
                  is_verified: p.is_verified,
                  latitude: p.latitude,
                  longitude: p.longitude,
                  avg_rating: avg,
                  review_count: count,
                  price_level: '$$',
                  categories: p.service_categories || []
                };
              })
            );
          }
        }

        const staticResults = STATIC_PROVIDERS.filter(p => staticIds.includes(p.id));
        
        // Re-order to match the order of IDs in the URL parameter
        const allLoaded = [...dbResults, ...staticResults];
        const ordered = ids
          .map(id => allLoaded.find(p => p.id === id))
          .filter((p): p is Provider => !!p);

        setProviders(ordered);
      } catch {
        // Fallback
        const staticResults = STATIC_PROVIDERS.filter(p => ids.includes(p.id));
        setProviders(staticResults);
      } finally {
        setLoading(false);
      }
    }

    loadProviders();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading comparison details...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface transition-colors duration-300">
      <Navbar />

      <main className="flex-grow pt-24 max-w-7xl mx-auto w-full px-4 md:px-8 pb-16">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Search
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-10 text-center md:text-left">
          <span className="text-xs font-bold text-purple-600 uppercase tracking-widest block mb-2">Compare Experts</span>
          <h1 className="font-headline text-3xl md:text-4xl font-extrabold text-on-surface">
            Side-by-Side Comparison
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
            Compare services, pricing, ratings, and locations to choose the perfect expert for your project.
          </p>
        </div>

        {providers.length === 0 ? (
          <div className="bg-card-bg border border-stone-200 dark:border-zinc-800 rounded-3xl p-12 text-center max-w-xl mx-auto">
            <Home className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto mb-4" />
            <h3 className="font-headline text-xl font-bold mb-2">No Providers Selected</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Go back to the search page and select up to 4 providers to compare them here.
            </p>
            <Link
              href="/search"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-full shadow-lg shadow-purple-600/10 transition-all"
            >
              Browse Providers
            </Link>
          </div>
        ) : (
          <div className="flex overflow-x-auto snap-x snap-mandatory pb-6 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 scrollbar-none scroll-smooth">
            {providers.map((p) => (
              <div
                key={p.id}
                className="snap-center flex-shrink-0 w-[290px] min-w-[290px] md:w-auto md:min-w-0 bg-card-bg border border-champagne/80 dark:border-zinc-850 rounded-3xl overflow-hidden shadow-xl flex flex-col h-full hover:shadow-2xl transition-all duration-300"
              >
                {/* Image & Verified Header */}
                <div className="h-44 relative bg-slate-100 dark:bg-zinc-900 flex items-center justify-center">
                  {p.logo_url ? (
                    <Image
                      src={p.logo_url}
                      alt={p.business_name}
                      fill
                      sizes="(max-width: 768px) 100vw, 25vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center text-slate-400">
                      <Home className="w-12 h-12 opacity-30 text-[#3366cc]" />
                    </div>
                  )}
                  {p.is_verified && (
                    <div className="absolute top-4 right-4 bg-white/95 dark:bg-zinc-800/95 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-purple-600 shadow-md flex items-center gap-1 z-10">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified
                    </div>
                  )}
                </div>

                {/* Details Body */}
                <div className="p-6 flex-grow flex flex-col">
                  {/* Name and Rating */}
                  <div className="mb-4">
                    <h3 className="font-headline text-xl font-bold text-on-surface line-clamp-1 mb-1" title={p.business_name}>
                      {p.business_name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-350">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="font-bold text-on-surface">{p.avg_rating}</span>
                      <span className="text-xs text-slate-400">({p.review_count} reviews)</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-100 dark:border-zinc-800 my-4"></div>

                  {/* Location & Pricing */}
                  <div className="space-y-3 mb-6">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Service Area</span>
                      <span className="text-sm font-semibold text-on-surface">
                        {p.service_district ? `${p.service_district}, ` : ''}{p.service_city}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Pricing Level</span>
                      <span className="text-sm font-semibold text-on-surface">
                        {p.price_level === '$' ? '$ (Budget-friendly)' : 
                         p.price_level === '$$$' ? '$$$ (Premium / Luxury)' : 
                         '$$ (Moderate / Standard)'}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Specialties</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {p.categories && p.categories.length > 0 ? (
                          p.categories.map((cat, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-bold bg-stone-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-350 px-2 py-0.5 rounded-full"
                            >
                              {cat}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">General Services</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-100 dark:border-zinc-800 my-4"></div>

                  {/* Description */}
                  <div className="flex-grow">
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">About</span>
                    <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-body">
                      {p.description || 'Professional and highly rated partner providing premium services in your area.'}
                    </p>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="p-6 pt-0 border-t border-slate-100 dark:border-zinc-800/50 bg-stone-50/50 dark:bg-zinc-900/10 flex flex-col gap-2.5">
                  <Link
                    href={`/providers/${p.id}`}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-3 rounded-2xl transition-all shadow-md shadow-purple-600/10 text-center block"
                  >
                    View Full Profile & Book
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="flex-grow flex items-center justify-center p-8 min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}
