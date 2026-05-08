
const RAPIDAPI_KEY = process.env.TRIPADVISOR_RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.TRIPADVISOR_RAPIDAPI_HOST;

/**
 * TripAdvisor Service via RapidAPI
 * Provides real-time data for hotels, restaurants, and attractions.
 */
export const TripAdvisorService = {
  async fetchFromRapidAPI(endpoint: string, params: Record<string, string>) {
    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
      console.warn("TripAdvisor RapidAPI credentials missing.");
      return null;
    }

    const url = new URL(`https://${RAPIDAPI_HOST}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': RAPIDAPI_HOST,
        },
      });

      if (!response.ok) {
        throw new Error(`TripAdvisor API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("TripAdvisor Service Error:", error);
      return null;
    }
  },

  /**
   * Search for a location to get its location_id
   */
  async searchLocation(query: string) {
    const data = await this.fetchFromRapidAPI('/auto-complete', { q: query });
    // Usually returns a list of locations. We take the first one.
    return data?.data?.[0];
  },

  /**
   * Search for hotels in a location
   */
  async searchHotels(locationId: string, checkin?: string, checkout?: string) {
    const params: any = { location_id: locationId };
    if (checkin) params.checkin = checkin;
    if (checkout) params.checkout = checkout;
    
    const data = await this.fetchFromRapidAPI('/hotels/search', params);
    return data?.data || [];
  },

  /**
   * Search for restaurants in a location
   */
  async searchRestaurants(locationId: string) {
    const data = await this.fetchFromRapidAPI('/restaurants/search', { location_id: locationId });
    return data?.data || [];
  },

  /**
   * Search for attractions in a location
   */
  async searchAttractions(locationId: string) {
    const data = await this.fetchFromRapidAPI('/attraction/search', { location_id: locationId });
    return data?.data || [];
  }
};
