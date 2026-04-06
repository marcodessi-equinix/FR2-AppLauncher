import React from 'react';
import { LayoutGrid, Star } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { DynamicIcon } from '../ui/DynamicIcon';
import { cn } from '../../lib/utils';
import { VersionChangelogDialog } from './VersionChangelogDialog';
import { getLatestChangelogEntry } from '../../lib/changelog';

export const Dock: React.FC = () => {
  const groups = useStore((state) => state.groups);
  const activeCategory = useStore((state) => state.activeCategory);
  const setActiveCategory = useStore((state) => state.setActiveCategory);
  const favorites = useStore((state) => state.favorites);
  const version = getLatestChangelogEntry()?.version || import.meta.env.VITE_APP_VERSION || __APP_VERSION__ || 'v0.1.0';
  const buildDate = __BUILD_DATE__;
  const [isVersionDialogOpen, setIsVersionDialogOpen] = React.useState(false);

  const handleVersionDialogChange = React.useCallback((open: boolean) => {
    setIsVersionDialogOpen(open);
  }, []);

  const handleCategoryClick = (category: string | null) => {
    setActiveCategory(category);
  };

  const categories = React.useMemo(() => {
    return groups.map(g => ({
      id: `group-${g.id}`,
      title: g.title,
      icon: g.icon || 'Folder', 
    }));
  }, [groups]);

  return (
    <div className="dock-bar fixed bottom-0 left-0 right-0 z-50 border-t border-[hsl(var(--glass-border)/0.1)] bg-background/70 backdrop-blur-lg">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[hsl(var(--glass-highlight)/0.1)] to-transparent" />
      
      <div className="flex h-12 items-center px-3 md:px-[clamp(16px,2vw,32px)] w-full gap-3">
        {/* Left: Scrollable Categories */}
        <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-1 flex-nowrap">
          <DockItem 
            icon={LayoutGrid} 
            label="All Apps" 
            isActive={activeCategory === 'all' || activeCategory === null}
            onClick={() => handleCategoryClick('all')}
          />

          {favorites.length > 0 && (
            <DockItem 
              icon={Star} 
              label="Favorites" 
              isActive={activeCategory === 'favorites'}
              onClick={() => handleCategoryClick('favorites')}
              className="text-amber-400 hover:text-amber-300"
            />
          )}

          <div className="h-5 w-[1px] bg-[hsl(var(--glass-border)/0.08)] mx-1 shrink-0" />

          {categories.map((cat) => (
            <DockItem
              key={cat.id}
              label={cat.title}
              isActive={activeCategory === cat.title}
              onClick={() => handleCategoryClick(cat.title)}
              iconName={typeof cat.icon === 'string' ? cat.icon : undefined}
            />
          ))}
        </div>

        {/* Right: Version */}
        <div className="hidden md:flex items-center pl-3 border-l border-[hsl(var(--glass-border)/0.08)] shrink-0">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleVersionDialogChange(true)}
                className="relative flex items-center gap-2 rounded-full border border-[hsl(var(--glass-border)/0.08)] bg-[hsl(var(--glass-highlight)/0.03)] px-2.5 py-1.5 text-muted-foreground/70 transition-colors hover:border-primary/20 hover:text-foreground"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
                <span className="text-[9px] font-bold uppercase tracking-[0.22em]">{version}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={12} className="font-bold text-xs tracking-wider">
              Versionshinweise anzeigen
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <VersionChangelogDialog
        isOpen={isVersionDialogOpen}
        onOpenChange={handleVersionDialogChange}
        currentVersion={version}
        buildDate={buildDate}
      />
    </div>
  );
};

interface DockItemProps {
  icon?: React.ElementType;
  iconName?: string;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  className?: string;
}

const DockItem: React.FC<DockItemProps> = ({ icon: Icon, iconName, label, isActive, onClick, className }) => {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          data-active={isActive ? 'true' : 'false'}
          className={cn(
            "dock-item relative group flex items-center justify-center h-9 min-w-[2.5rem] px-3 rounded-full transition-all duration-200 shrink-0",
            isActive 
              ? "bg-primary/12 text-foreground ring-1 ring-primary/15 shadow-[0_0_16px_-10px_hsl(var(--glow)/0.55)]" 
            : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--glass-highlight)/0.04)] border border-transparent dock-item-inactive",
            className
          )}
        >
          {isActive && (
             <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-5 h-[2px] bg-primary/50 rounded-b-full" />
          )}
          
          <div className={cn("transition-transform duration-200 flex items-center gap-1.5", isActive && "scale-[1.02]")}>
             <DynamicIcon 
               icon={iconName} 
               fallback={Icon ? <Icon className="h-4 w-4" /> : <DynamicIcon icon="Folder" className="h-4 w-4" />}
               className="h-4 w-4 stroke-[2.5px]"
             />
             {isActive && <span className="text-[10px] font-bold tracking-[0.18em] uppercase hidden sm:block whitespace-nowrap">{label}</span>}
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={12} className={cn("font-bold text-xs tracking-wider", isActive && "sm:hidden")}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
};
