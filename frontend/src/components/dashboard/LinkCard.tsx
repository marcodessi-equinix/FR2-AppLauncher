import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Star } from 'lucide-react';
import { toggleFavorite, isFavorite } from '../../utils/favoritesStorage';

import { Link } from '../../types';
import { DynamicIcon } from '../ui/DynamicIcon';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn } from '../../lib/utils';

export interface LinkCardProps {
  link: Link;
  isFavorite: boolean;
  isAdmin: boolean;
  editMode: boolean;
  onEdit?: (link: Link) => void;
  onDelete?: (id: number) => void;
  onToggleFavorite: (id: number) => void;
}

const LinkCardComponent: React.FC<LinkCardProps> = ({ 
  link, 
  isFavorite: initialIsFavorite, 
  isAdmin, 
  editMode,
  onEdit, 
  onDelete,
  onToggleFavorite 
}) => {
  const [favorite, setFavorite] = useState(initialIsFavorite);

  useEffect(() => {
    const syncFavorite = () => {
      setFavorite(isFavorite(link.id));
    };

    window.addEventListener("favoritesUpdated", syncFavorite);

    return () => {
      window.removeEventListener("favoritesUpdated", syncFavorite);
    };
  }, [link.id]);
  
  const handleTileClick = (e: React.MouseEvent) => {
    if (editMode) return; 
    
    e.preventDefault();
    window.open(link.url, '_blank', 'noopener,noreferrer');
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedFavs = toggleFavorite(link.id);
    setFavorite(updatedFavs.includes(link.id));
    onToggleFavorite(link.id);
  };

  return (
    <Card 
      onClick={handleTileClick}
      className={cn(
        "group relative flex flex-col items-center justify-center p-5 cursor-pointer h-full w-full",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_hsl(var(--glow)/0.15)]",
        "hover:border-primary/25 hover:bg-secondary/80",
        "focus-within:ring-2 focus-within:ring-primary/30 focus-within:outline-none",
        "border-transparent",
        favorite && "border-amber-400/20 bg-amber-400/[0.03] shadow-[0_0_12px_-4px_rgba(251,191,36,0.15)]"
      )}
    >
      {/* Favorite Star */}
      <button
        onClick={handleToggleFavorite}
        className={cn(
          "absolute top-2 right-2 p-1 rounded-full transition-all duration-200 z-20",
          favorite 
            ? "text-amber-400 opacity-100 hover:scale-110 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]" 
            : "text-muted-foreground/10 opacity-0 group-hover:opacity-100 hover:text-amber-400 hover:bg-amber-400/10"
        )}
        title={favorite ? "Remove from Favorites" : "Add to Favorites"}
      >
        <Star className={cn("h-3.5 w-3.5", favorite && "fill-current")} />
      </button>
      
      {/* Icon */}
      <div className="flex-shrink-0 h-14 w-14 flex items-center justify-center rounded-xl glass-surface group-hover:bg-primary/10 transition-colors duration-200 mb-3">
        <DynamicIcon 
          icon={link.icon} 
          className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors duration-200" 
        />
      </div>

      {/* Content */}
      <div className="text-center w-full px-1 relative z-10 flex flex-col gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <h3 className="text-sm font-semibold text-foreground leading-tight group-hover:text-primary transition-colors duration-200 line-clamp-2 overflow-hidden text-ellipsis w-full">
              {link.title}
            </h3>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px] break-words text-center">
            {link.title}
          </TooltipContent>
        </Tooltip>
        
        {link.description && (
          <p className="text-xs text-muted-foreground/70 line-clamp-1 leading-relaxed font-medium">
            {link.description}
          </p>
        )}
      </div>

      {/* Admin Controls */}
       {editMode && isAdmin && (
          <div className="absolute top-1.5 left-1.5 flex gap-0.5 opacity-100 z-30">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-black/40 rounded-md"
              onClick={(e) => { e.stopPropagation(); onEdit?.(link); }}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-black/40 rounded-md"
              onClick={(e) => { e.stopPropagation(); onDelete?.(link.id); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
    </Card>
  );
};

// Custom comparison function for React.memo
const arePropsEqual = (prev: LinkCardProps, next: LinkCardProps) => {
  // Check primitive props and simple values
  if (prev.isFavorite !== next.isFavorite) return false;
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
