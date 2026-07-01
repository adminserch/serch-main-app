import { useState, useCallback } from 'react';

export interface UserLocationState {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
  } | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
}

export function useUserLocation() {
  const [state, setState] = useState<UserLocationState>({
    coords: null,
    status: 'idle',
    error: null,
  });

  const requestLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setState({
        coords: null,
        status: 'error',
        error: 'Geolocation is not supported by your browser.',
      });
      return;
    }

    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          status: 'success',
          error: null,
        });
      },
      (error) => {
        let errorMessage = 'An unknown error occurred while retrieving your location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access was denied. Please allow location access in your browser settings or enter it manually.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'The request to get your location timed out.';
            break;
        }
        setState({
          coords: null,
          status: 'error',
          error: errorMessage,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const resetLocation = useCallback(() => {
    setState({
      coords: null,
      status: 'idle',
      error: null,
    });
  }, []);

  return {
    ...state,
    requestLocation,
    resetLocation,
  };
}
