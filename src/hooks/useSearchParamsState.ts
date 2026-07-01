import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export interface SearchParamsState {
  query: string;
  location: string;
  lat: string;
  lng: string;
  distance: string;
  rating: string;
  price: string;
  availability: string;
  mode: string;
  category: string;
}

export function useSearchParamsState() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const state = useMemo((): SearchParamsState => {
    return {
      query: searchParams.get('query') || '',
      location: searchParams.get('location') || '',
      lat: searchParams.get('lat') || '',
      lng: searchParams.get('lng') || '',
      distance: searchParams.get('distance') || '25',
      rating: searchParams.get('rating') || '0',
      price: searchParams.get('price') || 'all',
      availability: searchParams.get('availability') || '',
      mode: searchParams.get('mode') || 'all',
      category: searchParams.get('category') || 'all',
    };
  }, [searchParams]);

  const updateState = useCallback(
    (newParams: Partial<SearchParamsState>, options?: { replace?: boolean; pushToSearchPage?: boolean }) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));

      Object.entries(newParams).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          current.delete(key);
        } else {
          current.set(key, value);
        }
      });

      const searchString = current.toString();
      const path = options?.pushToSearchPage ? '/search' : '';
      const url = `${path}?${searchString}`;

      if (options?.replace) {
        router.replace(url);
      } else {
        router.push(url);
      }
    },
    [router, searchParams]
  );

  return {
    state,
    updateState,
  };
}
