'use client';

import Link from 'next/link';
import Image from 'next/image';
import logoImg from '@/images/SERCH Logo 6.png';

export default function Footer() {
  return (
    <footer className="bg-espresso text-stone-300 w-full pt-8 pb-20 md:pb-8 mt-auto border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
        <div className="flex flex-col items-center md:items-start">
          <Link href="/" className="flex items-center mb-3">
            <Image
              src={logoImg}
              alt="Serch Logo"
              height={48}
              className="h-12 w-auto object-contain brightness-0 invert"
            />
          </Link>
          <p className="text-[11px] text-stone-400 max-w-sm">
            Connecting premium local service professionals with seeking clients. Verified quality, transparent calendars, secure bookings.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-xs font-medium font-sans">
          <Link href="#" className="hover:text-white transition-colors">Trust &amp; Safety</Link>
          <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 md:px-12 border-t border-stone-800 mt-4 pt-4 text-center text-[10px] text-stone-500 font-sans">
        &copy; 2026 Serch Technologies. All rights reserved.
      </div>
    </footer>
  );
}
