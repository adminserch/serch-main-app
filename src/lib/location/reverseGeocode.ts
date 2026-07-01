/**
 * Reverse geocoding stub that maps latitude and longitude coordinates
 * to realistic city/district names for the local services marketplace.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<{
  city: string;
  district: string;
  formattedAddress: string;
}> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Makati coordinates: ~14.55
  if (Math.abs(lat - 14.5547) < 0.05 && Math.abs(lng - 121.0244) < 0.05) {
    return {
      city: 'Manila',
      district: 'Makati',
      formattedAddress: 'Makati, Manila',
    };
  }

  // BGC coordinates: ~14.54
  if (Math.abs(lat - 14.5409) < 0.05 && Math.abs(lng - 121.0503) < 0.05) {
    return {
      city: 'Manila',
      district: 'BGC',
      formattedAddress: 'BGC, Manila',
    };
  }

  // Quezon City coordinates: ~14.67
  if (Math.abs(lat - 14.6760) < 0.05 && Math.abs(lng - 121.0437) < 0.05) {
    return {
      city: 'Manila',
      district: 'Quezon City',
      formattedAddress: 'Quezon City, Manila',
    };
  }

  // Mandaluyong coordinates: ~14.57
  if (Math.abs(lat - 14.5794) < 0.05 && Math.abs(lng - 121.0359) < 0.05) {
    return {
      city: 'Manila',
      district: 'Mandaluyong',
      formattedAddress: 'Mandaluyong, Manila',
    };
  }

  // Toronto / GTA coordinates: ~43.7
  if (Math.abs(lat - 43.7) < 0.5 && Math.abs(lng - -79.3) < 0.5) {
    return {
      city: 'Toronto',
      district: 'Scarborough',
      formattedAddress: 'Toronto, ON',
    };
  }

  // Calgary coordinates: ~51.04
  if (Math.abs(lat - 51.0447) < 0.2 && Math.abs(lng - -114.0719) < 0.2) {
    return {
      city: 'Calgary',
      district: 'Downtown',
      formattedAddress: 'Calgary, AB',
    };
  }

  // Default fallback based on closest known region
  if (lat > 30) {
    return {
      city: 'Calgary',
      district: 'SW Calgary',
      formattedAddress: 'Calgary, AB',
    };
  }

  return {
    city: 'Manila',
    district: 'Makati',
    formattedAddress: 'Makati, Manila',
  };
}
