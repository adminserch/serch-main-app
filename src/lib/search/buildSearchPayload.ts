export interface SearchPayload {
  query: string;
  location: string;
  coords: {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
  };
  distance: number; // in km
  rating: number; // min rating (e.g. 0, 4.0, 4.5)
  price: string; // 'all' | '$' | '$$' | '$$$'
  availability: string; // YYYY-MM-DD or empty
  mode: 'all' | 'in-person' | 'remote';
}

export function buildSearchPayload(params: Partial<SearchPayload>): SearchPayload {
  return {
    query: params.query || '',
    location: params.location || '',
    coords: {
      latitude: params.coords?.latitude ?? null,
      longitude: params.coords?.longitude ?? null,
      accuracy: params.coords?.accuracy ?? null,
    },
    distance: params.distance ?? 25, // default 25km radius
    rating: params.rating ?? 0,
    price: params.price || 'all',
    availability: params.availability || '',
    mode: params.mode || 'all',
  };
}
