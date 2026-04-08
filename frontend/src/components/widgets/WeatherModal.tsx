import React from 'react';
import { X, Wind, Droplets, Sunrise, Sunset, Gauge } from 'lucide-react';
import { cn } from '../../lib/utils';
import { WeatherData } from '../../hooks/useWeather';
import { useI18n } from '../../lib/i18n';

interface WeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: WeatherData | null;
}

export const WeatherModal: React.FC<WeatherModalProps> = ({ isOpen, onClose, data }) => {
  const { t } = useI18n();

  if (!isOpen || !data) return null;

  const { current, forecast, todayTimeline, details } = data;
  const timelineSlots = [
    { key: 'morning' as const, label: t('weather.timelineMorning'), time: '07:00' },
    { key: 'midday' as const, label: t('weather.timelineMidday'), time: '13:00' },
    { key: 'evening' as const, label: t('weather.timelineEvening'), time: '19:00' },
    { key: 'night' as const, label: t('weather.timelineNight'), time: '23:00' },
  ];

  // Pick today entry (index 0) to show min temp in header
  const today = forecast[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/65 backdrop-blur-lg animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="glass-card w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 relative z-10 flex flex-col max-h-[90vh]">

        {/* ── Hero Header ──────────────────────────────────────────────── */}
        <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-primary/10 via-transparent to-transparent border-b border-border/50 overflow-hidden shrink-0">
          {/* subtle glow blob */}
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              {/* Big current icon */}
              <div className="h-20 w-20 flex items-center justify-center drop-shadow-2xl shrink-0">
                <current.icon className="w-full h-full" />
              </div>
              <div>
                <div className="flex items-end gap-2">
                  <span className="text-6xl font-black text-foreground tabular-nums leading-none">
                    {current.temp}°
                  </span>
                  <span className="text-lg text-muted-foreground/60 font-bold pb-1">C</span>
                </div>
                <p className="text-base font-bold text-primary mt-1">{current.description}</p>
                <p className="text-xs text-muted-foreground/50 font-semibold mt-0.5 uppercase tracking-widest">
                  Frankfurt · {current.isDay ? t('weather.daytime') : t('weather.nighttime')}
                </p>
                {today && (
                  <p className="text-xs text-muted-foreground/40 mt-1 tabular-nums">
                    ↑ {today.tempMax}° / ↓ {today.tempMin}°
                  </p>
                )}
              </div>
            </div>

            <button 
              onClick={onClose}
              title={t('weather.close')}
              className="p-2 hover:bg-secondary rounded-xl transition-colors text-muted-foreground hover:text-foreground active:scale-90 shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Sunrise / Sunset strip */}
          <div className="flex items-center gap-6 mt-5 pt-4 border-t border-border/30">
            <div className="flex items-center gap-1.5 text-amber-400/80">
              <Sunrise className="h-4 w-4" />
              <span className="text-xs font-bold tabular-nums">{details.sunrise}</span>
            </div>
            <div className="flex items-center gap-1.5 text-orange-400/70">
              <Sunset className="h-4 w-4" />
              <span className="text-xs font-bold tabular-nums">{details.sunset}</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-400/70 ml-auto">
              <Droplets className="h-4 w-4" />
              <span className="text-xs font-bold">{details.rainProb}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400/70">
              <Wind className="h-4 w-4" />
              <span className="text-xs font-bold tabular-nums">{details.windSpeed} km/h</span>
            </div>
            <div className="flex items-center gap-1.5 text-yellow-400/70">
              <Gauge className="h-4 w-4" />
              <span className="text-xs font-bold">UV {details.uvIndex}</span>
            </div>
          </div>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">

          {/* Today Timeline — 4 slots */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 mb-3">{t('weather.titleToday')}</h3>
            <div className="grid grid-cols-4 gap-3">
              {timelineSlots.map((slot, i) => {
                const slotData = todayTimeline[slot.key];
                const isNow = (() => {
                  const h = new Date().getHours();
                  if (slot.key === 'morning')  return h >= 5  && h < 12;
                  if (slot.key === 'midday')   return h >= 12 && h < 17;
                  if (slot.key === 'evening')  return h >= 17 && h < 21;
                  return h >= 21 || h < 5;
                })();
                return (
                  <TimelineCard
                    key={slot.key}
                    label={slot.label}
                    time={slot.time}
                    temp={slotData.temp}
                    icon={slotData.icon}
                    isActive={isNow}
                    delay={i * 60}
                  />
                );
              })}
            </div>
          </div>

          {/* 7-Day Forecast */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 mb-3">{t('weather.titleForecast')}</h3>
            <div className="space-y-2">
              {forecast.slice(0, 7).map((item, idx) => (
                <ForecastRow key={idx} item={item} isToday={idx === 0} delay={idx * 40} todayLabel={t('weather.today')} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const TimelineCard = ({
  label, time, temp, icon: Icon, isActive, delay
}: {
  label: string; time: string; temp: number; icon: React.ElementType; isActive: boolean; delay: number;
}) => {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-300",
        isActive
          ? "bg-primary/15 border-primary/30 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.3)] scale-[1.03]"
          : "bg-secondary/10 border-white/5 hover:bg-secondary/20 hover:border-white/10"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {isActive && (
        <span className="text-[9px] font-black uppercase tracking-widest text-primary px-1.5 py-0.5 bg-primary/20 rounded-full -mt-1 mb-0.5">
          {t('weather.now')}
        </span>
      )}
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{label}</span>
      <span className="text-[9px] text-muted-foreground/30 tabular-nums">{time}</span>
      <div className="h-9 w-9 flex items-center justify-center my-0.5">
        <Icon className="w-full h-full" />
      </div>
      <span className="text-lg font-black text-foreground tabular-nums">{temp}°</span>
    </div>
  );
};

type ForecastItem = WeatherData['forecast'][number];
const ForecastRow = ({ item, isToday, delay, todayLabel }: { item: ForecastItem; isToday: boolean; delay: number; todayLabel: string }) => (
  <div
    className={cn(
      "flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all duration-300 group",
      isToday
        ? "bg-primary/10 border-primary/20"
        : "bg-secondary/5 border-white/5 hover:bg-secondary/15 hover:border-white/10"
    )}
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* Day */}
    <span className={cn(
      "w-8 text-xs font-black uppercase",
      isToday ? "text-primary" : "text-muted-foreground/70"
    )}>
      {isToday ? todayLabel : item.day}
    </span>

    {/* Icon */}
    <div className="h-8 w-8 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
      <item.icon className="w-full h-full" />
    </div>

    {/* Description */}
    <span className="flex-1 text-xs text-muted-foreground/50 font-semibold truncate">
      {item.description}
    </span>

    {/* Rain */}
    {item.rainProb !== undefined && (
      <div className="flex items-center gap-1 text-blue-400/70 text-[10px] font-bold tabular-nums w-10 justify-end">
        <Droplets className="h-3 w-3 shrink-0" />
        {item.rainProb}%
      </div>
    )}

    {/* Temps */}
    <div className="flex items-center gap-2 tabular-nums text-right ml-2">
      <span className="text-sm font-black text-foreground/90">{item.tempMax}°</span>
      <span className="text-xs font-bold text-muted-foreground/35">{item.tempMin}°</span>
    </div>
  </div>
);
