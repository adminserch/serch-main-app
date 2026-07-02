'use client';

import logoImg from '@/images/SERCH Logo 6.png';
import Image from 'next/image';
import Link from 'next/link';
import NewsletterForm from './NewsletterForm';

export default function Footer() {

  return (
    <footer className="bg-[#001a4d] text-white pt-24 pb-28 md:pb-12 font-sans" data-purpose="footer">
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
              <a className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-purple-600 transition-colors" href="https://www.facebook.com/useserch" target="_blank" rel="noopener noreferrer">
                <span className="sr-only">Facebook</span>
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"></path>
                </svg>
              </a>
              <a className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-purple-600 transition-colors" href="https://www.instagram.com/serchapp" target="_blank" rel="noopener noreferrer">
                <span className="sr-only">Instagram</span>
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
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
            <NewsletterForm />
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
