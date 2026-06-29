'use client';

import React, { useState, useEffect } from 'react';

export default function ConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if consent has already been given
    const consent = localStorage.getItem('serch-cookie-consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) return null;

  const handleDismiss = (choice: 'all' | 'necessary') => {
    localStorage.setItem('serch-cookie-consent', choice);
    setIsVisible(false);
  };

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-0 right-0 z-[100] px-4 transition-all duration-1000 ease-in-out">
      <div className="mx-auto max-w-4xl bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-outline-variant/20 p-4 sm:py-3 sm:px-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Left Text Block */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            <p className="font-body text-xs sm:text-sm text-on-surface-variant leading-normal">
              <span className="font-headline font-bold text-on-surface mr-2">Help us improve your experience.</span>
              We use cookies to personalize content, measure ads, and optimize your experience. By accepting, you agree to the 
              <a 
                className="ml-1 font-semibold text-primary underline underline-offset-4 hover:opacity-70 transition-colors" 
                href="/cookie-policy"
              >
                Serch cookie policy
              </a>.
            </p>
          </div>
          {/* Right Action Block */}
          <div className="flex flex-col xs:flex-row items-center gap-3 w-full lg:w-auto justify-center lg:justify-end">
            <button 
              onClick={() => handleDismiss('all')}
              type="button"
              className="w-full xs:w-auto px-5 py-2 bg-on-surface text-white rounded font-bold text-[10px] sm:text-xs uppercase tracking-widest hover:opacity-90 transition-all active:translate-y-0.5 text-center"
            >
              Accept All
            </button>
            <button 
              onClick={() => handleDismiss('necessary')}
              type="button"
              className="w-full xs:w-auto px-4 py-2 bg-surface-container text-on-surface rounded font-bold text-[10px] sm:text-xs uppercase tracking-widest border border-outline-variant/20 hover:bg-surface-container-low transition-all active:translate-y-0.5 text-center"
            >
              Only necessary
            </button>
            <button 
              type="button"
              className="w-full xs:w-auto font-label text-[10px] sm:text-xs uppercase tracking-widest font-bold text-on-surface-variant/40 hover:text-primary underline underline-offset-4 transition-colors text-center py-2"
            >
              Manage preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
