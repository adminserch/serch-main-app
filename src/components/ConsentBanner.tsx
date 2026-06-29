'use client';

import React, { useState, useEffect } from 'react';

export default function ConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if consent has already been given
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const consent = localStorage.getItem('serch-cookie-consent');
        if (!consent) {
          setTimeout(() => setIsVisible(true), 0);
        }
      } else {
        setTimeout(() => setIsVisible(true), 0);
      }
    } catch {
      // Fallback if localStorage access is restricted
      setTimeout(() => setIsVisible(true), 0);
    }
  }, []);

  if (!isVisible) return null;

  const handleDismiss = (choice: 'all' | 'necessary') => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('serch-cookie-consent', choice);
      }
    } catch {
      // Ignore storage write errors in restricted browsers
    }
    setIsVisible(false);
  };

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-0 right-0 z-[100] px-4 transition-all duration-1000 ease-in-out">
      <div className="mx-auto max-w-4xl bg-white dark:bg-stone-950 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-stone-200 dark:border-stone-800 p-4 sm:py-3 sm:px-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Left Text Block */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            <p className="font-body text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-normal">
              <span className="font-headline font-bold text-stone-900 dark:text-white mr-2">Help us improve your experience.</span>
              We use cookies to personalize content, measure ads, and optimize your experience. By accepting, you agree to the 
              <a 
                className="ml-1 font-semibold text-[#3366cc] dark:text-[#a78bfa] underline underline-offset-4 hover:opacity-70 transition-colors" 
                href="/cookie-policy"
              >
                Serch cookie policy
              </a>.
            </p>
          </div>
          {/* Right Action Block */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto justify-center lg:justify-end">
            <button 
              onClick={() => handleDismiss('all')}
              type="button"
              className="w-full sm:w-auto px-5 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-100 text-white dark:text-stone-950 rounded font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all active:translate-y-0.5 text-center cursor-pointer"
            >
              Accept All
            </button>
            <button 
              onClick={() => handleDismiss('necessary')}
              type="button"
              className="w-full sm:w-auto px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded font-bold text-[10px] sm:text-xs uppercase tracking-widest border border-stone-200 dark:border-stone-700 transition-all active:translate-y-0.5 text-center cursor-pointer"
            >
              Only necessary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
