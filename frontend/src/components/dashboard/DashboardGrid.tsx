import React, { Suspense, useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Group, Link } from '../../types';
import { GroupSection } from './GroupSection';
import { LinkCard } from './LinkCard';
import { useStore } from '../../store/useStore';
import { Loader2, AlertCircle, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { removeGroupFromDashboard, removeLinkFromDashboard } from '../../lib/dashboardData';

import { Button } from '../ui/button';
import {
  CollisionDetection,
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DraggableSyntheticListeners,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useI18n } from '../../lib/i18n';
import { loadIcons } from '@iconify/react';

const ManageGroupModal = React.lazy(async () => {
  const module = await import('../admin/ManageGroupModal');
  return { default: module.ManageGroupModal };
});

const ManageLinkModal = React.lazy(async () => {
  const module = await import('../admin/ManageLinkModal');
  return { default: module.ManageLinkModal };
});

// ==================================================
// Group Drop Indicator Line
// ==================================================
const GroupDropIndicator: React.FC = () => (
  <div className="relative flex items-center py-1 pointer-events-none select-none z-50">
    <div className="absolute left-0 w-3 h-3 rounded-full bg-primary shadow-[0_0_14px_4px_hsl(var(--primary)/0.7)] -translate-x-1/2 shrink-0" />
    <div className="h-[3px] w-full rounded-full bg-primary shadow-[0_0_16px_4px_hsl(var(--primary)/0.5)] animate-pulse" />
    <div className="absolute right-0 w-3 h-3 rounded-full bg-primary shadow-[0_0_14px_4px_hsl(var(--primary)/0.7)] translate-x-1/2 shrink-0" />
  </div>
);

// ==================================================
// Group Drag Overlay Preview
// ==================================================
const GroupDragOverlay: React.FC<{ group: Group }> = ({ group }) => {
  const { t } = useI18n();

  return (
    <div className="rounded-xl border border-primary/40 bg-card/80 backdrop-blur-sm p-4 md:p-5 shadow-2xl ring-2 ring-primary/30 pointer-events-none">
      <div className="flex items-center gap-2.5">
        <div className="p-1 rounded-md bg-muted text-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
        </div>
        <div className="h-6 w-1 bg-primary/70 rounded-full" />
        <span className="font-bold text-xl tracking-tight text-foreground">{group.title}</span>
        <span className="text-[10px] font-bold text-muted-foreground px-2 py-0.5 rounded-md bg-muted/50">
          {(group.links || []).length}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        {(group.links || []).slice(0, 6).map(link => (
          <div key={link.id} className="h-16 rounded-lg bg-muted/40 border border-border/30 animate-none" />
        ))}
        {(group.links || []).length > 6 && (
          <div className="h-16 rounded-lg bg-muted/20 border border-border/20 flex items-center justify-center text-xs text-muted-foreground font-medium">
            {t('dashboard.moreCount', { count: (group.links || []).length - 6 })}
          </div>
        )}
      </div>
    </div>
  );
};

const FavoritesPanel: React.FC<{
  activeCategory: string | null;
  allLinks: Link[];
  isAdmin: boolean;
  editMode: boolean;
  onEditLink: (link: Link) => void;
  onDeleteLink: (id: number) => void;
}> = ({ activeCategory, allLinks, isAdmin, editMode, onEditLink, onDeleteLink }) => {
  const { t } = useI18n();
  const favorites = useStore((state) => state.favorites);
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);

  if (!(activeCategory === 'all' || activeCategory === 'favorites' || !activeCategory) || favorites.length === 0) {
    return null;
  }

  const validFavorites = favorites
    .map((favId) => allLinks.find((link) => link.id === favId))
    .filter(Boolean) as Link[];

  if (validFavorites.length === 0) {
    return null;
  }

  return (
    <section className="favorites-panel rounded-[28px] border border-amber-400/10 bg-[linear-gradient(180deg,rgba(251,191,36,0.08),rgba(251,191,36,0.02))] p-5 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-5 w-1 rounded-full bg-amber-400/60" />
          <h2 className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-[0.18em] text-foreground/85">
            {t('dashboard.favorites')}
            <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold text-amber-400/75">
              {validFavorites.length}
            </span>
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setFavoritesExpanded((current) => !current)}
          className="favorites-toggle inline-flex items-center gap-2 rounded-full border border-amber-400/10 bg-black/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          {favoritesExpanded ? t('dashboard.hide') : t('dashboard.show')}
          {favoritesExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {favoritesExpanded && (
        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 md:gap-5">
          {validFavorites.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              isAdmin={isAdmin}
              editMode={editMode}
              onEdit={onEditLink}
              onDelete={onDeleteLink}
            />
          ))}
        </div>
      )}
    </section>
  );
};

const normalizeGroupLinks = (groups: Group[]): Group[] =>
  groups.map((group) => ({
    ...group,
    links: (group.links || []).map((link, index) => ({
      ...link,
      group_id: group.id,
      order: index,
    })),
  }));

// ==================================================
// Sortable Section Wrapper
// ==================================================
const SortableSection: React.FC<{
  group: Group;
  children: React.ReactNode;
}> = ({ group, children }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const placeholderRef = React.useRef<HTMLDivElement | null>(null);
  const lastHeightRef = React.useRef<number>(160);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `group-${group.id}` });

  // Measure the rendered height every time we are NOT dragging so the
  // placeholder accurately reflects the group's actual size.
  React.useLayoutEffect(() => {
    if (!isDragging && innerRef.current) {
      lastHeightRef.current = innerRef.current.offsetHeight;
    }
  });

  React.useLayoutEffect(() => {
    if (!containerRef.current) {
      return;
    }

    containerRef.current.style.transform = CSS.Translate.toString(transform) || '';
    containerRef.current.style.transition = transition || '';
  }, [transform, transition]);

  React.useLayoutEffect(() => {
    if (placeholderRef.current) {
      placeholderRef.current.style.height = `${lastHeightRef.current}px`;
    }
  }, [isDragging]);

  const setContainerNodeRef = React.useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setNodeRef(node);
  }, [setNodeRef]);

  return (
    <div ref={setContainerNodeRef} {...attributes}>
      {isDragging ? (
        <div
          ref={placeholderRef}
          className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5"
        />
      ) : (
        <div ref={innerRef}>
          {React.cloneElement(children as React.ReactElement<{ dragListeners?: DraggableSyntheticListeners }>, {
            dragListeners: listeners,
          })}
        </div>
      )}
    </div>
  );
};

// ==================================================
// Dashboard Grid
// ==================================================
export const DashboardGrid: React.FC = () => {
  const { t } = useI18n();
  const setGroups = useStore(state => state.setGroups);
  const editMode = useStore(state => state.editMode);
  const isAdmin = useStore(state => state.isAdmin);
  const searchQuery = useStore(state => state.searchQuery);
  const activeCategory = useStore(state => state.activeCategory);

  const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(null);
  const [activeDragGroup, setActiveDragGroup] = useState<Group | null>(null);
  const [localGroups, setLocalGroups] = useState<Group[]>([]);
  const [dragOverGroupId, setDragOverGroupId] = useState<number | null>(null);
  const [dragDirection, setDragDirection] = useState<'before' | 'after' | null>(null);
  const dragStartSnapshotRef = useRef<Group[]>([]);

  const queryClient = useQueryClient();

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [targetGroupId, setTargetGroupId] = useState<number | null>(null);

  const allLinks = React.useMemo(() => localGroups.flatMap((group) => group.links || []), [localGroups]);

  const { data: groups, isLoading, error } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      const res = await api.get<Group[]>('/dashboard/data');
      if (!Array.isArray(res.data)) return [];
      return res.data;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    structuralSharing: false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateLocalGroups = React.useCallback((nextGroups: Group[]) => {
    const normalizedGroups = normalizeGroupLinks(nextGroups);
    setLocalGroups(normalizedGroups);
    return normalizedGroups;
  }, []);

  const syncDashboardGroups = React.useCallback((nextGroups: Group[]) => {
    const normalizedGroups = normalizeGroupLinks(nextGroups);
    setLocalGroups(normalizedGroups);
    setGroups(normalizedGroups);
    queryClient.setQueryData(['dashboardData'], normalizedGroups);
    return normalizedGroups;
  }, [queryClient, setGroups]);

  const collisionDetection = React.useCallback<CollisionDetection>((args) => {
    const activeId = String(args.active.id);

    if (!activeId.startsWith('link-')) {
      return closestCenter(args);
    }

    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length === 0) {
      return closestCenter(args);
    }

    const sourceGroupId = Number(args.active.data.current?.groupId ?? NaN);

    const targetLinkCollision = pointerCollisions.find(({ id }) => String(id).startsWith('link-'));
    if (targetLinkCollision) {
      return [targetLinkCollision];
    }

    const targetGroupCollision = pointerCollisions.find(({ id }) => {
      const droppableId = String(id);
      if (!droppableId.startsWith('group-droppable-')) {
        return false;
      }

      const groupId = parseInt(droppableId.replace('group-droppable-', ''), 10);
      return Number.isNaN(sourceGroupId) || groupId !== sourceGroupId;
    });

    if (targetGroupCollision) {
      return [targetGroupCollision];
    }

    const currentGroupCollision = pointerCollisions.find(({ id }) => String(id).startsWith('group-droppable-'));
    if (currentGroupCollision) {
      return [currentGroupCollision];
    }

    return closestCenter(args);
  }, []);

  React.useEffect(() => {
    if (groups) {
      const normalizedGroups = normalizeGroupLinks(groups);
      setGroups(normalizedGroups);
      setLocalGroups(normalizedGroups);
    }
  }, [groups, setGroups]);

  // Preload all Iconify icons in a single batch request to prevent
  // frame-by-frame loading as individual <Icon> components fetch one by one.
  React.useEffect(() => {
    if (!groups || groups.length === 0) return;
    const iconSet = new Set<string>();
    for (const g of groups) {
      if (g.icon && !g.icon.startsWith('/') && !g.icon.startsWith('http') && !g.icon.startsWith('data:')) {
        iconSet.add(g.icon.includes(':') ? g.icon : `lucide:${g.icon.toLowerCase()}`);
      }
      for (const l of g.links || []) {
        if (l.icon && !l.icon.startsWith('/') && !l.icon.startsWith('http') && !l.icon.startsWith('data:')) {
          iconSet.add(l.icon.includes(':') ? l.icon : `lucide:${l.icon.toLowerCase()}`);
        }
      }
    }
    if (iconSet.size > 0) {
      loadIcons([...iconSet]);
    }
  }, [groups]);

  const handleEditGroup = React.useCallback((group: Group) => {
    setSelectedGroup(group);
    setIsGroupModalOpen(true);
  }, []);

  const handleCreateGroup = React.useCallback(() => {
    setSelectedGroup(null);
    setIsGroupModalOpen(true);
  }, []);

  const handleDeleteGroup = React.useCallback(async (id: number) => {
    if (!window.confirm(t('dashboard.deleteGroupConfirm'))) return;
    try {
      await api.delete(`/groups/${id}`);
      setLocalGroups((current) => removeGroupFromDashboard(current, id));
      queryClient.setQueryData<Group[]>(['dashboardData'], (current = []) => removeGroupFromDashboard(current, id));
    } catch (e) {
      console.error('Failed to delete group', e);
    }
  }, [queryClient, t]);

  const handleAddLink = React.useCallback((groupId: number) => {
    setSelectedLink(null);
    setTargetGroupId(groupId);
    setIsLinkModalOpen(true);
  }, []);

  const handleEditLink = React.useCallback((link: Link) => {
    setSelectedLink(link);
    setTargetGroupId(null);
    setIsLinkModalOpen(true);
  }, []);

  const handleDeleteLink = React.useCallback(async (id: number) => {
    if (!window.confirm(t('dashboard.deleteLinkConfirm'))) return;
    try {
      await api.delete(`/links/${id}`);
      setLocalGroups((current) => removeLinkFromDashboard(current, id));
      queryClient.setQueryData<Group[]>(['dashboardData'], (current = []) => removeLinkFromDashboard(current, id));
    } catch (e) {
      console.error('Failed to delete link', e);
    }
  }, [queryClient, t]);

  const handleDragStart = (event: DragStartEvent) => {
    const idStr = String(event.active.id);
    setActiveDragId(event.active.id);
    setDragOverGroupId(null);
    setDragDirection(null);
    dragStartSnapshotRef.current = localGroups;
    if (idStr.startsWith('group-')) {
      const groupId = parseInt(idStr.replace('group-', ''));
      setActiveDragGroup(localGroups.find(g => g.id === groupId) || null);
    } else {
      setActiveDragGroup(null);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // Groups: track drop indicator position
    if (activeIdStr.startsWith('group-')) {
      if (overIdStr.startsWith('group-') && !overIdStr.startsWith('group-droppable-')) {
        const activeGroupId = parseInt(activeIdStr.replace('group-', ''));
        const overGroupId = parseInt(overIdStr.replace('group-', ''));
        if (activeGroupId !== overGroupId) {
          const activeIndex = localGroups.findIndex(g => g.id === activeGroupId);
          const overIndex = localGroups.findIndex(g => g.id === overGroupId);
          if (activeIndex !== -1 && overIndex !== -1) {
            setDragOverGroupId(overGroupId);
            setDragDirection(activeIndex > overIndex ? 'before' : 'after');
          }
        } else {
          setDragOverGroupId(null);
          setDragDirection(null);
        }
      } else {
        setDragOverGroupId(null);
        setDragDirection(null);
      }
      return;
    }

    const activeLinkId = parseInt(activeIdStr.replace('link-', ''));

    let sourceGroupIndex = -1;
    localGroups.forEach((g, i) => {
      if (g.links?.some(l => l.id === activeLinkId)) sourceGroupIndex = i;
    });
    if (sourceGroupIndex === -1) return;

    if (overIdStr.startsWith('link-')) {
      const overLinkId = parseInt(overIdStr.replace('link-', ''));
      if (overLinkId === activeLinkId) return;

      let destGroupIndex = -1;
      localGroups.forEach((g, i) => {
        if (g.links?.some(l => l.id === overLinkId)) destGroupIndex = i;
      });
      if (destGroupIndex === -1) return;

      const sourceGroup = localGroups[sourceGroupIndex];
      const destGroup = localGroups[destGroupIndex];

      if (sourceGroupIndex === destGroupIndex) {
        // Same group: reorder live
        const currentLinks = [...(sourceGroup.links || [])];
        const oldIndex = currentLinks.findIndex(l => l.id === activeLinkId);
        const newIndex = currentLinks.findIndex(l => l.id === overLinkId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

        const reordered = arrayMove(currentLinks, oldIndex, newIndex);
        const updated = [...localGroups];
        updated[sourceGroupIndex] = { ...sourceGroup, links: reordered };
        updateLocalGroups(updated);
      } else {
        // Cross-group: move live
        if (destGroup.links?.some(l => l.id === activeLinkId)) return;
        const movedLink = sourceGroup.links!.find(l => l.id === activeLinkId)!;
        const newDestLinks = [...(destGroup.links || [])];
        const insertIndex = newDestLinks.findIndex(l => l.id === overLinkId);
        newDestLinks.splice(insertIndex >= 0 ? insertIndex : newDestLinks.length, 0, movedLink);
        const updated = localGroups.map((g, i) => {
          if (i === sourceGroupIndex) return { ...g, links: (g.links || []).filter(l => l.id !== activeLinkId) };
          if (i === destGroupIndex) return { ...g, links: newDestLinks };
          return g;
        });
        updateLocalGroups(updated);
      }
    } else if (overIdStr.startsWith('group-droppable-')) {
      const destGroupId = parseInt(overIdStr.replace('group-droppable-', ''));
      const destGroupIndex = localGroups.findIndex(g => g.id === destGroupId);
      if (destGroupIndex === -1 || sourceGroupIndex === destGroupIndex) return;
      if (localGroups[destGroupIndex].links?.some(l => l.id === activeLinkId)) return;
      const movedLink = localGroups[sourceGroupIndex].links!.find(l => l.id === activeLinkId)!;
      const updated = localGroups.map((g, i) => {
        if (i === sourceGroupIndex) return { ...g, links: (g.links || []).filter(l => l.id !== activeLinkId) };
        if (i === destGroupIndex) return { ...g, links: [...(g.links || []), movedLink] };
        return g;
      });
      updateLocalGroups(updated);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    setActiveDragGroup(null);
    setDragOverGroupId(null);
    setDragDirection(null);
    if (!localGroups.length) return;
    const { active, over } = event;
    const activeIdStr = String(active.id);

    // ── Link drag: localGroups already reflects final state from handleDragOver ──
    // Must be handled BEFORE the over.id guard because @dnd-kit/sortable can report
    // over.id === active.id after a live arrayMove, which would skip the API call.
    if (activeIdStr.startsWith('link-')) {
      const activeLinkId = parseInt(activeIdStr.replace('link-', ''));

      // Where did the link start?
      const snapshot = dragStartSnapshotRef.current;
      let sourceGroupIndex = -1;
      snapshot.forEach((g, i) => {
        if (g.links?.some(l => l.id === activeLinkId)) sourceGroupIndex = i;
      });
      if (sourceGroupIndex === -1) return;

      // Where is the link now?
      let destGroupIndex = -1;
      localGroups.forEach((g, i) => {
        if (g.links?.some(l => l.id === activeLinkId)) destGroupIndex = i;
      });
      if (destGroupIndex === -1) return;

      // Skip if nothing actually changed
      const snapshotLinks = snapshot[sourceGroupIndex]?.links || [];
      const currentLinks = localGroups[destGroupIndex]?.links || [];
      if (
        sourceGroupIndex === destGroupIndex &&
        snapshotLinks.map(l => l.id).join(',') === currentLinks.map(l => l.id).join(',')
      ) return;

      const normalizedGroups = syncDashboardGroups(localGroups);

      try {
        const destGroup = normalizedGroups[destGroupIndex];
        const destLinks = destGroup.links || [];
        const movedLink = destLinks.find(l => l.id === activeLinkId)!;
        const linkOrder = destLinks.findIndex(l => l.id === activeLinkId);

        if (sourceGroupIndex !== destGroupIndex) {
          await api.put(`/links/${activeLinkId}`, {
            group_id: destGroup.id,
            title: movedLink.title, url: movedLink.url,
            description: movedLink.description || '', icon: movedLink.icon || '',
            order: linkOrder,
          });
          const srcLinks = normalizedGroups[sourceGroupIndex].links || [];
          if (srcLinks.length > 0) await api.put('/reorder/links', srcLinks.map((l, i) => ({ id: l.id, order: i })));
        }
        await api.put('/reorder/links', destLinks.map((l, i) => ({ id: l.id, order: i })));
      } catch (err) {
        console.error('Failed to save link reorder:', err);
        syncDashboardGroups(dragStartSnapshotRef.current);
      }
      return;
    }

    // ── Group reordering: compute final position from snapshot + over.id ──
    if (!over || active.id === over.id) return;

    if (activeIdStr.startsWith('group-')) {
      const activeGroupId = parseInt(activeIdStr.replace('group-', ''));
      const overIdStr = String(over.id);

      let resolvedOverGroupId: number | null = null;
      if (overIdStr.startsWith('group-') && !overIdStr.startsWith('group-droppable-')) {
        resolvedOverGroupId = parseInt(overIdStr.replace('group-', ''));
      } else if (overIdStr.startsWith('link-')) {
        const overLinkId = parseInt(overIdStr.replace('link-', ''));
        const ownerGroup = dragStartSnapshotRef.current.find(g => g.links?.some(l => l.id === overLinkId));
        if (ownerGroup) resolvedOverGroupId = ownerGroup.id;
      } else if (overIdStr.startsWith('group-droppable-')) {
        resolvedOverGroupId = parseInt(overIdStr.replace('group-droppable-', ''));
      }

      if (!resolvedOverGroupId || activeGroupId === resolvedOverGroupId) return;

      const snapshot = dragStartSnapshotRef.current;
      const oldIndex = snapshot.findIndex(g => g.id === activeGroupId);
      const newIndex = snapshot.findIndex(g => g.id === resolvedOverGroupId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const newOrder = arrayMove(snapshot, oldIndex, newIndex);
      syncDashboardGroups(newOrder);
      try {
        await api.put('/reorder/groups', newOrder.map((g, i) => ({ id: g.id, order: i })));
      } catch (err) {
        console.error('Failed to reorder groups:', err);
        syncDashboardGroups(dragStartSnapshotRef.current);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-destructive">
        <AlertCircle className="h-10 w-10 mb-4" />
        <p className="text-lg font-medium">{t('dashboard.loadFailed')}</p>
        <p className="text-sm text-muted-foreground">{t('dashboard.checkBackend')}</p>
      </div>
    );
  }

  const showDragHandles = isAdmin && editMode;

  const sectionContent = (group: Group) => (
    <GroupSection
      key={group.id}
      group={group}
      isAdmin={isAdmin}
      editMode={editMode}
      searchQuery={searchQuery}
      onEditGroup={handleEditGroup}
      onDeleteGroup={handleDeleteGroup}
      onAddLink={handleAddLink}
      onEditLink={handleEditLink}
      onDeleteLink={handleDeleteLink}
    />
  );

  // The active dragged link (for DragOverlay)
  const activeDragLink = activeDragId
    ? localGroups.flatMap(g => g.links || []).find(l => `link-${l.id}` === String(activeDragId))
    : null;

  return (
    <div className="space-y-4">

      {isAdmin && editMode && (
        <div className="flex justify-end pb-3 border-b border-border/50">
          <Button onClick={handleCreateGroup} className="gap-2 font-bold uppercase tracking-widest text-xs" variant="premium">
            <Plus className="h-4 w-4" />
            {t('dashboard.newGroup')}
          </Button>
        </div>
      )}

      {(() => {
        let displayGroups = localGroups;
        if (activeCategory === 'favorites') {
          displayGroups = [];
        } else if (activeCategory && activeCategory !== 'all') {
          displayGroups = displayGroups.filter(g => g.title === activeCategory);
        }

        const showDraggable = showDragHandles && displayGroups.length > 1;

        let emptyState = null;
        if (displayGroups.length === 0 && activeCategory !== 'favorites') {
          if (!groups || groups.length === 0) {
            emptyState = (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
                <h3 className="text-lg font-semibold text-muted-foreground">{t('dashboard.noGroupsFound')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t('dashboard.loginAsAdmin')}</p>
              </div>
            );
          }
        }

        const allLinkIds: string[] = displayGroups.flatMap(g => (g.links || []).map(l => `link-${l.id}`));
        const allGroupIds: string[] = displayGroups.map(g => `group-${g.id}`);

        const renderGroups = (groupsToRender: Group[]) => {
          const result: React.ReactNode[] = [];
          groupsToRender.forEach((group) => {
            // Drop indicator BEFORE this group
            if (showDraggable && activeDragGroup && dragOverGroupId === group.id && dragDirection === 'before') {
              result.push(<GroupDropIndicator key={`di-before-${group.id}`} />);
            }
            result.push(
              showDraggable ? (
                <SortableSection key={group.id} group={group}>
                  {sectionContent(group)}
                </SortableSection>
              ) : (
                <div key={group.id}>{sectionContent(group)}</div>
              )
            );
            // Drop indicator AFTER this group
            if (showDraggable && activeDragGroup && dragOverGroupId === group.id && dragDirection === 'after') {
              result.push(<GroupDropIndicator key={`di-after-${group.id}`} />);
            }
          });
          return result;
        };

        const dashboardContent = (
          <div className="space-y-8 md:space-y-10">
            <FavoritesPanel
              activeCategory={activeCategory}
              allLinks={allLinks}
              isAdmin={isAdmin}
              editMode={editMode}
              onEditLink={handleEditLink}
              onDeleteLink={handleDeleteLink}
            />
            {emptyState}
            <div className="space-y-8 md:space-y-9">
              {renderGroups(displayGroups)}
            </div>
          </div>
        );

        if (isAdmin && editMode) {
          return (
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetection}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              {/* Group sortable context (for group reorder) */}
              <SortableContext items={allGroupIds} strategy={verticalListSortingStrategy}>
                {/* Link sortable context flat across all groups (enables cross-group DnD) */}
                <SortableContext items={allLinkIds} strategy={rectSortingStrategy}>
                  {dashboardContent}
                </SortableContext>
              </SortableContext>

              {/* Drag overlay for visual feedback while dragging */}
              <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
                {activeDragGroup ? (
                  <div className="opacity-[0.82] scale-[1.02] shadow-2xl rotate-1">
                    <GroupDragOverlay group={activeDragGroup} />
                  </div>
                ) : activeDragLink ? (
                  <div className="opacity-90 rotate-2 scale-105 shadow-2xl pointer-events-none">
                    <LinkCard
                      link={activeDragLink}
                      isAdmin={false}
                      editMode={false}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          );
        }

        return dashboardContent;
      })()}

      <Suspense fallback={null}>
        {isGroupModalOpen ? (
          <ManageGroupModal
            isOpen={isGroupModalOpen}
            onClose={() => setIsGroupModalOpen(false)}
            group={selectedGroup}
          />
        ) : null}
        {isLinkModalOpen ? (
          <ManageLinkModal
            isOpen={isLinkModalOpen}
            onClose={() => setIsLinkModalOpen(false)}
            link={selectedLink}
            initialGroupId={targetGroupId}
          />
        ) : null}
      </Suspense>
    </div>
  );
};


