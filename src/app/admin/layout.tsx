'use strict';
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { UserButton, useUser, useAuth } from '@clerk/nextjs';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  LayoutDashboard, 
  Building2, 
  FolderHeart, 
  Star, 
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';

interface SidebarItem {
  name: string;
  tab: string;
  icon: React.ReactNode;
}

function AdminSidebarContent() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'stats';
  const { user } = useUser();
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

  const navItems: SidebarItem[] = [
    {
      name: 'Overview',
      tab: 'stats',
      icon: <LayoutDashboard className="w-4 h-4" />
    },
    {
      name: 'Providers',
      tab: 'providers',
      icon: <Building2 className="w-4 h-4" />
    },
    {
      name: 'Categories',
      tab: 'categories',
      icon: <FolderHeart className="w-4 h-4" />
    },
    {
      name: 'Reviews',
      tab: 'reviews',
      icon: <Star className="w-4 h-4" />
    }
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-card-bg border-r border-champagne/80 dark:border-zinc-800 flex flex-col justify-between p-6 hidden md:flex transition-colors duration-300">
        <div className="flex flex-col gap-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-1.5 font-sans font-bold text-xs text-stone-400 hover:text-stone-605 dark:text-stone-500 dark:hover:text-stone-300 transition-colors uppercase tracking-wider mb-6">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Main
            </Link>
            <h1 className="font-display text-xl font-bold text-espresso tracking-tight transition-colors duration-300">Admin Dashboard</h1>
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = currentTab === item.tab;
              return (
                <Link
                  key={item.name}
                  href={`/admin?tab=${item.tab}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? isDark 
                        ? 'bg-white-always text-slate-950 shadow-sm'
                        : 'bg-primary text-white shadow-sm'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-slate-205'
                  }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 border-t border-champagne/45 dark:border-zinc-800 pt-6 transition-colors duration-300">
          <UserButton />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-espresso transition-colors duration-300">{user?.fullName}</span>
            <span className="text-[10px] text-purple-700 dark:text-purple-400 font-sans font-bold flex items-center gap-0.5 transition-colors duration-300">
              <ShieldCheck className="w-3.5 h-3.5" /> Admin
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile Top Navigation tabs */}
      <div className="md:hidden bg-card-bg border-b border-champagne/60 dark:border-zinc-800 px-4 py-2.5 overflow-x-auto flex gap-2 scrollbar-none shrink-0 transition-colors duration-300">
        {navItems.map((item) => {
          const active = currentTab === item.tab;
          return (
            <Link
              key={item.name}
              href={`/admin?tab=${item.tab}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                active
                  ? isDark
                    ? 'bg-white-always text-slate-950'
                    : 'bg-primary text-white'
                  : 'bg-stone-50 dark:bg-zinc-900 text-stone-600 dark:text-stone-400 border border-champagne/45 dark:border-zinc-800'
              }`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useUser();
  const { isLoaded, isSignedIn } = useAuth();
  const [authorized, setAuthorized] = useState(false);
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
        if (resData.success && resData.user && resData.user.role === 'admin') {
          setAuthorized(true);
        } else {
          router.push('/');
        }
      } catch (err) {
        console.error('Error checking admin role in layout:', err);
        router.push('/');
      }
    }
    checkRole();
  }, [isLoaded, isSignedIn, user]);

  if (!authorized) {
    return (
      <div className={`flex-grow flex items-center justify-center p-8 min-h-screen transition-colors duration-300 ${isDark ? 'bg-slate-950 text-white' : 'bg-stone-50/50 text-espresso'}`}>
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Layout body with Sidebar and Content */}
      <div className="flex-grow pt-20 flex min-h-[calc(100vh-80px)]">
        <Suspense fallback={
          <aside className="w-64 bg-card-bg border-r border-champagne/80 dark:border-zinc-800 flex flex-col justify-between p-6 hidden md:flex animate-pulse transition-colors duration-300">
            <div className="h-8 bg-stone-105 dark:bg-zinc-850 rounded-lg w-32 mb-6"></div>
          </aside>
        }>
          <AdminSidebarContent />
        </Suspense>

        {/* Main Panel */}
        <main className="flex-grow flex flex-col">
          {/* Mobile top nav header */}
          <header className="h-16 border-b border-champagne dark:border-zinc-800 bg-card-bg px-6 flex items-center justify-between md:hidden transition-colors duration-300">
            <h2 className="font-display text-base font-bold text-espresso transition-colors duration-300">Admin Dashboard</h2>
            <UserButton />
          </header>

          <div className="flex-grow p-6 md:p-10 max-w-7xl w-full mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
