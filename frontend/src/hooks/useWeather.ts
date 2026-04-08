import { useState, useEffect } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { getLocale, translate, useI18n } from '../lib/i18n';
import type { PreferredLanguage } from '../store/useStore';
import { 
  SunIcon, 
  MoonIcon,
  CloudIcon,
  NightCloudIcon,
  CloudRainIcon, 
  CloudSnowIcon, 
  CloudLightningIcon, 
  CloudDrizzleIcon, 
  CloudFogIcon,
  UnknownIcon 
} from '../components/widgets/WeatherIcons';

type WeatherIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface WeatherApiResponse {
  current: {
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    is_day: number; // 1 = day, 0 = night
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    is_day: number[]; // 1 = day, 0 = night per hour
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max?: number[];
    uv_index_max?: number[];
    sunrise?: string[];
    sunset?: string[];
  };
}

export interface WeatherData {
  current: {
    temp: number;
    code: number;
    windSpeed: number;
    icon: WeatherIconComponent;
    description: string;
    color: string;
    isDay: boolean;
  };
  todayTimeline: {
    morning: { temp: number; icon: WeatherIconComponent; time: string };
    midday:   { temp: number; icon: WeatherIconComponent; time: string };
    evening:  { temp: number; icon: WeatherIconComponent; time: string };
    night:    { temp: number; icon: WeatherIconComponent; time: string };
  };
  forecast: {
    day: string;
    tempMax: number;
    tempMin: number;
    icon: WeatherIconComponent;
    description: string;
    rainProb?: number;
    uvIndex?: number;
    color: string;
  }[];
  details: {
    windSpeed: number;
    rainProb: number;
    uvIndex: number;
    sunrise: string;
    sunset: string;
  };
}

// WMO Weather interpretation codes – isDay switches between day and night icons
const getWeatherIconAndDesc = (code: number, language: PreferredLanguage, isDay = true) => {
  if (code === 0) return { icon: isDay ? SunIcon : MoonIcon, desc: translate(language, isDay ? 'weather.sunny' : 'weather.clear'), color: '' };
  if (code === 1) return { icon: isDay ? SunIcon : NightCloudIcon, desc: translate(language, 'weather.mostlyClear'), color: '' };
  if (code === 2 || code === 3) return { icon: isDay ? CloudIcon : NightCloudIcon, desc: translate(language, 'weather.cloudy'), color: '' };
  if (code === 45 || code === 48) return { icon: CloudFogIcon, desc: translate(language, 'weather.foggy'), color: '' };
  if (code >= 51 && code <= 55) return { icon: CloudDrizzleIcon, desc: translate(language, 'weather.drizzle'), color: '' };
  if (code >= 61 && code <= 65) return { icon: CloudRainIcon, desc: translate(language, 'weather.rain'), color: '' };
  if (code >= 71 && code <= 77) return { icon: CloudSnowIcon, desc: translate(language, 'weather.snow'), color: '' };
  if (code >= 80 && code <= 82) return { icon: CloudRainIcon, desc: translate(language, 'weather.showers'), color: '' };
  if (code >= 85 && code <= 86) return { icon: CloudSnowIcon, desc: translate(language, 'weather.snowShowers'), color: '' };
  if (code >= 95 && code <= 99) return { icon: CloudLightningIcon, desc: translate(language, 'weather.thunderstorm'), color: '' };
  return { icon: UnknownIcon, desc: translate(language, 'weather.unknown'), color: '' };
};

export const useWeather = () => {
  const { language } = useI18n();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      // Frankfurt am Main Coordinates
      const lat = 50.1109;
      const lon = 8.6821;
      
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,weather_code,wind_speed_10m,is_day` +
        `&hourly=temperature_2m,weather_code,is_day` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset` +
        `&timezone=Europe%2FBerlin`
      );
      
      if (!res.ok) throw new Error('Failed to fetch weather data');
      
      const data = await res.json() as WeatherApiResponse;
      const locale = getLocale(language);
      
      // Parse Current — use is_day flag for correct icon
      const currentCode = data.current.weather_code;
      const currentIsDay = data.current.is_day === 1;
      const currentInfo = getWeatherIconAndDesc(currentCode, language, currentIsDay);

      // Parse Timeline — find the actual hour index for today's date
      // Open-Meteo hourly arrays start at hour 0 of the first day, so we need
      // to find the offset for today to get the right slots.
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
      const firstHourStr = data.hourly.time[0].slice(0, 10); // "YYYY-MM-DD"
      const dayOffset = Math.round(
        (new Date(todayStr).getTime() - new Date(firstHourStr).getTime()) / (1000 * 60 * 60 * 24)
      );
      const baseIdx = dayOffset * 24; // index of hour 0 today

      const getSlot = (hour: number) => {
        const idx = baseIdx + hour;
        return {
          temp: Math.round(data.hourly.temperature_2m[idx] ?? data.hourly.temperature_2m[hour]),
          icon: getWeatherIconAndDesc(
            data.hourly.weather_code[idx] ?? data.hourly.weather_code[hour],
            language,
            (data.hourly.is_day[idx] ?? (hour >= 6 && hour < 20) ? 1 : 0) === 1
          ).icon,
        };
      };

      const morningSlot  = getSlot(7);   // 07:00
      const middaySlot   = getSlot(13);  // 13:00
      const eveningSlot  = getSlot(19);  // 19:00
      const nightSlot    = getSlot(23);  // 23:00

      const timeline = {
        morning: { ...morningSlot, time: '07:00' },
        midday:  { ...middaySlot,  time: '13:00' },
        evening: { ...eveningSlot, time: '19:00' },
        night:   { ...nightSlot,   time: '23:00' },
      };

      // Parse 7-Day Forecast — day icons always use day=true (daytime representative)
      const forecast = data.daily.time.map((dateStr: string, idx: number) => {
        const date = new Date(dateStr);
        const dayName = date.toLocaleDateString(locale, { weekday: 'short' });
        const code = data.daily.weather_code[idx];
        const info = getWeatherIconAndDesc(code, language, true); // daily = daytime icon
        
        return {
          day: dayName,
          tempMax: Math.round(data.daily.temperature_2m_max[idx]),
          tempMin: Math.round(data.daily.temperature_2m_min[idx]),
          icon: info.icon,
          description: info.desc,
          color: info.color,
          rainProb: data.daily.precipitation_probability_max?.[idx],
          uvIndex: data.daily.uv_index_max?.[idx]
        };
      });

      // Format sunrise/sunset for today
      const formatTime = (isoStr: string | undefined) => {
        if (!isoStr) return '--';
        return new Date(isoStr).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      };

      setWeather({
        current: {
          temp: Math.round(data.current.temperature_2m),
          code: currentCode,
          windSpeed: data.current.wind_speed_10m,
          icon: currentInfo.icon,
          description: currentInfo.desc,
          color: currentInfo.color,
          isDay: currentIsDay
        },
        todayTimeline: timeline,
        forecast: forecast,
        details: {
          windSpeed: data.current.wind_speed_10m,
          rainProb: data.daily.precipitation_probability_max?.[0] || 0,
          uvIndex: data.daily.uv_index_max?.[0] || 0,
          sunrise: formatTime(data.daily.sunrise?.[0]),
          sunset: formatTime(data.daily.sunset?.[0]),
        }
      });
      setLoading(false);

    } catch (err) {
      console.error(err);
      setError('Failed to load weather data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    // Auto-refresh every 30 mins
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [language]);

  return { weather, loading, error };
};
