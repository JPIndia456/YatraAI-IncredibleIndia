
const RAPIDAPI_KEY = process.env.BOOKING_RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.BOOKING_RAPIDAPI_HOST;

/**
 * Booking.com Service via RapidAPI
 * Provides real-time data for hotels, car rentals, and taxis.
 */
export const BookingService = {
  async fetchFromRapidAPI(endpoint: string, params: Record<string, string>) {
    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
      console.warn("Booking.com RapidAPI credentials missing.");
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
        throw new Error(`Booking.com API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Booking.com Service Error:", error);
      return null;
    }
  },

  /**
   * Search for a destination to get dest_id and dest_type
   */
  async searchDestination(query: string) {
    const data = await this.fetchFromRapidAPI('/api/v1/hotels/searchDestination', { query });
    return data?.data?.[0];
  },

  /**
   * Search for hotels
   */
  async searchHotels(params: {
    dest_id: string;
    dest_type: string;
    checkin_date: string;
    checkout_date: string;
    adults_number?: number;
  }) {
    return this.fetchFromRapidAPI('/api/v1/hotels/searchHotels', {
      dest_id: params.dest_id,
      dest_type: params.dest_type,
      checkin_date: params.checkin_date,
      checkout_date: params.checkout_date,
      adults_number: (params.adults_number || 1).toString(),
      units: 'metric',
      room_number: '1',
      locale: 'en-gb',
    });
  },

  /**
   * Search for car rentals
   */
  async searchCarRentals(params: {
    pick_up_latitude: string;
    pick_up_longitude: string;
    drop_off_latitude: string;
    drop_off_longitude: string;
    pick_up_date: string;
    pick_up_time: string;
    drop_off_date: string;
    drop_off_time: string;
  }) {
    return this.fetchFromRapidAPI('/api/v1/cars/searchCarRentals', {
      pick_up_latitude: params.pick_up_latitude,
      pick_up_longitude: params.pick_up_longitude,
      drop_off_latitude: params.drop_off_latitude,
      drop_off_longitude: params.drop_off_longitude,
      pick_up_date: params.pick_up_date,
      pick_up_time: params.pick_up_time,
      drop_off_date: params.drop_off_date,
      drop_off_time: params.drop_off_time,
      driver_age: '30',
      currency_code: 'INR',
    });
  }
};
