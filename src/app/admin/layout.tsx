'use strict';
'use client';

import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { useToast } from '@/components/Providers';
import { useAuth, UserButton, useUser } from '@clerk/nextjs';
import {
  ArrowLeft,
  Building2,
  FolderHeart,
  LayoutDashboard,
  ShieldCheck,
  Star,
  Menu,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';

interface SidebarItem {
  name: string;
  tab: string;
  icon: React.ReactNode;
}

interface AdminSidebarContentProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

function AdminSidebarContent({ isSidebarOpen, setIsSidebarOpen }: AdminSidebarContentProps) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'stats';
  const { user } = useUser();
  const [isDark, setIsDark] = useState(false);
  const drawerRef = React.useRef<HTMLDivElement>(null);

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

  // Body scroll lock
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isSidebarOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen, setIsSidebarOpen]);

  // Focus trap handler
  useEffect(() => {
    if (!isSidebarOpen) return;
    const focusableElements = drawerRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0] as HTMLElement;
    const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;

    // Small delay to let rendering complete
    const timeoutId = setTimeout(() => {
      firstElement?.focus();
    }, 50);

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handleTab);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('keydown', handleTab);
    };
  }, [isSidebarOpen]);

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

      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-fade-in">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
          {/* Drawer Content */}
          <div 
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Admin Menu"
            tabIndex={-1}
            className={`fixed left-0 top-0 bottom-0 w-72 max-w-[80vw] z-50 flex flex-col p-6 shadow-2xl transition-transform duration-300 border-r ${
              isDark 
                ? 'bg-slate-950 border-slate-800 text-white' 
                : 'bg-white border-champagne/80 text-espresso'
            }`}
          >
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-champagne/45 dark:border-zinc-800">
              <span className="font-display font-bold text-lg">Admin Menu</span>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-850"
                aria-label="Close Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-2 font-sans text-sm font-semibold flex-grow">
              <Link 
                href="/" 
                className="inline-flex items-center gap-1.5 font-sans font-bold text-xs text-stone-400 hover:text-stone-605 dark:text-stone-500 dark:hover:text-stone-300 transition-colors uppercase tracking-wider mb-6 px-4"
                onClick={() => setIsSidebarOpen(false)}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Main
              </Link>
              {navItems.map((item) => {
                const active = currentTab === item.tab;
                return (
                  <Link
                    key={item.name}
                    href={`/admin?tab=${item.tab}`}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      active
                        ? isDark 
                          ? 'bg-white-always text-slate-950 shadow-sm'
                          : 'bg-primary text-white shadow-sm'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3 border-t border-champagne/45 dark:border-zinc-800 pt-6">
              <UserButton />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-espresso dark:text-white">{user?.fullName}</span>
                <span className="text-[10px] text-purple-700 dark:text-purple-400 font-sans font-bold flex items-center gap-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Admin
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useUser();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { toast } = useToast();
  const [authorized, setAuthorized] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        const token = await getToken();
        const response = await fetch('/api/users/sync', {
          method: 'POST',
          headers: token ? {
            'Authorization': `Bearer ${token}`
          } : {}
        });
        if (!response.ok) {
          router.push('/');
          return;
        }
        
        const resData = await response.json();
        if (resData.success && resData.user && resData.user.role === 'admin') {
          setAuthorized(true);

          interface AdminProvider {
            status: string;
          }
          // Securely check for pending provider approval counts via API to bypass client RLS issues
          try {
            const dataRes = await fetch('/api/admin/data', {
              headers: token ? {
                'Authorization': `Bearer ${token}`
              } : {}
            });
            if (dataRes.ok) {
              const adminData = await dataRes.json();
              const providers = adminData.providers;
              const pendingCount = Array.isArray(providers)
                ? (providers as AdminProvider[]).filter(p => p.status === 'pending').length
                : 0;
              if (pendingCount > 0) {
                if (typeof window !== 'undefined' && !sessionStorage.getItem('__pendingToastShown')) {
                  toast(`Attention: There are ${pendingCount} provider registration requests awaiting approval.`, 'warning', 300000);
                  sessionStorage.setItem('__pendingToastShown', 'true');
                }
              }
            }
          } catch (countErr) {
            console.error('Failed to fetch pending provider count:', countErr);
          }
        } else {
          router.push('/');
        }
      } catch (err) {
        console.error('Error checking admin role in layout:', err);
        router.push('/');
      }
    }
    checkRole();
  }, [isLoaded, isSignedIn, user, getToken]);

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
      <div className="flex-grow pt-20 flex flex-col md:flex-row min-h-[calc(100vh-80px)]">
        <Suspense fallback={
          <aside className="w-64 bg-card-bg border-r border-champagne/80 dark:border-zinc-800 flex flex-col justify-between p-6 hidden md:flex animate-pulse transition-colors duration-300">
            <div className="h-8 bg-stone-105 dark:bg-zinc-850 rounded-lg w-32 mb-6"></div>
          </aside>
        }>
          <AdminSidebarContent isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        </Suspense>

        {/* Main Panel */}
        <main className="flex-grow flex flex-col">
          {/* Mobile top nav header */}
          <header className="h-16 border-b border-champagne dark:border-zinc-800 bg-card-bg px-6 flex items-center justify-between md:hidden transition-colors duration-300">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 rounded-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800"
                aria-label="Open Menu"
                aria-expanded={isSidebarOpen}
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="font-display text-base font-bold text-espresso dark:text-accent transition-colors duration-300">Admin Dashboard</h2>
            </div>
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
