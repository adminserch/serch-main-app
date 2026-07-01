'use client';

import logoImg from '@/images/SERCH Logo 6.png';
import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/nextjs';
import { Bell, CalendarDays, Home, LayoutDashboard, Lightbulb, Search, ShieldCheck, User, Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn, userId, getToken } = useAuth();
  const [dbRole, setDbRole] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<string | null>(null);

  const [isDark, setIsDark] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    window.dispatchEvent(new Event('theme-change'));
  };

  useEffect(() => {
    async function loadRole() {
      if (userId) {
        try {
          const token = await getToken();
          const response = await fetch('/api/users/sync', {
            method: 'POST',
            headers: token ? {
              'Authorization': `Bearer ${token}`
            } : {}
          });
          if (response.ok) {
            const resData = await response.json();
            if (resData.success && resData.user) {
              setDbRole(resData.user.role || null);
              setProviderStatus(resData.user.providerStatus || null);
              return;
            }
          }
          setDbRole(null);
          setProviderStatus(null);
        } catch (err) {
          console.error('Error fetching role in Navbar:', err);
          setDbRole(null);
          setProviderStatus(null);
        }
      } else {
        setDbRole(null);
        setProviderStatus(null);
      }
    }
    loadRole();
  }, [userId, getToken]);

  return (
    <>
      {/* Top Navbar (Sticky on all screens) */}
      <nav className={`fixed top-0 w-full z-50 transition-colors duration-300 border-b shadow-sm ${isDark
        ? 'bg-slate-950/85 backdrop-blur-md border-slate-800'
        : 'bg-white/85 backdrop-blur-md border-champagne/50'
        }`}>
        <div className="flex justify-between items-center px-6 md:px-12 h-20 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center">
              <Image
                src={logoImg}
                alt="SERCH Logo"
                width={120}
                height={40}
                priority
                className="object-contain h-10 w-auto"
              />
            </Link>
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex gap-8 items-center font-sans text-sm font-semibold">
              <Link href="/search" className={`hover:text-purple-600 transition-colors ${pathname === '/search' ? 'text-purple-600' : isDark ? 'text-slate-200' : 'text-[#5a5f63]'}`}>
                Browse Services
              </Link>
              {(dbRole !== 'provider' && dbRole !== 'admin' && providerStatus !== 'pending') && (
                <Link href="/register" className={`hover:text-purple-600 transition-colors ${pathname === '/register' ? 'text-purple-600' : isDark ? 'text-slate-200' : 'text-[#5a5f63]'}`}>
                  Become a Provider
                </Link>
              )}
              {dbRole === 'provider' && (
                <Link href="/dashboard" className={`hover:text-purple-600 transition-colors ${pathname.startsWith('/dashboard') ? 'text-purple-600' : isDark ? 'text-slate-200' : 'text-[#5a5f63]'}`}>
                  Provider Dashboard
                </Link>
              )}
              {dbRole === 'admin' && (
                <Link href="/admin" className={`hover:text-purple-600 transition-colors ${pathname.startsWith('/admin') ? 'text-purple-600' : isDark ? 'text-slate-200' : 'text-[#5a5f63]'}`}>
                  Admin Dashboard
                </Link>
              )}
              <Link href="/how-it-works" className={`hover:text-purple-600 transition-colors ${pathname === '/how-it-works' ? 'text-purple-600' : isDark ? 'text-slate-200' : 'text-[#5a5f63]'}`}>
                How It Works
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-stone-100 text-stone-500'
                }`}
              aria-label="Toggle Dark Mode"
            >
              <Lightbulb className="w-5 h-5" />
            </button>

            <button 
              aria-label="Notifications (coming soon)"
              onClick={() => alert("Notifications feature is coming soon!")}
              className="text-[#5a5f63] hover:text-purple-600 transition-colors relative p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Bell className="w-5 h-5" />
            </button>

            <div className="h-6 w-[1px] bg-slate-300 dark:bg-slate-800 hidden sm:block"></div>

            {isSignedIn ? (
              <div className="flex items-center gap-4">
                {dbRole === 'seeker' && (
                  <Link href="/bookings" className={`hidden sm:inline-block hover:text-purple-600 font-semibold text-sm transition-colors ${pathname === '/bookings' ? 'text-purple-600' : isDark ? 'text-slate-200' : 'text-[#5a5f63]'}`}>
                    My Bookings
                  </Link>
                )}
                <UserButton />
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-4 font-sans">
                <SignInButton mode="modal">
                  <button className="font-semibold text-sm text-[#0b1326] dark:text-slate-200 hover:text-purple-600 transition-colors px-2 py-1">
                    Log In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-all hover:shadow-md active:scale-95 cursor-pointer">
                    Get Started
                  </button>
                </SignUpButton>
              </div>
            )}
            {/* Hamburger Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl transition-colors md:hidden hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-500 dark:text-slate-400"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer Content */}
          <div className={`fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] z-50 flex flex-col p-6 shadow-2xl transition-transform duration-300 border-l ${
            isDark 
              ? 'bg-slate-950 border-slate-800 text-white' 
              : 'bg-white border-champagne/80 text-espresso'
          }`}>
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-champagne/45 dark:border-zinc-800">
              <span className="font-display font-bold text-lg">Menu</span>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-850"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-4 font-sans text-base font-semibold">
              <Link 
                href="/search" 
                className={`py-2 px-3 rounded-xl transition-colors hover:bg-stone-50 dark:hover:bg-zinc-900 ${pathname === '/search' ? 'text-purple-600 bg-stone-50 dark:bg-zinc-900' : 'text-stone-600 dark:text-stone-400'}`}
              >
                Browse Services
              </Link>
              {(dbRole !== 'provider' && dbRole !== 'admin' && providerStatus !== 'pending') && (
                <Link 
                  href="/register" 
                  className={`py-2 px-3 rounded-xl transition-colors hover:bg-stone-50 dark:hover:bg-zinc-900 ${pathname === '/register' ? 'text-purple-600 bg-stone-50 dark:bg-zinc-900' : 'text-stone-600 dark:text-stone-400'}`}
                >
                  Become a Provider
                </Link>
              )}
              {dbRole === 'provider' && (
                <Link 
                  href="/dashboard" 
                  className={`py-2 px-3 rounded-xl transition-colors hover:bg-stone-50 dark:hover:bg-zinc-900 ${pathname.startsWith('/dashboard') ? 'text-purple-600 bg-stone-50 dark:bg-zinc-900' : 'text-stone-600 dark:text-stone-400'}`}
                >
                  Provider Dashboard
                </Link>
              )}
              {dbRole === 'admin' && (
                <Link 
                  href="/admin" 
                  className={`py-2 px-3 rounded-xl transition-colors hover:bg-stone-50 dark:hover:bg-zinc-900 ${pathname.startsWith('/admin') ? 'text-purple-600 bg-stone-50 dark:bg-zinc-900' : 'text-stone-600 dark:text-stone-400'}`}
                >
                  Admin Dashboard
                </Link>
              )}
              <Link 
                href="/how-it-works" 
                className={`py-2 px-3 rounded-xl transition-colors hover:bg-stone-50 dark:hover:bg-zinc-900 ${pathname === '/how-it-works' ? 'text-purple-600 bg-stone-50 dark:bg-zinc-900' : 'text-stone-600 dark:text-stone-400'}`}
              >
                How It Works
              </Link>
              {isSignedIn && dbRole === 'seeker' && (
                <Link 
                  href="/bookings" 
                  className={`py-2 px-3 rounded-xl transition-colors hover:bg-stone-50 dark:hover:bg-zinc-900 ${pathname === '/bookings' ? 'text-purple-600 bg-stone-50 dark:bg-zinc-900' : 'text-stone-600 dark:text-stone-400'}`}
                >
                  My Bookings
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Navbar */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md border-t flex justify-around items-center md:hidden shadow-lg py-2.5 px-4 transition-colors duration-300 ${isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-champagne/60'
        }`}>
        <Link href="/" className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/' ? 'text-purple-600' : 'text-stone-400 hover:text-stone-600 dark:text-slate-400 dark:hover:text-slate-300'}`}>
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-semibold font-sans">Home</span>
        </Link>

        <Link href="/search" className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/search' ? 'text-purple-600' : 'text-stone-400 hover:text-stone-600 dark:text-slate-400 dark:hover:text-slate-300'}`}>
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-semibold font-sans">Search</span>
        </Link>

        {/* Dynamic central Bookings/Dashboard tab based on role */}
        {dbRole === 'admin' ? (
          <Link href="/admin" className={`flex flex-col items-center gap-1 transition-colors ${pathname.startsWith('/admin') ? 'text-purple-600' : 'text-stone-400 hover:text-stone-600 dark:text-slate-400 dark:hover:text-slate-300'}`}>
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[10px] font-semibold font-sans">Admin</span>
          </Link>
        ) : dbRole === 'provider' ? (
          <Link href="/dashboard" className={`flex flex-col items-center gap-1 transition-colors ${pathname.startsWith('/dashboard') ? 'text-purple-600' : 'text-stone-400 hover:text-stone-600 dark:text-slate-400 dark:hover:text-slate-300'}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-semibold font-sans">Dashboard</span>
          </Link>
        ) : (
          <Link href="/bookings" className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/bookings' ? 'text-purple-600' : 'text-stone-400 hover:text-stone-600 dark:text-slate-400 dark:hover:text-slate-300'}`}>
            <CalendarDays className="w-5 h-5" />
            <span className="text-[10px] font-semibold font-sans">Bookings</span>
          </Link>
        )}

        {/* Profile/Auth Button */}
        {isSignedIn ? (
          <div className="flex flex-col items-center justify-center min-w-8">
            <UserButton />
            <span className={`text-[10px] font-semibold font-sans mt-1 transition-colors duration-300 ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>Profile</span>
          </div>
        ) : (
          <SignInButton mode="modal">
            <button className="flex flex-col items-center gap-1 text-stone-400 hover:text-stone-600 dark:text-slate-400 dark:hover:text-slate-300 transition-colors">
              <User className="w-5 h-5" />
              <span className="text-[10px] font-semibold font-sans">Sign In</span>
            </button>
          </SignInButton>
        )}
      </div>
    </>
  );
}
