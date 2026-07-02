'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  MapPin, 
  Navigation, 
  Loader2, 
  SlidersHorizontal, 
  Calendar, 
  Star, 
  DollarSign, 
  X,
  Map,
  Layers
} from 'lucide-react';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useSearchParamsState } from '@/hooks/useSearchParamsState';
import { reverseGeocode } from '@/lib/location/reverseGeocode';
import { useCategories } from '@/hooks/useCategories';

interface LocalServiceSearchProps {
  variant?: 'landing' | 'full';
}

export default function LocalServiceSearch({ 
  variant = 'landing'
}: LocalServiceSearchProps) {
  const { coords, status, error, requestLocation } = useUserLocation();
  const { state, updateState } = useSearchParamsState();

  // State derivation for queryInput
  const [prevQuery, setPrevQuery] = useState(state.query);
  const [queryInput, setQueryInput] = useState(state.query);
  if (state.query !== prevQuery) {
    setQueryInput(state.query);
    setPrevQuery(state.query);
  }

  // State derivation for locationInput
  const [prevLocation, setPrevLocation] = useState(state.location);
  const [locationInput, setLocationInput] = useState(state.location);
  if (state.location !== prevLocation) {
    setLocationInput(state.location);
    setPrevLocation(state.location);
  }

  const [showFilters, setShowFilters] = useState(variant === 'full');
  
  // Local coordinate state to avoid URL pollution on the landing page
  const [localCoords, setLocalCoords] = useState<{ lat: string; lng: string }>({
    lat: state.lat,
    lng: state.lng
  });

  // Active dropdown states for full variant
  const [activeDropdown, setActiveDropdown] = useState<'distance' | 'rating' | 'price' | 'availability' | 'category' | null>(null);
  
  const { categories: dbCategories } = useCategories();
  const containerRef = useRef<HTMLDivElement>(null);

  // Load cached location on mount if no location is specified in URL query params
  useEffect(() => {
    if (typeof window !== 'undefined' && !state.location) {
      const cachedLoc = localStorage.getItem('default_seeker_location');
      const cachedLat = localStorage.getItem('default_seeker_lat') || '';
      const cachedLng = localStorage.getItem('default_seeker_lng') || '';
      if (cachedLoc) {
        setLocalCoords({ lat: cachedLat, lng: cachedLng });
        if (variant === 'landing') {
          setLocationInput(cachedLoc);
        } else {
          updateState({
            location: cachedLoc,
            lat: cachedLat,
            lng: cachedLng,
          }, { replace: true });
        }
      }
    }
  }, [state.location, updateState, variant]);

  // Handle Geolocation Success & Cache it
  useEffect(() => {
    if (status === 'success' && coords) {
      const getAddress = async () => {
        try {
          const result = await reverseGeocode(coords.latitude, coords.longitude);
          if (result) {
            setLocationInput(result.formattedAddress);
            setLocalCoords({
              lat: coords.latitude.toString(),
              lng: coords.longitude.toString()
            });
            
            // Cache in localStorage
            localStorage.setItem('default_seeker_location', result.formattedAddress);
            localStorage.setItem('default_seeker_lat', coords.latitude.toString());
            localStorage.setItem('default_seeker_lng', coords.longitude.toString());

            if (variant !== 'landing') {
              updateState({
                location: result.formattedAddress,
                lat: coords.latitude.toString(),
                lng: coords.longitude.toString(),
              }, { replace: true, pushToSearchPage: false });
            }
          } else {
            // Handle unknown location case: clear values
            setLocationInput('');
            setLocalCoords({ lat: '', lng: '' });
            localStorage.removeItem('default_seeker_location');
            localStorage.removeItem('default_seeker_lat');
            localStorage.removeItem('default_seeker_lng');
            if (variant !== 'landing') {
              updateState({
                location: '',
                lat: '',
                lng: '',
              }, { replace: true });
            }
          }
        } catch {
          // fail silently
        }
      };
      getAddress();
    }
  }, [status, coords, updateState, variant]);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Form Submit Handler & Cache manually entered location
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const targetLat = localCoords.lat;
    const targetLng = localCoords.lng;

    if (locationInput) {
      localStorage.setItem('default_seeker_location', locationInput);
      if (targetLat && targetLng) {
        localStorage.setItem('default_seeker_lat', targetLat);
        localStorage.setItem('default_seeker_lng', targetLng);
      } else {
        localStorage.removeItem('default_seeker_lat');
        localStorage.removeItem('default_seeker_lng');
      }
    } else {
      localStorage.removeItem('default_seeker_location');
      localStorage.removeItem('default_seeker_lat');
      localStorage.removeItem('default_seeker_lng');
    }

    updateState({
      query: queryInput,
      location: locationInput,
      lat: targetLat,
      lng: targetLng,
    }, { pushToSearchPage: variant === 'landing' });
  };

  const handleClearLocation = () => {
    setLocationInput('');
    setLocalCoords({ lat: '', lng: '' });
    localStorage.removeItem('default_seeker_location');
    localStorage.removeItem('default_seeker_lat');
    localStorage.removeItem('default_seeker_lng');
    if (variant !== 'landing') {
      updateState({
        location: '',
        lat: '',
        lng: '',
      }, { replace: true });
    }
  };

  // Helper to toggle dropdowns
  const toggleDropdown = (dropdown: typeof activeDropdown) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  // Quick filters styling helpers
  const getFilterButtonClass = (isActive: boolean) => `
    flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-300
    ${isActive 
      ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/10' 
      : 'bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-zinc-800'
    }
  `;

  // Fallback category mapping for sync support
  const fallbackCategories = [
    { id: 'Home Cleaning', name: 'Home Services' },
    { id: 'Maintenance', name: 'Maintenance' },
    { id: 'Creative Services', name: 'Creative Services' },
    { id: 'Lessons', name: 'Academic Lessons' }
  ];

  const getSelectedCategoryLabel = () => {
    if (state.category === 'all') return 'All Categories';
    
    // Check DB categories
    const dbCat = dbCategories.find(c => {
      const canonicalId = c.name === 'Home Services' || c.name === 'Home Cleaning'
        ? 'Home Cleaning'
        : c.name === 'Academic Lessons' || c.name === 'Lessons'
        ? 'Lessons'
        : c.name;
      return canonicalId === state.category;
    });
    if (dbCat) return dbCat.name;

    // Check fallback categories
    const fallbackCat = fallbackCategories.find(c => c.id === state.category);
    if (fallbackCat) return fallbackCat.name;

    return state.category;
  };

  return (
    <div ref={containerRef} className="w-full space-y-4">
      {/* Search Bar Form */}
      <form 
        onSubmit={handleSubmit}
        className={`bg-white dark:bg-zinc-950 rounded-2xl md:rounded-full p-3 md:p-2.5 flex flex-col md:flex-row items-stretch md:items-center gap-2 border border-champagne/80 dark:border-zinc-800 shadow-2xl transition-all duration-300`}
      >
        {/* Service Input */}
        <div className="flex-grow flex items-center px-3 md:px-4 py-2.5 gap-3 border-b md:border-b-0 md:border-r border-stone-100 dark:border-zinc-800">
          <Search className="h-5 w-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
          <input
            className="w-full border-none focus:ring-0 text-slate-800 dark:text-slate-100 text-base placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none bg-transparent"
            placeholder="Search services (e.g. house cleaning, carpentry)"
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
          />
        </div>

        {/* Location Input with Current Location Action */}
        <div className="flex-grow flex items-center px-3 md:px-4 py-2.5 gap-3 relative border-b md:border-b-0 border-stone-100 dark:border-zinc-800">
          <MapPin className="h-5 w-5 text-purple-600 flex-shrink-0" />
          <input
            className="w-full border-none focus:ring-0 text-slate-800 dark:text-slate-100 text-base placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none bg-transparent pr-16"
            placeholder="City, area or district"
            type="text"
            value={locationInput}
            onChange={(e) => {
              setLocationInput(e.target.value);
              setLocalCoords({ lat: '', lng: '' });
              // Clear coordinates when typing manually
              if (variant !== 'landing' && (state.lat || state.lng)) {
                updateState({ lat: '', lng: '' }, { replace: true });
              }
            }}
          />
          <div className="absolute right-2 flex items-center gap-1.5">
            {locationInput && (
              <button
                type="button"
                onClick={handleClearLocation}
                className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 transition-colors"
                title="Clear location"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={requestLocation}
              disabled={status === 'loading'}
              className={`p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-zinc-800 text-purple-600 transition-all ${
                status === 'loading' ? 'animate-spin' : ''
              }`}
              title="Use my location"
            >
              {status === 'loading' ? (
                <Loader2 className="h-4 w-4" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Action Button & Toggle Filters */}
        <div className="flex flex-row items-center gap-2 w-full md:w-auto pt-2 md:pt-0 pl-0 md:pl-2">
          {variant === 'full' && (
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3.5 rounded-xl md:rounded-full border transition-all flex items-center justify-center ${
                showFilters 
                  ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 text-purple-600' 
                  : 'bg-stone-50 dark:bg-zinc-900 border-stone-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-zinc-800'
              }`}
              title="Toggle filter controls"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
          )}

          <button
            type="submit"
            className="flex-grow bg-purple-600 hover:bg-purple-700 text-white px-8 py-3.5 rounded-xl md:rounded-full font-bold transition-all transform active:scale-95 cursor-pointer text-center whitespace-nowrap shadow-lg shadow-purple-600/10"
          >
            {variant === 'landing' ? 'Find Services' : 'Update Search'}
          </button>
        </div>
      </form>

      {/* Geolocation Loading / Error Status */}
      {status === 'loading' && (
        <div className="text-xs text-slate-500 flex items-center gap-2 px-4">
          <Loader2 className="h-3 w-3 animate-spin text-purple-600" />
          <span>Locating your current coordinates...</span>
        </div>
      )}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-950/50 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span>{error}</span>
        </div>
      )}

      {/* Advanced Filters Panel - Swipable on mobile, wrapping on desktop */}
      {showFilters && variant === 'full' && (
        <div className="flex items-center justify-start md:justify-center gap-3 overflow-x-auto pb-2 scrollbar-none md:flex-wrap md:overflow-x-visible md:pb-0 pt-2 animate-fadeIn relative">
          
          {/* Category Dropdown */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => toggleDropdown('category')}
              className={getFilterButtonClass(state.category !== 'all')}
            >
              <Layers className="h-4 w-4" />
              <span>{getSelectedCategoryLabel()}</span>
            </button>
            {activeDropdown === 'category' && (
              <div className="absolute left-0 mt-2 w-52 bg-white dark:bg-zinc-900 border border-champagne/80 dark:border-zinc-800 rounded-2xl shadow-xl z-20 p-2 space-y-1 max-h-60 overflow-y-auto">
                {[
                  { id: 'all', name: 'All Categories' },
                  ...(dbCategories.length > 0 
                    ? dbCategories.map(c => {
                        const canonicalId = c.name === 'Home Services' || c.name === 'Home Cleaning'
                          ? 'Home Cleaning'
                          : c.name === 'Academic Lessons' || c.name === 'Lessons'
                          ? 'Lessons'
                          : c.name;
                        return { id: canonicalId, name: c.name };
                      })
                    : fallbackCategories)
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      updateState({ category: cat.id });
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-4 py-2 rounded-xl text-sm transition-colors ${
                      state.category === cat.id
                        ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 font-bold'
                        : 'hover:bg-stone-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-350'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Distance Dropdown */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => toggleDropdown('distance')}
              className={getFilterButtonClass(state.distance !== '25')}
            >
              <Map className="h-4 w-4" />
              <span>{state.distance === '25' ? 'Within 25 km' : `Within ${state.distance} km`}</span>
            </button>
            {activeDropdown === 'distance' && (
              <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-champagne/80 dark:border-zinc-800 rounded-2xl shadow-xl z-20 p-2 space-y-1">
                {[5, 10, 25, 50, 100].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      updateState({ distance: d.toString() });
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-4 py-2 rounded-xl text-sm transition-colors ${
                      state.distance === d.toString()
                        ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 font-bold'
                        : 'hover:bg-stone-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-350'
                    }`}
                  >
                    Within {d} km
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rating Dropdown */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => toggleDropdown('rating')}
              className={getFilterButtonClass(state.rating !== '0')}
            >
              <Star className="h-4 w-4" />
              <span>{state.rating === '0' ? 'Any Rating' : `${state.rating}+ Stars`}</span>
            </button>
            {activeDropdown === 'rating' && (
              <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-champagne/80 dark:border-zinc-800 rounded-2xl shadow-xl z-20 p-2 space-y-1">
                {['0', '4.0', '4.5', '4.8'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      updateState({ rating: r });
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-4 py-2 rounded-xl text-sm transition-colors ${
                      state.rating === r
                        ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 font-bold'
                        : 'hover:bg-stone-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-350'
                    }`}
                  >
                    {r === '0' ? 'Any Rating' : `${r}+ Stars`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Price Dropdown */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => toggleDropdown('price')}
              className={getFilterButtonClass(state.price !== 'all')}
            >
              <DollarSign className="h-4 w-4" />
              <span>
                {state.price === 'all' ? 'Any Price' : 
                 state.price === '$' ? '$ Budget' : 
                 state.price === '$$' ? '$$ Moderate' : '$$$ Luxury'}
              </span>
            </button>
            {activeDropdown === 'price' && (
              <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-champagne/80 dark:border-zinc-800 rounded-2xl shadow-xl z-20 p-2 space-y-1">
                {[
                  { key: 'all', label: 'Any Price' },
                  { key: '$', label: '$ Budget' },
                  { key: '$$', label: '$$ Moderate' },
                  { key: '$$$', label: '$$$ Luxury' }
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      updateState({ price: p.key });
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-4 py-2 rounded-xl text-sm transition-colors ${
                      state.price === p.key
                        ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 font-bold'
                        : 'hover:bg-stone-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-350'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Availability (Date) Picker */}
          <div className="relative flex-shrink-0">
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-300 ${
              state.availability 
                ? 'bg-purple-600 text-white border-purple-600' 
                : 'bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300'
            }`}>
              <Calendar className="h-4 w-4" />
              <input
                type="date"
                value={state.availability}
                onChange={(e) => updateState({ availability: e.target.value })}
                className="bg-transparent border-none text-xs focus:ring-0 p-0 text-inherit cursor-pointer focus:outline-none"
              />
              {state.availability && (
                <button
                  type="button"
                  onClick={() => updateState({ availability: '' })}
                  className="ml-1 hover:text-stone-200"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
