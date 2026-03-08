import React, { useState, useEffect, useRef } from 'react';
import { getFavorites } from '../../utils/favoritesStorage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Group, Link } from '../../types';
import { GroupSection } from './GroupSection';
import { LinkCard } from './LinkCard';
import { useStore } from '../../store/useStore';
import { Loader2, AlertCircle, Plus } from 'lucide-react';

import { ManageGroupModal } from '../admin/ManageGroupModal';
import { ManageLinkModal } from '../admin/ManageLinkModal';
import { Button } from '../ui/button';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
const GroupDragOverlay: React.FC<{ group: Group }> = ({ group }) => (
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
          +{(group.links || []).length - 6} more
        </div>
      )}
    </div>
  </div>
);

// ==================================================
// Sortable Section Wrapper
// ==================================================
const SortableSection: React.FC<{
  group: Group;
  children: React.ReactNode;
}> = ({ group, children }) => {
  const innerRef = React.useRef<HTMLDivElement>(null);
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

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {isDragging ? (
        <div
          className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5"
          style={{ height: `${lastHeightRef.current}px` }}
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
  const setGroups = useStore(state => state.setGroups);
  const editMode = useStore(state => state.editMode);
  const isAdmin = useStore(state => state.isAdmin);
  const searchQuery = useStore(state => state.searchQuery);
  const activeCategory = useStore(state => state.activeCategory);

  const [localFavorites, setLocalFavorites] = useState<number[]>(getFavorites());
  const [, setFavTrigger] = useState(false);
  const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(null);
  const [activeDragGroup, setActiveDragGroup] = useState<Group | null>(null);
  const [localGroups, setLocalGroups] = useState<Group[]>([]);
  const [dragOverGroupId, setDragOverGroupId] = useState<number | null>(null);
  const [dragDirection, setDragDirection] = useState<'before' | 'after' | null>(null);
  const dragStartSnapshotRef = useRef<Group[]>([]);

  useEffect(() => {
    const handler = () => {
      setLocalFavorites(getFavorites());
      setFavTrigger(prev => !prev);
    };
    window.addEventListener("favoritesUpdated", handler);
    return () => window.removeEventListener("favoritesUpdated", handler);
  }, []);

  const queryClient = useQueryClient();

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [targetGroupId, setTargetGroupId] = useState<number | null>(null);

  const { data: groups, isLoading, error } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      const res = await api.get<Group[]>('/dashboard/data');
      if (!Array.isArray(res.data)) return [];
      return res.data;
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  React.useEffect(() => {
    if (groups) {
      setGroups(groups);
      setLocalGroups(groups);
    }
  }, [groups, setGroups]);

  const handleEditGroup = React.useCallback((group: Group) => {
    setSelectedGroup(group);
    setIsGroupModalOpen(true);
  }, []);

  const handleCreateGroup = React.useCallback(() => {
    setSelectedGroup(null);
    setIsGroupModalOpen(true);
  }, []);

  const handleDeleteGroup = React.useCallback(async (id: number) => {
    if (!window.confirm('Delete this group and all its links?')) return;
    try {
      await api.delete(`/groups/${id}`);
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
    } catch (e) {
      console.error('Failed to delete group', e);
    }
  }, [queryClient]);

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
    if (!window.confirm('Delete this link?')) return;
    try {
      await api.delete(`/links/${id}`);
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
    } catch (e) {
      console.error('Failed to delete link', e);
    }
  }, [queryClient]);

  const handleToggleFavorite = React.useCallback((_id: number) => {}, []);

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
        setLocalGroups(updated);
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
        setLocalGroups(updated);
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
      setLocalGroups(updated);
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

      setGroups(localGroups);
      queryClient.setQueryData(['dashboardData'], localGroups);

      try {
        const destGroup = localGroups[destGroupIndex];
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
          const srcLinks = localGroups[sourceGroupIndex].links || [];
          if (srcLinks.length > 0) await api.put('/reorder/links', srcLinks.map((l, i) => ({ id: l.id, order: i })));
        }
        await api.put('/reorder/links', destLinks.map((l, i) => ({ id: l.id, order: i })));
      } catch (err) {
        console.error('Failed to save link reorder:', err);
        setLocalGroups(dragStartSnapshotRef.current);
        queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
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
      setLocalGroups(newOrder);
      setGroups(newOrder);
      queryClient.setQueryData(['dashboardData'], newOrder);
      try {
        await api.put('/reorder/groups', newOrder.map((g, i) => ({ id: g.id, order: i })));
      } catch (err) {
        console.error('Failed to reorder groups:', err);
        setLocalGroups(dragStartSnapshotRef.current);
        queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
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
        <p className="text-lg font-medium">Failed to load AppLauncher data</p>
        <p className="text-sm text-muted-foreground">Check backend connection</p>
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
      favorites={localFavorites}
      searchQuery={searchQuery}
      onEditGroup={handleEditGroup}
      onDeleteGroup={handleDeleteGroup}
      onAddLink={handleAddLink}
      onEditLink={handleEditLink}
      onDeleteLink={handleDeleteLink}
      onToggleFavorite={handleToggleFavorite}
    />
  );

  // The active dragged link (for DragOverlay)
  const activeDragLink = activeDragId
    ? localGroups.flatMap(g => g.links || []).find(l => `link-${l.id}` === String(activeDragId))
    : null;

  return (
    <div className="space-y-4 animate-in fade-in duration-700">

      {isAdmin && editMode && (
        <div className="flex justify-end pb-3 border-b border-border/50">
          <Button onClick={handleCreateGroup} className="gap-2 font-bold uppercase tracking-widest text-xs" variant="premium">
            <Plus className="h-4 w-4" />
            New Group
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
                <h3 className="text-lg font-semibold text-muted-foreground">No groups found</h3>
                <p className="text-sm text-muted-foreground mt-1">Log in as admin to create your first group.</p>
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

        const renderFavorites = () => {
          if (!(activeCategory === 'all' || activeCategory === 'favorites' || !activeCategory) || localFavorites.length === 0) return null;
          const validFavorites = localFavorites
            .map(favId => groups?.flatMap(g => g.links || []).find(l => l.id === favId))
            .filter(Boolean) as Link[];
          if (validFavorites.length === 0) return null;

          return (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-1 bg-amber-400/60 rounded-full" />
                <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-foreground/80 flex items-center gap-2.5">
                  Favoriten
                  <span className="text-[10px] font-bold text-amber-400/70 px-2 py-0.5 rounded-md bg-amber-400/10">
                    {validFavorites.length}
                  </span>
                </h2>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
                {validFavorites.map(link => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    isFavorite={true}
                    isAdmin={isAdmin}
                    editMode={editMode}
                    onEdit={handleEditLink}
                    onDelete={handleDeleteLink}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            </div>
          );
        };

        const dashboardContent = (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
            {renderFavorites()}
            {emptyState}
            {renderGroups(displayGroups)}
          </div>
        );

        if (isAdmin && editMode) {
          return (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
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
                      isFavorite={localFavorites.includes(activeDragLink.id)}
                      isAdmin={false}
                      editMode={false}
                      onToggleFavorite={() => {}}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          );
        }

        return dashboardContent;
      })()}

      <ManageGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        group={selectedGroup}
      />
      <ManageLinkModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        link={selectedLink}
        initialGroupId={targetGroupId}
      />
    </div>
  );
};


