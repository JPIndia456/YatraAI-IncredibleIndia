
const RAPIDAPI_KEY = process.env.GOOGLE_FLIGHTS_RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.GOOGLE_FLIGHTS_RAPIDAPI_HOST;

/**
 * Google Flights Service via RapidAPI
 * Provides real-time flight offers and pricing.
 */
export const GoogleFlightsService = {
  async fetchFromRapidAPI(endpoint: string, params: Record<string, string>) {
    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
      console.warn("Google Flights RapidAPI credentials missing.");
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
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Google Flights API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Google Flights Service Error:", error);
      return null;
    }
  },

  /**
   * Search for flights (One Way)
   */
  async searchFlightsOneWay(params: {
    origin: string;
    destination: string;
    date: string;
    adults?: number;
    currency?: string;
  }) {
    return this.fetchFromRapidAPI('/api/v1/flights/search-one-way', {
      origin: params.origin,
      destination: params.destination,
      date: params.date,
      adults: (params.adults || 1).toString(),
      currency: params.currency || 'INR',
    });
  },

  /**
   * Search for flights (Round Trip)
   */
  async searchFlightsRoundTrip(params: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate: string;
    adults?: number;
    currency?: string;
  }) {
    return this.fetchFromRapidAPI('/api/v1/flights/search-round-trip', {
      origin: params.origin,
      destination: params.destination,
      departureDate: params.departureDate,
      returnDate: params.returnDate,
      adults: (params.adults || 1).toString(),
      currency: params.currency || 'INR',
    });
  }
};
