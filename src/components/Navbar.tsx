'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import { Home, Search, CalendarDays, LayoutDashboard, ShieldCheck, User } from 'lucide-react';
import Image from 'next/image';
import logoImg from '@/images/SERCH Logo 6.png';

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn, userId } = useAuth();
  const [dbRole, setDbRole] = useState<string | null>(null);

  useEffect(() => {
    async function loadRole() {
      if (userId) {
        try {
          const { data } = await supabase
            .from('users')
            .select('role')
            .eq('clerk_user_id', userId)
            .single();
          if (data) setDbRole(data.role);
        } catch (err) {
          console.error('Error fetching role in Navbar:', err);
        }
      }
    }
    loadRole();
  }, [userId]);

  return (
    <>
      {/* Top Navbar (Sticky on all screens) */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-champagne/50 shadow-sm">
        <div className="flex justify-between items-center px-6 md:px-12 h-20 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-10">
            <Link href="/" className="font-display text-2xl font-bold text-primary tracking-tight flex items-center">
              <Image 
                src={logoImg} 
                alt="Serch Logo" 
                height={48}
                className="h-12 w-auto object-contain"
                priority
              />
            </Link>
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex gap-8 items-center">
              <Link href="/search" className={`font-medium hover:text-accent transition-colors text-sm tracking-wide ${pathname === '/search' ? 'text-accent font-semibold' : 'text-stone-600'}`}>
                Find Providers
              </Link>
              {dbRole === 'provider' && (
                <Link href="/dashboard" className={`font-medium hover:text-accent transition-colors text-sm tracking-wide ${pathname.startsWith('/dashboard') ? 'text-accent font-semibold' : 'text-stone-600'}`}>
                  Provider Dashboard
                </Link>
              )}
              {dbRole === 'admin' && (
                <Link href="/admin" className={`font-medium hover:text-accent transition-colors text-sm tracking-wide ${pathname.startsWith('/admin') ? 'text-accent font-semibold' : 'text-stone-600'}`}>
                  Admin Panel
                </Link>
              )}
              {isSignedIn && dbRole === 'seeker' && (
                <Link href="/bookings" className={`font-medium hover:text-accent transition-colors text-sm tracking-wide ${pathname === '/bookings' ? 'text-accent font-semibold' : 'text-stone-600'}`}>
                  My Bookings
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isSignedIn ? (
              <div className="flex items-center gap-4">
                {dbRole === 'seeker' && (
                  <Link href="/register" className="hidden sm:inline-block bg-accent hover:bg-purple-700 text-white font-medium text-xs px-4 py-2 rounded-xl transition-all">
                    Become a Provider
                  </Link>
                )}
                <UserButton />
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <SignInButton mode="modal">
                  <button className="text-primary hover:bg-champagne/45 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200">
                    Sign In
                  </button>
                </SignInButton>
                <SignInButton mode="modal">
                  <button className="bg-primary hover:bg-slate-800 text-white font-medium text-xs sm:text-sm px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-xl transition-all duration-200">
                    Sign-in as Provider
                  </button>
                </SignInButton>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Sticky Bottom Navbar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-champagne/60 flex justify-around items-center md:hidden shadow-lg py-2.5 px-4">
        <Link href="/" className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/' ? 'text-accent' : 'text-stone-400 hover:text-stone-600'}`}>
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-semibold font-sans">Home</span>
        </Link>

        <Link href="/search" className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/search' ? 'text-accent' : 'text-stone-400 hover:text-stone-600'}`}>
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-semibold font-sans">Search</span>
        </Link>

        {/* Dynamic central Bookings/Dashboard tab based on role */}
        {dbRole === 'admin' ? (
          <Link href="/admin" className={`flex flex-col items-center gap-1 transition-colors ${pathname.startsWith('/admin') ? 'text-accent' : 'text-stone-400 hover:text-stone-600'}`}>
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[10px] font-semibold font-sans">Admin</span>
          </Link>
        ) : dbRole === 'provider' ? (
          <Link href="/dashboard" className={`flex flex-col items-center gap-1 transition-colors ${pathname.startsWith('/dashboard') ? 'text-accent' : 'text-stone-400 hover:text-stone-600'}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-semibold font-sans">Dashboard</span>
          </Link>
        ) : (
          <Link href="/bookings" className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/bookings' ? 'text-accent' : 'text-stone-400 hover:text-stone-600'}`}>
            <CalendarDays className="w-5 h-5" />
            <span className="text-[10px] font-semibold font-sans">Bookings</span>
          </Link>
        )}

        {/* Profile/Auth Button */}
        {isSignedIn ? (
          <div className="flex flex-col items-center justify-center min-w-8">
            <UserButton />
            <span className="text-[10px] font-semibold font-sans text-stone-400 mt-1">Profile</span>
          </div>
        ) : (
          <SignInButton mode="modal">
            <button className="flex flex-col items-center gap-1 text-stone-400 hover:text-stone-600 transition-colors">
              <User className="w-5 h-5" />
              <span className="text-[10px] font-semibold font-sans">Sign In</span>
            </button>
          </SignInButton>
        )}
      </div>
    </>
  );
}
