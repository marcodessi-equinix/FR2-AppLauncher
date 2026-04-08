import React, { useState, useEffect, useMemo } from 'react';
import { GripVertical } from 'lucide-react';
// import { cn } from '../../lib/utils';
import { Card } from '../ui/card';
import { useStore } from '../../store/useStore';
import api from '../../lib/api';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useI18n } from '../../lib/i18n';

// ==================================================
// Timezone Definitions
// ==================================================
interface TimezoneEntry {
  id: string;
  city: string;
  timezone: string;
  flag: string;
}

const ALL_TIMEZONES: TimezoneEntry[] = [
  { id: 'frankfurt', city: 'Frankfurt', timezone: 'Europe/Berlin', flag: '🇩🇪' },
  { id: 'london', city: 'London', timezone: 'Europe/London', flag: '🇬🇧' },
  { id: 'newyork', city: 'New York', timezone: 'America/New_York', flag: '🇺🇸' },
  { id: 'dubai', city: 'Dubai', timezone: 'Asia/Dubai', flag: '🇦🇪' },
  { id: 'mumbai', city: 'Mumbai', timezone: 'Asia/Kolkata', flag: '🇮🇳' },
  { id: 'singapore', city: 'Singapore', timezone: 'Asia/Singapore', flag: '🇸🇬' },
  { id: 'tokyo', city: 'Tokyo', timezone: 'Asia/Tokyo', flag: '🇯🇵' },
  { id: 'sydney', city: 'Sydney', timezone: 'Australia/Sydney', flag: '🇦🇺' },
];

// ==================================================
// Compact Time Card
// ==================================================
interface CompactTimeCardProps {
  entry: TimezoneEntry;
  time: Date;
  dragHandle?: React.ReactNode;
}

const CompactTimeCard: React.FC<CompactTimeCardProps> = React.memo(({ entry, time, dragHandle }) => {
  const { locale } = useI18n();

  // Cache Intl.DateTimeFormat — creating them is expensive and they were
  // previously recreated every second for all 8 timezone cards.
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { timeZone: entry.timezone, hour: '2-digit', minute: '2-digit' }),
    [locale, entry.timezone]
  );
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { timeZone: entry.timezone, weekday: 'short', day: '2-digit', month: 'short' }),
    [locale, entry.timezone]
  );

  const timeString = timeFormatter.format(time);
  const dateString = dateFormatter.format(time);

  return (
    <Card className="relative group p-3 flex items-center gap-3 transition-colors duration-300 overflow-hidden h-[60px]">
      {dragHandle}
      <span className="text-lg leading-none select-none">{entry.flag}</span>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 leading-none truncate">
          {entry.city}
        </span>
        <span className="text-[9px] text-muted-foreground/30 leading-tight mt-0.5">{dateString}</span>
      </div>
      <span className="text-lg font-black tabular-nums text-foreground tracking-tight leading-none">
        {timeString}
      </span>
    </Card>
  );
});

// ==================================================
// Sortable Wrapper
// ==================================================
const SortableTimezone: React.FC<{
  entry: TimezoneEntry;
  time: Date;
  showHandle: boolean;
}> = ({ entry, time, showHandle }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto' as const,
  };

  const dragHandle = showHandle ? (
    <button
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors touch-none"
    >
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  ) : undefined;

  return (
    <div ref={setNodeRef} style={style}>
      <CompactTimeCard entry={entry} time={time} dragHandle={dragHandle} />
    </div>
  );
};

// ==================================================
// Widget Grid
// ==================================================
export const WidgetGrid: React.FC = () => {
  const isAdmin = useStore((state) => state.isAdmin);
  const editMode = useStore((state) => state.editMode);
  const [time, setTime] = useState(new Date());
  const [orderedIds, setOrderedIds] = useState<string[]>(ALL_TIMEZONES.map((t) => t.id));
  const [loaded, setLoaded] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Live clock — single shared interval
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load saved order from backend
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<string[]>('/reorder/timezones');
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          // Merge: keep saved order, append any new timezones not in saved order
          const savedSet = new Set(res.data);
          const newIds = ALL_TIMEZONES.map((t) => t.id).filter((id) => !savedSet.has(id));
          setOrderedIds([...res.data.filter((id) => ALL_TIMEZONES.some((t) => t.id === id)), ...newIds]);
        }
      } catch {
        // Use default order
      }
      setLoaded(true);
    };
    load();
  }, []);

  const orderedTimezones = orderedIds
    .map((id) => ALL_TIMEZONES.find((t) => t.id === id))
    .filter((t): t is TimezoneEntry => t !== undefined);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedIds.indexOf(active.id as string);
    const newIndex = orderedIds.indexOf(over.id as string);
    const newOrder = arrayMove(orderedIds, oldIndex, newIndex);
    setOrderedIds(newOrder);

    try {
      await api.put('/reorder/timezones', newOrder);
    } catch (err) {
      console.error('Failed to save timezone order:', err);
    }
  };

  if (!loaded) return null;

  const showHandles = isAdmin && editMode;

  return (
    <div className="mb-6">
      {showHandles ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
            >
              {orderedTimezones.map((entry) => (
                <SortableTimezone
                  key={entry.id}
                  entry={entry}
                  time={time}
                  showHandle={showHandles}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
        >
          {orderedTimezones.map((entry) => (
            <CompactTimeCard key={entry.id} entry={entry} time={time} />
          ))}
        </div>
      )}
    </div>
  );
};
