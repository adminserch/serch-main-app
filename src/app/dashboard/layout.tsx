'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { UserButton, useUser, useAuth } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Settings2, 
  Sparkles, 
  Activity, 
  ArrowLeft,
  ChevronRight,
  FolderHeart
} from 'lucide-react';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { isLoaded, isSignedIn } = useAuth();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
      return;
    }

    async function checkRole() {
      if (!user) return;
      
      try {
        const response = await fetch('/api/users/sync', { method: 'POST' });
        if (!response.ok) {
          router.push('/');
          return;
        }
        
        const resData = await response.json();
        if (resData.success && resData.user && (resData.user.role === 'provider' || resData.user.role === 'admin')) {
          setAuthorized(true);
        } else {
          router.push('/');
        }
      } catch (err) {
        console.error('Error checking role in dashboard layout:', err);
        router.push('/');
      }
    }
    checkRole();
  }, [isLoaded, isSignedIn, user]);

  if (!authorized) {
    return (
      <div className="flex-grow flex items-center justify-center p-8 min-h-screen">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const navItems: SidebarItem[] = [
    {
      name: 'Overview',
      href: '/dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />
    },
    {
      name: 'Appointments',
      href: '/dashboard/appointments',
      icon: <CalendarDays className="w-4 h-4" />
    },
    {
      name: 'My Services',
      href: '/dashboard/services',
      icon: <Sparkles className="w-4 h-4" />
    },
    {
      name: 'Categories',
      href: '/dashboard/categories',
      icon: <FolderHeart className="w-4 h-4" />
    },
    {
      name: 'Hours & Calendar',
      href: '/dashboard/availability',
      icon: <Activity className="w-4 h-4" />
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: <Settings2 className="w-4 h-4" />
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-stone-50/50">
      {/* Top Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-champagne/50 shadow-sm">
        <div className="flex justify-between items-center px-6 md:px-12 h-20 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-10">
            <Link href="/" className="font-display text-2xl font-bold text-primary tracking-tight">
              Serch
            </Link>
            <div className="hidden md:flex gap-8 items-center">
              <Link href="/search" className="text-stone-600 font-medium hover:text-accent transition-colors text-sm tracking-wide">
                Find Professionals
              </Link>
              <Link href="/dashboard" className="text-accent font-semibold hover:text-accent transition-colors text-sm tracking-wide">
                Provider Dashboard
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <UserButton />
          </div>
        </div>
      </nav>

      {/* Main Layout body with Sidebar and Content */}
      <div className="flex-grow pt-20 flex min-h-[calc(100vh-80px)]">
        {/* Sidebar navigation */}
        <aside className="w-64 bg-white border-r border-champagne/80 flex flex-col justify-between p-6 hidden md:flex">
          <div className="flex flex-col gap-8">
            <div>
              <Link href="/" className="inline-flex items-center gap-1.5 font-sans font-bold text-xs text-stone-400 hover:text-stone-600 transition-colors uppercase tracking-wider mb-6">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Serch
              </Link>
              <h1 className="font-display text-xl font-bold text-espresso tracking-tight">Pro Dashboard</h1>
            </div>

            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      active
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-stone-600 hover:bg-stone-50 hover:text-slate-900'
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3 border-t border-champagne/45 pt-6">
            <UserButton />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-espresso">{user?.fullName}</span>
              <span className="text-[10px] text-stone-400 font-sans">Verified Professional</span>
            </div>
          </div>
        </aside>

        {/* Main Panel */}
        <main className="flex-grow flex flex-col">
          {/* Mobile top nav header */}
          <header className="h-16 border-b border-champagne bg-white px-6 flex items-center justify-between md:hidden">
            <h2 className="font-display text-base font-bold text-espresso">Pro Dashboard</h2>
            <UserButton />
          </header>

          <div className="flex-grow p-6 md:p-10 max-w-5xl w-full mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-espresso text-stone-300 w-full py-16 mt-auto border-t border-stone-800 z-10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <div>
            <div className="font-display text-xl font-bold text-white mb-2 tracking-tight">Serch</div>
            <p className="text-xs text-stone-400 max-w-sm">
              Connecting premium local service professionals with seeking clients. Verified quality, transparent calendars, secure bookings.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-xs font-medium font-sans">
            <Link href="#" className="hover:text-white transition-colors">Trust &amp; Safety</Link>
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-12 border-t border-stone-800 mt-8 pt-8 text-center text-xs text-stone-500 font-sans">
          &copy; 2026 Serch Technologies. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
