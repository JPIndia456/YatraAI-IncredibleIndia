/**
 * WeatherAPI.com Service
 * Provides free real-time weather data for travel destinations.
 * Sign up at https://www.weatherapi.com/ to get a free key.
 */

export const WeatherService = {
  async getCurrentWeather(city: string) {
    const apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
    if (!apiKey || apiKey === 'YOUR_WEATHER_API_KEY') return null;

    try {
      const response = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(city)}&aqi=no`
      );
      if (!response.ok) return null;
      const data = await response.json();
      
      return {
        temp: data.current.temp_c,
        condition: data.current.condition.text,
        icon: data.current.condition.icon,
        humidity: data.current.humidity,
        wind: data.current.wind_kph,
        feelsLike: data.current.feelslike_c,
      };
    } catch (err) {
      console.warn('[WeatherService] Failed to fetch weather:', err);
      return null;
    }
  },

  async getForecast(city: string, days: number = 3) {
    const apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
    if (!apiKey || apiKey === 'YOUR_WEATHER_API_KEY') return null;

    try {
      const response = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(city)}&days=${days}&aqi=no&alerts=no`
      );
      if (!response.ok) return null;
      const data = await response.json();
      
      return data.forecast.forecastday.map((d: any) => ({
        date: d.date,
        maxTemp: d.day.maxtemp_c,
        minTemp: d.day.mintemp_c,
        condition: d.day.condition.text,
        icon: d.day.condition.icon,
        chanceOfRain: d.day.daily_chance_of_rain,
      }));
    } catch (err) {
      console.warn('[WeatherService] Failed to fetch forecast:', err);
      return null;
    }
  }
};
