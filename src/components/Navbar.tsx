'use client';

import logoImg from '@/images/SERCH Logo 6.png';
import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/nextjs';
import { Bell, CalendarDays, Home, LayoutDashboard, Lightbulb, Search, ShieldCheck, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn, userId, getToken } = useAuth();
  const [dbRole, setDbRole] = useState<string | null>(null);

  const [isDark, setIsDark] = useState(false);

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
            if (resData.success && resData.user && resData.user.role) {
              setDbRole(resData.user.role);
              return;
            }
          }
          setDbRole(null);
        } catch (err) {
          console.error('Error fetching role in Navbar:', err);
          setDbRole(null);
        }
      } else {
        setDbRole(null);
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
              <Link href="/search" className={`hover:text-[#2563eb] transition-colors ${pathname === '/search' ? 'text-[#2563eb]' : isDark ? 'text-slate-200' : 'text-[#5a5f63]'}`}>
                Browse Services
              </Link>
              {(dbRole !== 'provider' && dbRole !== 'admin') && (
                <Link href="/register" className={`hover:text-[#2563eb] transition-colors ${pathname === '/register' ? 'text-[#2563eb]' : isDark ? 'text-slate-200' : 'text-[#5a5f63]'}`}>
                  Become a Provider
                </Link>
              )}
              {dbRole === 'provider' && (
                <Link href="/dashboard" className={`hover:text-[#2563eb] transition-colors ${pathname.startsWith('/dashboard') ? 'text-[#2563eb]' : isDark ? 'text-slate-200' : 'text-[#5a5f63]'}`}>
                  Provider Dashboard
                </Link>
              )}
              {dbRole === 'admin' && (
                <Link href="/admin" className={`hover:text-[#2563eb] transition-colors ${pathname.startsWith('/admin') ? 'text-[#2563eb]' : isDark ? 'text-slate-200' : 'text-[#5a5f63]'}`}>
                  Admin Dashboard
                </Link>
              )}
              <Link href="/how-it-works" className={`hover:text-[#2563eb] transition-colors ${pathname === '/how-it-works' ? 'text-[#2563eb]' : isDark ? 'text-slate-200' : 'text-[#5a5f63]'}`}>
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

            <button className="text-[#5a5f63] hover:text-[#2563eb] transition-colors relative p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
              <Bell className="w-5 h-5" />
            </button>

            <div className="h-6 w-[1px] bg-slate-300 dark:bg-slate-800 hidden sm:block"></div>

            {isSignedIn ? (
              <div className="flex items-center gap-4">
                {dbRole === 'seeker' && (
                  <Link href="/bookings" className={`hidden sm:inline-block hover:text-[#2563eb] font-semibold text-sm transition-colors ${pathname === '/bookings' ? 'text-[#2563eb]' : isDark ? 'text-slate-200' : 'text-[#5a5f63]'}`}>
                    My Bookings
                  </Link>
                )}
                <UserButton />
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-4 font-sans">
                <SignInButton mode="modal">
                  <button className="font-semibold text-sm text-[#0b1326] dark:text-slate-200 hover:text-[#2563eb] transition-colors px-2 py-1">
                    Log In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="bg-[#2563eb] hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-all hover:shadow-md active:scale-95 cursor-pointer">
                    Get Started
                  </button>
                </SignUpButton>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Sticky Bottom Navbar */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md border-t flex justify-around items-center md:hidden shadow-lg py-2.5 px-4 transition-colors duration-300 ${isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-champagne/60'
        }`}>
        <Link href="/" className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/' ? 'text-[#2563eb]' : 'text-stone-400 hover:text-stone-600 dark:text-slate-400 dark:hover:text-slate-250'}`}>
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-semibold font-sans">Home</span>
        </Link>

        <Link href="/search" className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/search' ? 'text-[#2563eb]' : 'text-stone-400 hover:text-stone-600 dark:text-slate-400 dark:hover:text-slate-250'}`}>
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-semibold font-sans">Search</span>
        </Link>

        {/* Dynamic central Bookings/Dashboard tab based on role */}
        {dbRole === 'admin' ? (
          <Link href="/admin" className={`flex flex-col items-center gap-1 transition-colors ${pathname.startsWith('/admin') ? 'text-[#2563eb]' : 'text-stone-400 hover:text-stone-600 dark:text-slate-400 dark:hover:text-slate-250'}`}>
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[10px] font-semibold font-sans">Admin</span>
          </Link>
        ) : dbRole === 'provider' ? (
          <Link href="/dashboard" className={`flex flex-col items-center gap-1 transition-colors ${pathname.startsWith('/dashboard') ? 'text-[#2563eb]' : 'text-stone-400 hover:text-stone-600 dark:text-slate-400 dark:hover:text-slate-250'}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-semibold font-sans">Dashboard</span>
          </Link>
        ) : (
          <Link href="/bookings" className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/bookings' ? 'text-[#2563eb]' : 'text-stone-400 hover:text-stone-600 dark:text-slate-400 dark:hover:text-slate-250'}`}>
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
            <button className="flex flex-col items-center gap-1 text-stone-400 hover:text-stone-600 dark:text-slate-400 dark:hover:text-slate-250 transition-colors">
              <User className="w-5 h-5" />
              <span className="text-[10px] font-semibold font-sans">Sign In</span>
            </button>
          </SignInButton>
        )}
      </div>
    </>
  );
}
