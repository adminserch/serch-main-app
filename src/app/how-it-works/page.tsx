'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { SignUpButton, useAuth } from '@clerk/nextjs';

export default function HowItWorks() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [query, setQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?query=${encodeURIComponent(query.trim())}`);
    } else {
      router.push('/search');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface transition-colors duration-300 pb-20 md:pb-0">
      {/* Top Navbar */}
      <Navbar />

      <main className="pt-20 flex-grow">
        {/* Hero Section */}
        <section className="bg-surface-container-low py-20 px-8 text-center border-b border-outline-variant/30">
          <div className="max-w-4xl mx-auto space-y-4">
            <span className="font-label text-primary uppercase tracking-[0.3em] text-xs font-bold block">The Serch Protocol</span>
            <h1 className="font-headline text-5xl md:text-6xl text-on-surface leading-tight font-serif">Curating Excellence</h1>
            <p className="font-body text-lg text-on-surface-variant max-w-2xl mx-auto opacity-80">
              Whether you&apos;re seeking top-tier talent or providing elite services, our structured workflow ensures archival-grade quality at every touchpoint.
            </p>
            
            {/* Search Input block */}
            <form onSubmit={handleSearchSubmit} className="flex items-center bg-card-bg border border-champagne rounded-full p-1 w-full max-w-md mx-auto shadow-md mt-6">
              <input
                className="bg-transparent border-none focus:ring-0 text-sm font-label px-4 w-full text-on-surface focus:outline-none"
                placeholder="Search professionals..."
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit" className="bg-[#3366cc] hover:bg-primary text-white px-6 py-2.5 rounded-full font-label font-semibold text-sm transition-all cursor-pointer">
                Search
              </button>
            </form>
          </div>
        </section>

        {/* Interactive Stepper Split Layout */}
        <section className="flex flex-col lg:flex-row min-h-[80vh]">
          {/* For Seekers Column (White) */}
          <div className="lg:w-1/2 bg-white dark:bg-[#0f0f11] p-8 md:p-16 xl:p-24 border-r border-stone-100 dark:border-zinc-800 transition-colors duration-300">
            <div className="max-w-xl lg:ml-auto">
              <div className="mb-12">
                <span className="text-[#3366cc] font-bold text-xs uppercase tracking-widest block mb-1">Seeker Experience</span>
                <h2 className="font-headline text-4xl text-on-surface mb-2 font-serif">For Seekers</h2>
                <p className="font-body text-on-surface-variant opacity-85">Find and book verified professionals with surgical precision.</p>
              </div>
              <div className="space-y-16 relative">
                {/* Step 1 */}
                <div className="relative pl-16 group">
                  <div className="absolute left-5 top-8 bottom-0 w-[2px] bg-stone-200 dark:bg-zinc-800 opacity-80"></div>
                  <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border-2 border-[#3366cc] text-[#3366cc] flex items-center justify-center font-bold text-sm font-serif z-10 shadow-sm">
                    1
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-headline text-2xl group-hover:text-[#3366cc] transition-colors font-serif">Discover</h3>
                    <p className="font-body text-on-surface-variant leading-relaxed text-sm opacity-80">Browse a meticulously curated database of elite professionals, each vetted through our archival lens.</p>
                    
                    {/* UI Mockup Snippet: Search Bar */}
                    <div className="bg-surface-container-low p-4 rounded-xl border border-stone-200 dark:border-zinc-800 max-w-sm">
                      <div className="flex items-center gap-3 bg-card-bg border border-stone-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-on-surface-variant">
                        <Search className="w-4 h-4 text-stone-400" />
                        <span>Interior Architects in Calgary...</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative pl-16 group">
                  <div className="absolute left-5 top-8 bottom-0 w-[2px] bg-stone-200 dark:bg-zinc-800 opacity-80"></div>
                  <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border-2 border-[#3366cc] text-[#3366cc] flex items-center justify-center font-bold text-sm font-serif z-10 shadow-sm">
                    2
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-headline text-2xl group-hover:text-[#3366cc] transition-colors font-serif">Compare</h3>
                    <p className="font-body text-on-surface-variant leading-relaxed text-sm opacity-80">Evaluate candidates using side-by-side performance metrics and historical credentials.</p>
                    
                    {/* UI Mockup Snippet: Profile Card Mini */}
                    <div className="flex gap-4">
                      <div className="bg-surface-container-low p-4 rounded-xl border border-stone-200 dark:border-zinc-800 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-[#3366cc] flex items-center justify-center text-[10px] text-white font-bold">A</div>
                          <div className="h-2 w-16 bg-stone-300 dark:bg-zinc-700 rounded"></div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-[10px] font-bold">Elite Status</span>
                        </div>
                      </div>
                      <div className="bg-surface-container-low p-4 rounded-xl border border-stone-200 dark:border-zinc-800 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-stone-400 flex items-center justify-center text-[10px] text-white font-bold">B</div>
                          <div className="h-2 w-16 bg-stone-300 dark:bg-zinc-700 rounded"></div>
                        </div>
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-[10px] font-bold text-stone-500">Verified</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative pl-16 group">
                  <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border-2 border-[#3366cc] text-[#3366cc] flex items-center justify-center font-bold text-sm font-serif z-10 shadow-sm">
                    3
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-headline text-2xl group-hover:text-[#3366cc] transition-colors font-serif">Book</h3>
                    <p className="font-body text-on-surface-variant leading-relaxed text-sm opacity-80">Schedule your session instantly with our secure, streamlined checkout and archival tracking.</p>
                    
                    {/* UI Mockup Snippet: Confirmation */}
                    <div className="bg-[#3366cc]/5 p-4 rounded-xl border border-[#3366cc]/20 max-w-sm flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#3366cc] text-white flex items-center justify-center">
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#3366cc]">Booking Confirmed</p>
                        <p className="text-[10px] text-on-surface-variant">Session scheduled successfully</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* For Providers Column (Light Grey) */}
          <div className="lg:w-1/2 bg-surface-container-low p-8 md:p-16 xl:p-24 border-l border-stone-100 dark:border-zinc-800/20 transition-colors duration-300">
            <div className="max-w-xl mr-auto">
              <div className="mb-12">
                <span className="text-green-600 font-bold text-xs uppercase tracking-widest block mb-1">Provider Scale</span>
                <h2 className="font-headline text-4xl text-on-surface mb-2 font-serif">For Providers</h2>
                <p className="font-body text-on-surface-variant opacity-85">Join an elite network and scale your professional legacy.</p>
              </div>
              <div className="space-y-16 relative">
                {/* Step 1 */}
                <div className="relative pl-16 group">
                  <div className="absolute left-5 top-8 bottom-0 w-[2px] bg-stone-200 dark:bg-zinc-800 opacity-80"></div>
                  <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-white dark:bg-zinc-850 border-2 border-green-600 text-green-600 flex items-center justify-center font-bold text-sm font-serif z-10 shadow-sm">
                    1
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-headline text-2xl group-hover:text-green-600 transition-colors font-serif">Register</h3>
                    <p className="font-body text-on-surface-variant leading-relaxed text-sm opacity-80">Submit your professional credentials and business documentation for initial review.</p>
                    
                    {/* UI Mockup Snippet: Form Field */}
                    <div className="bg-card-bg p-4 rounded-xl border border-stone-200 dark:border-zinc-800 max-w-sm space-y-2">
                      <div className="h-2 w-24 bg-stone-300 dark:bg-zinc-700 rounded"></div>
                      <div className="h-8 w-full bg-surface-container rounded border border-stone-200 dark:border-zinc-800/30"></div>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative pl-16 group">
                  <div className="absolute left-5 top-8 bottom-0 w-[2px] bg-stone-200 dark:bg-zinc-800 opacity-80"></div>
                  <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-white dark:bg-zinc-850 border-2 border-green-600 text-green-600 flex items-center justify-center font-bold text-sm font-serif z-10 shadow-sm">
                    2
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-headline text-2xl group-hover:text-green-600 transition-colors font-serif">Verify</h3>
                    <p className="font-body text-on-surface-variant leading-relaxed text-sm opacity-80">Undergo our rigorous verification process to ensure your standards align with archival excellence.</p>
                    
                    {/* UI Mockup Snippet: Verification Loading */}
                    <div className="bg-card-bg p-4 rounded-xl border border-stone-200 dark:border-zinc-800 max-w-sm flex justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full border-2 border-green-600 border-t-transparent animate-spin"></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Verification in progress</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative pl-16 group">
                  <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-white dark:bg-zinc-850 border-2 border-green-600 text-green-600 flex items-center justify-center font-bold text-sm font-serif z-10 shadow-sm">
                    3
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-headline text-2xl group-hover:text-green-600 transition-colors font-serif">Grow</h3>
                    <p className="font-body text-on-surface-variant leading-relaxed text-sm opacity-80">Access a refined client base and leverage our tools to manage your appointments and reputation.</p>
                    
                    {/* UI Mockup Snippet: Stats */}
                    <div className="bg-card-bg p-4 rounded-xl border border-stone-200 dark:border-zinc-800 max-w-sm flex gap-6">
                      <div>
                        <p className="text-[10px] text-stone-500 uppercase">Bookings</p>
                        <p className="text-xl font-headline text-[#3366cc] font-bold font-serif">+124</p>
                      </div>
                      <div className="border-l border-stone-200 dark:border-zinc-800 pl-6">
                        <p className="text-[10px] text-stone-500 uppercase">Rating</p>
                        <p className="text-xl font-headline text-amber-500 font-bold font-serif">4.9/5</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-24 px-8 bg-background border-t border-outline-variant/30 transition-colors duration-300">
          <div className="max-w-5xl mx-auto bg-primary-container rounded-3xl p-12 md:p-20 text-center space-y-8 shadow-2xl shadow-primary/20" style={{ background: 'linear-gradient(135deg, #001a4d 0%, #003399 100%)' }}>
            <h2 className="font-headline text-4xl md:text-5xl text-white font-serif">Ready to start the journey?</h2>
            <p className="font-body text-lg text-white/80 max-w-2xl mx-auto">Join the premier platform for curated professional connections.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/search" className="bg-white text-[#001a4d] px-10 py-4 rounded-full font-label font-bold text-lg hover:shadow-lg transition-all text-center">
                Explore Professionals
              </Link>
              {isSignedIn ? (
                <Link href="/register" className="bg-[#3366cc] text-white border border-white/20 px-10 py-4 rounded-full font-label font-bold text-lg hover:shadow-lg transition-all text-center">
                  Apply to Join
                </Link>
              ) : (
                <SignUpButton mode="modal">
                  <button className="bg-[#3366cc] text-white border border-white/20 px-10 py-4 rounded-full font-label font-bold text-lg hover:shadow-lg transition-all text-center cursor-pointer">
                    Apply to Join
                  </button>
                </SignUpButton>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
