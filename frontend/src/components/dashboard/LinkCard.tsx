import React from 'react';
import { Trash2, Star } from 'lucide-react';

import { Link } from '../../types';
import { DynamicIcon } from '../ui/DynamicIcon';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useStore } from '../../store/useStore';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../ui/tooltip';
import { cn } from '../../lib/utils';
import { useI18n } from '../../lib/i18n';

export interface LinkCardProps {
  link: Link;
  isAdmin: boolean;
  editMode: boolean;
  onEdit?: (link: Link) => void;
  onDelete?: (id: number) => void;
}

const LinkCardComponent: React.FC<LinkCardProps> = ({ 
  link, 
  isAdmin, 
  editMode,
  onEdit, 
  onDelete
}) => {
  const { t } = useI18n();
  const isFavorite = useStore((state) => state.favorites.includes(link.id));
  const toggleFavorite = useStore((state) => state.toggleFavorite);
  const hostname = React.useMemo(() => {
    try {
      return new URL(link.url).hostname.replace(/^www\./, '');
    } catch {
      return link.url;
    }
  }, [link.url]);

  const handleTileClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (editMode) {
      if (isAdmin) {
        onEdit?.(link);
      }
      return;
    }

    window.open(link.url, '_blank', 'noopener,noreferrer');
  };

  const handleTileKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();

      if (editMode) {
        if (isAdmin) {
          onEdit?.(link);
        }
        return;
      }

      window.open(link.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    void toggleFavorite(link.id);
  };

  return (
    <Card 
      onClick={handleTileClick}
      onKeyDown={handleTileKeyDown}
      role={editMode ? 'button' : 'link'}
      tabIndex={0}
      className={cn(
        "link-card group relative flex h-full w-full cursor-pointer flex-col justify-between p-5",
        "transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out",
        "hover:-translate-y-1 hover:shadow-[0_18px_30px_-18px_hsl(var(--glow)/0.28)]",
        "hover:border-primary/25 hover:bg-[hsl(var(--glass-highlight)/0.05)]",
        "focus-within:ring-2 focus-within:ring-primary/30 focus-within:outline-none",
        "border-[hsl(var(--glass-border)/0.06)]",
        isFavorite && "border-amber-400/25 bg-amber-400/[0.035] shadow-[0_0_18px_-8px_rgba(251,191,36,0.18)]"
      )}
    >
      <div className="absolute top-2 right-2 z-30 flex items-center gap-1">
        {editMode && isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md text-muted-foreground hover:bg-black/40 hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete?.(link.id); }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}

        <button
          onClick={handleToggleFavorite}
          className={cn(
            "p-1 rounded-full transition-all duration-200",
            isFavorite 
              ? "text-amber-400 opacity-100 hover:scale-110 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]" 
              : "text-muted-foreground/10 opacity-0 group-hover:opacity-100 hover:text-amber-400 hover:bg-amber-400/10"
          )}
          title={isFavorite ? t('linkCard.removeFromFavorites') : t('linkCard.addToFavorites')}
        >
          <Star className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
        </button>
      </div>

      <div className="flex items-start justify-between gap-3 pr-24">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-[hsl(var(--glass-border)/0.06)] bg-[hsl(var(--glass-highlight)/0.04)] transition-colors duration-200 group-hover:bg-primary/10">
          <DynamicIcon 
            icon={link.icon} 
            className="h-9 w-9 text-muted-foreground transition-colors duration-200 group-hover:text-primary" 
          />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 mt-5 flex w-full flex-1 flex-col justify-end gap-3 px-1 text-left">
        <h3 className="w-full overflow-hidden text-ellipsis text-base font-semibold leading-tight text-foreground transition-colors duration-200 line-clamp-2 group-hover:text-primary">
          {link.title}
        </h3>
        
        {link.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground/75">
            {link.description}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate max-w-full cursor-default">{hostname}</span>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              sideOffset={8}
              className="max-w-[280px] break-all rounded-md border border-border/60 bg-background/90 px-2 py-1 text-[10px] font-medium tracking-normal text-muted-foreground shadow-lg"
            >
              {hostname}
            </TooltipContent>
          </Tooltip>
          <span className="text-primary/0 transition-colors duration-200 group-hover:text-primary/75">
            {editMode && isAdmin ? t('common.edit') : t('common.open')}
          </span>
        </div>
      </div>

    </Card>
  );
};

// Custom comparison function for React.memo
const arePropsEqual = (prev: LinkCardProps, next: LinkCardProps) => {
  if (prev.isAdmin !== next.isAdmin) return false;
  // editMode only matters if it changed. 
  // If editMode changed, we MUST re-render to show/hide admin controls or enable/disable clicks
  if (prev.editMode !== next.editMode) return false;

  // Check link object fields one by one to avoid shallow reference issues
  if (prev.link.id !== next.link.id) return false;
  if (prev.link.title !== next.link.title) return false;
  if (prev.link.url !== next.link.url) return false;
  if (prev.link.icon !== next.link.icon) return false;
  if (prev.link.description !== next.link.description) return false;

  // Ignore handler reference changes (assuming they are stable or don't affect render output if other props are same)
  // But strictly speaking, if a handler changes, it might be a new closure. 
  // The user requirement says "All handlers passed into LinkCard MUST be wrapped in useCallback".
  // So we assume handlers are stable. If they are not equal, it usually means the parent re-rendered.
  // We can ignore handler changes if we trust the parent is doing its job, OR we can check them.
  // Given the instruction "Ignore: global store values not directly used by this card", 
  // and "Ignore: handler changes" isn't explicitly said but implied by optimization goals.
  // The safest for performance is to NOT re-render just because a handler reference changed, 
  // UNLESS we think the closure captured stale variables. 
  // Since we pass all relevant data as props (`link`, `isFavorite`, etc.), the handlers shouldn't suffer from stale closures 
  // provided they accept arguments (like `link` or `id`) rather than closing over them.
  // The handlers onEdit(link), onDelete(id), onToggleFavorite(id) accept args.
  // So we can safely ignore handler reference changes.
  
  return true; 
};

export const LinkCard = React.memo(LinkCardComponent, arePropsEqual);
