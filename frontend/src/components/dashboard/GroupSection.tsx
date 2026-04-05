import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { DraggableSyntheticListeners } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

import { LinkCard } from './LinkCard';
import { Link, Group } from '../../types';
import { Button } from '../ui/button';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { cn } from '../../lib/utils';

interface GroupSectionProps {
  group: Group;
  isAdmin: boolean;
  editMode: boolean;
  favorites: number[];
  searchQuery: string;
  onEditGroup: (group: Group) => void;
  onDeleteGroup: (id: number) => void;
  onAddLink: (groupId: number) => void;
  onEditLink: (link: Link) => void;
  onDeleteLink: (id: number) => void;
  onToggleFavorite: (id: number) => void;
  dragListeners?: DraggableSyntheticListeners;
}

// Sortable Link Card Wrapper
const SortableLinkCard = React.memo(({ link, isAdmin, editMode, isFavorite, onEdit, onDelete, onToggleFavorite }: { 
  link: Link; 
  isAdmin: boolean;
  editMode: boolean;
  isFavorite: boolean;
  onEdit: (link: Link) => void;
  onDelete: (id: number) => void;
  onToggleFavorite: (id: number) => void;
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `link-${link.id}`, disabled: !editMode, data: { groupId: link.group_id } });

  React.useLayoutEffect(() => {
    if (!containerRef.current) {
      return;
    }

    containerRef.current.style.transform = CSS.Translate.toString(transform) || '';
    containerRef.current.style.transition = transition || '';
    containerRef.current.style.opacity = isDragging ? '0.3' : '1';
    containerRef.current.style.height = '100%';
    containerRef.current.style.zIndex = isDragging ? '50' : 'auto';
    containerRef.current.style.position = isDragging ? 'relative' : '';
  }, [isDragging, transform, transition]);

  const setContainerNodeRef = React.useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setNodeRef(node);
  }, [setNodeRef]);

  return (
    <div ref={setContainerNodeRef} {...attributes} {...listeners}>
      <LinkCard
        link={link}
        isFavorite={isFavorite}
        isAdmin={isAdmin}
        editMode={editMode}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleFavorite={onToggleFavorite}
      />
    </div>
  );
});

export const GroupSection: React.FC<GroupSectionProps> = ({
  group,
  isAdmin,
  editMode,
  favorites,
  searchQuery,
  onEditGroup,
  onDeleteGroup,
  onAddLink,
  onEditLink,
  onDeleteLink,
  onToggleFavorite,
  dragListeners
}) => {
  const { setNodeRef, active, isOver } = useDroppable({
    id: `group-droppable-${group.id}`,
    data: { groupId: group.id }
  });

  // Handled globally in DashboardGrid

  // Filter links
  const filteredLinks = useMemo(() => {
    const links = group.links || [];

    if (!searchQuery) return links;

    const lowerQuery = searchQuery.toLowerCase();
    // If group title matches, show all, unless filtered by exclusion
    if (group.title.toLowerCase().includes(lowerQuery)) return links;

    // Otherwise filter links
    return links.filter(l => 
      l.title.toLowerCase().includes(lowerQuery) || 
      (l.url && l.url.toLowerCase().includes(lowerQuery))
    );
  }, [group.links, searchQuery, group.title]);

  // Handled globally in DashboardGrid

  if (filteredLinks.length === 0 && (!isAdmin || searchQuery)) {
    return null;
  }

  return (
    <section 
      ref={setNodeRef}
      className={cn(
        "group-section relative flex flex-col gap-5 rounded-[28px] border border-[hsl(var(--glass-border)/0.07)] bg-[linear-gradient(180deg,hsl(var(--card)/0.62),hsl(var(--card)/0.34))] p-5 md:p-6 transition-all duration-300",
        active?.id === `group-droppable-${group.id}` && "opacity-50",
        isOver && active && String(active.id).startsWith('link-') && "ring-2 ring-primary/40 bg-primary/5 border-primary/30"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {editMode && isAdmin && (
            <div 
              className="cursor-move rounded-xl border border-[hsl(var(--glass-border)/0.06)] bg-[hsl(var(--glass-highlight)/0.03)] p-1.5 text-muted-foreground/50 transition-colors hover:text-foreground"
                {...dragListeners}
            >
               <GripVertical className="h-4 w-4" />
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-1 rounded-full bg-primary/45" />
            <h3 className="text-lg font-semibold tracking-tight text-foreground md:text-[1.15rem]">
              {group.title}
            </h3>
            <span className="rounded-full border border-[hsl(var(--glass-border)/0.07)] bg-[hsl(var(--glass-highlight)/0.03)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
               {filteredLinks.length}
            </span>
          </div>
        </div>

        {isAdmin && editMode && (
          <div className="flex items-center gap-1 rounded-full border border-[hsl(var(--glass-border)/0.07)] bg-[hsl(var(--glass-highlight)/0.02)] px-1.5 py-1 transition-opacity duration-200">
             <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEditGroup(group)}>
               <Edit className="h-3.5 w-3.5" />
             </Button>
             <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDeleteGroup(group.id)}>
               <Trash2 className="h-3.5 w-3.5" />
             </Button>
             <div className="w-px h-4 bg-border/50 mx-1" />
             <Button variant="outline" size="sm" className="h-7 gap-1.5 text-[10px] font-medium" onClick={() => onAddLink(group.id)}>
               <Plus className="h-3 w-3" />
               Link
             </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn(
        "min-h-[40px]",
        filteredLinks.length === 0 && "flex items-center justify-center text-muted-foreground border-dashed border rounded-lg border-muted h-[80px]"
      )}>
        {filteredLinks.length === 0 ? (
           <p className="text-xs font-medium">No links in this group</p>
        ) : (
          <>
            {editMode && isAdmin ? (
                 <SortableContext 
                   items={filteredLinks.map(l => `link-${l.id}`)}
                   strategy={rectSortingStrategy}
                 >
                   <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 md:gap-5">
                     {filteredLinks.map(link => (
                       <SortableLinkCard 
                         key={link.id}
                         link={link} 
                         isAdmin={isAdmin}
                         editMode={editMode}
                         isFavorite={favorites.includes(link.id)}
                         onEdit={onEditLink}
                         onDelete={onDeleteLink}
                         onToggleFavorite={onToggleFavorite}
                       />
                     ))}
                   </div>
                 </SortableContext>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 md:gap-5">
                   {filteredLinks.map(link => (
                     <LinkCard
                       key={link.id}
                       link={link}
                       isFavorite={favorites.includes(link.id)}
                       isAdmin={isAdmin}
                       editMode={editMode}
                       onEdit={onEditLink}
                       onDelete={onDeleteLink}
                       onToggleFavorite={onToggleFavorite}
                     />
                   ))}
                </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

