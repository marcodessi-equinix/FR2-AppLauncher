import React, { useState, useEffect } from 'react';

export const LiveClock: React.FC = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex items-center gap-2.5 px-2">
            <div className="flex flex-col items-end gap-0.5">
                <span className="text-lg font-bold tabular-nums leading-none text-primary tracking-tight">
                    {time.toLocaleTimeString('de-DE', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="text-[11px] text-foreground/80 uppercase tracking-wider font-semibold hidden xl:inline">
                    {time.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
            </div>
        </div>
    );
};
