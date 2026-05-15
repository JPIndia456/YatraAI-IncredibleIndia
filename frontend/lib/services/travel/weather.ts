/**
 * WeatherAPI.com Service
 * Provides free real-time weather data for travel destinations.
 * Sign up at https://www.weatherapi.com/ to get a free key.
 */

export const WeatherService = {
  async getCurrentWeather(city: string) {
    try {
      const apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
      if (!apiKey || apiKey === 'YOUR_WEATHER_API_KEY') {
        throw new Error('API Key Missing');
      }

      const response = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(city)}&aqi=no`
      );
      if (!response.ok) throw new Error('API Response Error');
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
      console.warn('[WeatherService] Failed to fetch weather, using fallback:', err);
      // Fallback for Indian destinations
      const isHilly = /Srinagar|Manali|Leh|Shimla|Munnar/i.test(city);
      const isCoastal = /Goa|Mumbai|Kerala|Chennai|Puducherry/i.test(city);
      return {
        temp: isHilly ? 18 : (isCoastal ? 28 : 24),
        condition: 'Partly Cloudy',
        icon: '//cdn.weatherapi.com/weather/64x64/day/116.png',
        humidity: 65,
        wind: 12,
        feelsLike: 26,
      };
    }
  },

  async getForecast(city: string, days: number = 3) {
    try {
      const apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
      if (!apiKey || apiKey === 'YOUR_WEATHER_API_KEY') {
        throw new Error('API Key Missing');
      }

      const response = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(city)}&days=${days}&aqi=no&alerts=no`
      );
      if (!response.ok) throw new Error('API Response Error');
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
      console.warn('[WeatherService] Failed to fetch forecast, using fallback:', err);
      return Array.from({ length: days }).map((_, i) => ({
        date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
        maxTemp: 28,
        minTemp: 22,
        condition: 'Sunny',
        icon: '//cdn.weatherapi.com/weather/64x64/day/113.png',
        chanceOfRain: 5
      }));
    }
  }
};
