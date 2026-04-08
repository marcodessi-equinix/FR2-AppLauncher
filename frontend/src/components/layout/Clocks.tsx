import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../../lib/i18n';

export const LiveClock: React.FC = () => {
    const [time, setTime] = useState(new Date());
    const { locale } = useI18n();

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Cache Intl.DateTimeFormat objects — creating them is expensive
    // and they were previously recreated every second via toLocaleTimeString/toLocaleDateString.
    const timeFormatter = useMemo(
        () => new Intl.DateTimeFormat(locale, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        [locale]
    );
    const dateFormatter = useMemo(
        () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        [locale]
    );

    return (
        <div className="flex items-center gap-2.5 px-2">
            <div className="flex flex-col items-end gap-0.5">
                <span className="text-lg font-bold tabular-nums leading-none text-primary tracking-tight">
                    {timeFormatter.format(time)}
                </span>
                <span className="text-[11px] text-foreground/80 uppercase tracking-wider font-semibold hidden xl:inline">
                    {dateFormatter.format(time)}
                </span>
            </div>
        </div>
    );
};
