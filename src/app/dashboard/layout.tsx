'use strict';
'use client';

import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { SignIn, useAuth, UserButton, useUser } from '@clerk/nextjs';
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  LayoutDashboard,
  Settings2,
  Sparkles,
  Clock,
  Ban,
  AlertCircle,
  Menu,
  X
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [providerStatus, setProviderStatus] = useState<string | null>(null);
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
        if (resData.success && resData.user) {
          if (resData.user.role === 'admin') {
            setProviderStatus('approved');
            setAuthorized(true);
          } else if (resData.user.role === 'provider') {
            setProviderStatus(resData.user.providerStatus);
            setAuthorized(true);
          } else if (resData.user.providerStatus) {
            setProviderStatus(resData.user.providerStatus);
            setAuthorized(true);
          } else {
            router.push('/');
          }
        } else {
          router.push('/');
        }
      } catch (err) {
        console.error('Error checking role in dashboard layout:', err);
        router.push('/');
      }
    }
    checkRole();
  }, [isLoaded, isSignedIn, user, getToken]);

  if (isLoaded && !isSignedIn) {
    return (
      <div className="flex flex-col min-h-screen bg-stone-50/50 text-espresso">
        <Navbar />
        <main className="flex-grow pt-28 pb-16 flex items-center justify-center px-6">
          <div className="max-w-md w-full bg-white border border-champagne/80 shadow-md rounded-2xl p-8 flex flex-col items-center">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 border bg-champagne/40 text-accent border-champagne animate-pulse">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <h1 className="font-display text-2xl font-bold mb-2 text-espresso">
                Sign In as Provider
              </h1>
              <p className="font-sans text-sm text-stone-500">
                To access your provider dashboard, manage appointments, services, and business hours, please sign in.
              </p>
            </div>
            <SignIn 
              routing="hash"
              appearance={{
                elements: {
                  formButtonPrimary: 'bg-primary hover:bg-slate-800 text-white text-sm normal-case border-none',
                  card: 'border border-champagne/40 shadow-none rounded-xl bg-white w-full max-w-sm',
                  headerTitle: 'text-espresso',
                  headerSubtitle: 'text-stone-500',
                  socialButtonsBlockButton: 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                  formFieldLabel: 'text-stone-700',
                  formFieldInput: 'bg-white text-stone-700 border-slate-200 focus:border-primary focus:ring-primary',
                  dividerText: 'text-stone-500 font-sans',
                  dividerLine: 'bg-slate-200',
                  footerActionText: 'text-stone-500',
                  footerActionLink: 'text-primary hover:text-accent',
                  identityPreviewText: 'text-espresso',
                  identityPreviewEditButtonIcon: 'text-primary',
                },
              }}
            />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex flex-col min-h-screen bg-stone-50/50 text-espresso">
        <Navbar />
        <div className="flex-grow flex items-center justify-center p-8 pt-36">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (providerStatus && providerStatus !== 'approved') {
    return (
      <div className="flex flex-col min-h-screen bg-stone-50/50 text-espresso">
        <Navbar />
        <main className="flex-grow pt-28 pb-16 flex items-center justify-center px-6">
          <div className="max-w-md w-full bg-white border border-champagne/80 shadow-md rounded-2xl p-8 flex flex-col items-center text-center">
            {providerStatus === 'pending' ? (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 border bg-amber-50 text-amber-600 border-amber-200">
                  <Clock className="w-8 h-8 animate-pulse" />
                </div>
                <h1 className="font-display text-2xl font-bold mb-3 text-espresso">
                  Application Under Review
                </h1>
                <p className="font-sans text-sm text-stone-500 mb-8 leading-relaxed">
                  Your provider application is currently being reviewed by our admin team. Seekers will be able to search and book your services once your profile is approved.
                </p>
              </>
            ) : providerStatus === 'rejected' ? (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 border bg-red-50 text-red-650 border-red-200">
                  <Ban className="w-8 h-8" />
                </div>
                <h1 className="font-display text-2xl font-bold mb-3 text-espresso">
                  Application Rejected
                </h1>
                <p className="font-sans text-sm text-stone-500 mb-8 leading-relaxed">
                  Your provider application was not approved. Please reach out to support for more details regarding this decision.
                </p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 border bg-red-50 text-red-650 border-red-200">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h1 className="font-display text-2xl font-bold mb-3 text-espresso">
                  Account Suspended
                </h1>
                <p className="font-sans text-sm text-stone-500 mb-8 leading-relaxed">
                  Your provider account is currently suspended. Access to the provider dashboard has been restricted.
                </p>
              </>
            )}
            <Link
              href="/"
              className="w-full bg-primary hover:bg-slate-800 text-white font-semibold text-sm py-3 px-4 rounded-xl transition-all shadow-sm"
            >
              Back to Home
            </Link>
          </div>
        </main>
        <Footer />
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
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Layout body with Sidebar and Content */}
      <div className="flex-grow pt-20 flex flex-col md:flex-row min-h-[calc(100vh-80px)]">
        {/* Sidebar navigation */}
        <aside className="w-64 bg-card-bg border-r border-champagne/80 dark:border-zinc-800 flex flex-col justify-between p-6 hidden md:flex transition-colors duration-300">
          <div className="flex flex-col gap-8">
            <div>
              <Link href="/" className="inline-flex items-center gap-1.5 font-sans font-bold text-xs text-stone-400 hover:text-stone-605 dark:text-stone-500 dark:hover:text-stone-300 transition-colors uppercase tracking-wider mb-6">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Main
              </Link>
              <h1 className="font-display text-xl font-bold text-espresso dark:text-accent tracking-tight transition-colors duration-300">Provider Dashboard</h1>
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
                        ? isDark 
                          ? 'bg-white-always text-slate-950 shadow-sm'
                          : 'bg-primary text-white shadow-sm'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-slate-200'
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
              <span className="text-[10px] text-purple-700 dark:text-purple-400 font-sans font-bold transition-colors duration-300">Verified Professional</span>
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
            <div className={`fixed left-0 top-0 bottom-0 w-72 max-w-[80vw] z-50 flex flex-col p-6 shadow-2xl transition-transform duration-300 border-r ${
              isDark 
                ? 'bg-slate-950 border-slate-800 text-white' 
                : 'bg-white border-champagne/80 text-espresso'
            }`}>
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-champagne/45 dark:border-zinc-800">
                <span className="font-display font-bold text-lg">Menu</span>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-850"
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
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
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
                  <span className="text-[10px] text-purple-700 dark:text-purple-400 font-sans font-bold">Verified Professional</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Panel */}
        <main className="flex-grow flex flex-col">
          {/* Mobile top nav header */}
          <header className="h-16 border-b border-champagne dark:border-zinc-800 bg-card-bg px-6 flex items-center justify-between md:hidden transition-colors duration-300">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 rounded-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800"
                aria-label="Open Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="font-display text-base font-bold text-espresso dark:text-accent transition-colors duration-300">Provider Dashboard</h2>
            </div>
            <UserButton />
          </header>

          <div className="flex-grow p-6 md:p-10 max-w-5xl w-full mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
