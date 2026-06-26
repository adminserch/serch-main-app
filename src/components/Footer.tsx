'use client';

import logoImg from '@/images/SERCH Logo 6.png';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Footer() {
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

  return (
    <footer className="bg-[#001a4d] text-white pt-24 pb-12 font-sans" data-purpose="footer">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          <div className="md:col-span-4">
            <Link href="/" className="flex items-center mb-6">
              <Image
                src={logoImg}
                alt="SERCH Logo"
                width={120}
                height={40}
                className="object-contain h-10 w-auto brightness-0 invert"
              />
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Connecting local professionals with clients in minutes. The premier marketplace for reliable home and professional services.
            </p>
            <div className="flex gap-4">
              <a className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#3366cc] transition-colors" href="https://facebook.com" target="_blank" rel="noopener noreferrer">
                <span className="sr-only">Facebook</span>
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"></path>
                </svg>
              </a>
              <a className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#3366cc] transition-colors" href="https://x.com" target="_blank" rel="noopener noreferrer">
                <span className="sr-only">Twitter</span>
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                </svg>
              </a>
            </div>
          </div>
          
          <div className="md:col-span-2">
            <h4 className="font-bold mb-6 text-white text-sm tracking-wide uppercase">Services</h4>
            <ul className="space-y-4 text-slate-400 text-sm">
              <li><Link href="/search?category=Cleaning" className="hover:text-white transition-colors">Cleaning Services</Link></li>
              <li><Link href="/search?category=Maintenance" className="hover:text-white transition-colors">Handyman &amp; Repairs</Link></li>
              <li><Link href="/search?category=Lessons" className="hover:text-white transition-colors">Education &amp; Lessons</Link></li>
              <li><Link href="/search?category=Wellness" className="hover:text-white transition-colors">Health &amp; Wellness</Link></li>
            </ul>
          </div>
          
          <div className="md:col-span-2">
            <h4 className="font-bold mb-6 text-white text-sm tracking-wide uppercase">Company</h4>
            <ul className="space-y-4 text-slate-400 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About Serch</Link></li>
              <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link href="/trust-safety" className="hover:text-white transition-colors">Trust &amp; Safety</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>
          
          <div className="md:col-span-4">
            <h4 className="font-bold mb-6 text-white text-sm tracking-wide uppercase">Newsletter</h4>
            <p className="text-slate-400 text-sm mb-4">Get the latest service updates and local deals.</p>
            <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-400 italic">
              Newsletter subscription feature is coming soon!
            </div>
          </div>
        </div>
        
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-sans text-slate-500">
          <p>© 2026 Serch Technologies Inc. All rights reserved.</p>
          <div className="flex gap-8">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
