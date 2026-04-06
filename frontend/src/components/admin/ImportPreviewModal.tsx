import React, { useState, useCallback, useEffect } from 'react';
import { X, Folder, Link as LinkIcon, ChevronRight, ChevronDown, Trash2, ArrowRight, Plus, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { cn } from '../../lib/utils';
import { executeImport, ImportPreviewData, ParsedGroup, ParsedLink } from '../../lib/api';
import { useStore } from '../../store/useStore';
import { useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  MeasuringStrategy
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// --- Types ---
interface UILink extends ParsedLink {
    id: string; // unique ID for DnD
    selected?: boolean;
    isDuplicate?: boolean; // URL already exists in current app
}

interface UIGroup extends ParsedGroup {
    id: string; // unique ID for DnD
    links: UILink[];
    isExpanded?: boolean;
    isTarget?: boolean; 
}

interface ImportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: ImportPreviewData | null;
}

// --- Draggable Link Component ---
const DraggableLink = React.memo(({ link, group, onSelect, onDelete, isGhosted }: { link: UILink; group: UIGroup; onSelect?: () => void; onDelete?: () => void; isGhosted?: boolean }) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: link.id,
        data: { link, sourceGroup: group }
    });

    React.useLayoutEffect(() => {
        if (!containerRef.current) {
            return;
        }

        containerRef.current.style.transform = transform ? (CSS.Translate.toString(transform) ?? '') : '';
    }, [transform]);

    const setContainerNodeRef = React.useCallback((node: HTMLDivElement | null) => {
        containerRef.current = node;
        setNodeRef(node);
    }, [setNodeRef]);

    return (
        <div 
            ref={setContainerNodeRef} 
            {...listeners}
            {...attributes}
            className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-[border-color,background-color,opacity,box-shadow] duration-150 group relative cursor-grab active:cursor-grabbing touch-none",
                isDragging ? "opacity-20 bg-primary/20 border-primary/40 z-50 shadow-lg" : "border-transparent hover:border-white/10 hover:bg-white/[0.04]",
                isGhosted && !isDragging ? "opacity-30" : "",
                link.isDuplicate ? "bg-amber-400/5 border-amber-400/20 hover:border-amber-400/30" :
                link.selected ? "bg-primary/8 border-primary/20" : ""
            )}
        >
            {/* Drag grip visual */}
            <div className="shrink-0 opacity-0 group-hover:opacity-40 transition-opacity">
                <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" className="text-muted-foreground">
                    <circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/>
                    <circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
                    <circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/>
                </svg>
            </div>

            {/* Selection Checkbox */}
            <input 
                type="checkbox" 
                title={`Select link ${link.title}`}
                aria-label={`Select link ${link.title}`}
                checked={!!link.selected} 
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                    e.stopPropagation();
                    onSelect?.();
                }}
                className="h-3.5 w-3.5 shrink-0 rounded border-white/20 bg-black/20 text-primary focus:ring-primary cursor-pointer"
            />

            {/* Icon */}
            <div className="w-6 h-6 shrink-0 rounded-md flex items-center justify-center bg-white/5 border border-white/[0.06]">
                {link.icon ? (
                    <img src={link.icon} className="w-4 h-4 rounded-sm" alt="" onError={(e) => e.currentTarget.style.display = 'none'} />
                ) : (
                    <LinkIcon className="h-3 w-3 text-muted-foreground/40" />
                )}
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold truncate text-foreground/90">{link.title}</span>
                    {link.isDuplicate && (
                        <span title="Bereits in der App vorhanden" className="inline-flex items-center gap-0.5 text-[8px] font-bold text-amber-400 bg-amber-400/15 border border-amber-400/25 px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider">
                            <AlertTriangle className="h-2 w-2" />
                            Duplikat
                        </span>
                    )}
                </div>
                <div className="text-[9px] text-muted-foreground/35 truncate">{link.url}</div>
            </div>
            
            {group.isTarget && (
                <button
                    type="button"
                    title={`Remove link ${link.title}`}
                    aria-label={`Remove link ${link.title}`}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/20"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.();
                    }}
                >
                    <Trash2 className="h-3 w-3 text-muted-foreground/50 hover:text-destructive transition-colors" />
                </button>
            )}
        </div>
    );
});

// --- Droppable Group Component ---
const DroppableGroup = React.memo(({ group, children, onToggle, isSource, onSelectGroup }: { group: UIGroup; children: React.ReactNode, onToggle: () => void, isSource?: boolean, onSelectGroup?: () => void }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: group.id,
        data: { group }
    });

    const allSelected = group.links.length > 0 && group.links.every(l => l.selected);
    const someSelected = group.links.some(l => l.selected);
    const duplicateCount = group.links.filter(l => l.isDuplicate).length;

    return (
        <div 
            ref={setNodeRef}
            className={cn(
                "rounded-xl border transition-[border-color,background-color,box-shadow,ring-color] duration-200 mb-3 overflow-hidden",
                isOver 
                    ? "border-primary/50 ring-2 ring-primary/20 bg-primary/5" 
                    : "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.1]"
            )}
        >
            {/* Group Header */}
            <div onClick={onToggle} className="flex items-center gap-2.5 px-3.5 py-2.5 select-none cursor-pointer hover:bg-white/[0.03] transition-colors">
                <div className="shrink-0 text-muted-foreground/50">
                    {group.isExpanded 
                        ? <ChevronDown className="h-3.5 w-3.5" />
                        : <ChevronRight className="h-3.5 w-3.5" />
                    }
                </div>
                
                <input 
                    type="checkbox"
                    title={`Select group ${group.title}`}
                    aria-label={`Select group ${group.title}`}
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={(e) => {
                        e.stopPropagation();
                        onSelectGroup?.();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-3.5 w-3.5 shrink-0 rounded border-white/20 bg-black/20 text-primary focus:ring-primary cursor-pointer"
                />

                <div className={cn("p-1 rounded-md shrink-0", isSource ? "bg-white/5" : "bg-primary/10")}>
                    <Folder className={cn("h-3.5 w-3.5", isSource ? "text-muted-foreground/60" : "text-primary")} />
                </div>
                <span className="font-semibold text-[11px] uppercase tracking-[0.08em] flex-1 truncate text-foreground/80">{group.title}</span>
                
                <div className="flex items-center gap-1.5 shrink-0">
                    {duplicateCount > 0 && !isSource && (
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-400/15 border border-amber-400/25 px-1.5 py-0.5 rounded-full">
                            {duplicateCount}×
                        </span>
                    )}
                    <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        isSource ? "text-muted-foreground bg-white/8" : "text-primary bg-primary/15"
                    )}>
                        {group.links.length}
                    </span>
                </div>
            </div>

            {/* Links */}
            {group.isExpanded && (
                <div className="border-t border-white/[0.05] px-2 py-1.5 bg-black/[0.12] min-h-[40px] space-y-0.5">
                    {children}
                    {group.links.length === 0 && (
                        <div className="flex items-center justify-center gap-2 py-4 border border-dashed border-white/[0.08] rounded-lg mx-1">
                            <div className="h-px flex-1 bg-white/[0.05]" />
                            <span className="text-[10px] text-muted-foreground/30 font-medium">Hierher ziehen</span>
                            <div className="h-px flex-1 bg-white/[0.05]" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({ isOpen, onClose, data }) => {
    const currentGroups = useStore((state) => state.groups);
    const queryClient = useQueryClient();
    const [sourceGroups, setSourceGroups] = React.useState<UIGroup[]>([]);
    const [targetGroups, setTargetGroups] = React.useState<UIGroup[]>([]);
    const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
    const [activeDragData, setActiveDragData] = React.useState<{ selectedCount: number; isDraggedSelected: boolean } | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Duplicate confirmation state
    const [isDuplicateConfirmOpen, setIsDuplicateConfirmOpen] = useState(false);
    const [pendingDuplicates, setPendingDuplicates] = useState<UILink[]>([]);

    // Feedback dialogs
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // New Folder Dialog State
    const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("Neuer Ordner");

    // Prevent background scroll while modal is open
    useEffect(() => {
        if (!isOpen) return;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Initial Load
    React.useEffect(() => {
        if (data && isOpen) {
            // Build set of existing URLs for duplicate detection
            const existingUrls = new Set(
                currentGroups.flatMap(g => (g.links || []).map(l => l.url.toLowerCase().trim()))
            );

            setSourceGroups(data.groups.map((g, i) => ({
                ...g,
                id: `source-group-${i}`,
                isExpanded: true, 
                isTarget: false,
                links: (g.links || []).map((l, j) => ({
                    ...l,
                    id: `source-link-${i}-${j}`,
                    selected: false,
                    isDuplicate: existingUrls.has(l.url.toLowerCase().trim())
                }))
            })));

            setTargetGroups(currentGroups.map((g, i) => ({
                title: g.title,
                id: `target-group-${i}`,
                isExpanded: true, 
                isTarget: true,
                links: (g.links || []).map((l, j) => ({  
                    title: l.title, 
                    url: l.url, 
                    icon: l.icon, 
                    id: `target-link-${i}-${j}`,
                    selected: false 
                }))
            })));
        }
    }, [data, isOpen, currentGroups]);

    // Optimized Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, 
            },
        })
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const draggedLinkId = event.active.id as string;
        setActiveDragId(draggedLinkId);

        let isDraggedSelected = false;
        sourceGroups.some(g => {
            const link = g.links.find(l => l.id === draggedLinkId);
            if (link) { isDraggedSelected = !!link.selected; return true; }
            return false;
        });
        if (!isDraggedSelected) {
            targetGroups.some(g => {
                const link = g.links.find(l => l.id === draggedLinkId);
                if (link) { isDraggedSelected = !!link.selected; return true; }
                return false;
            });
        }
        const allSelectedCount = isDraggedSelected
            ? [...sourceGroups, ...targetGroups].flatMap(g => g.links).filter(l => l.selected).length
            : 1;
        setActiveDragData({ selectedCount: allSelectedCount, isDraggedSelected });
    }, [sourceGroups, targetGroups]);

    const moveSelectedItems = useCallback((targetId: string, isTargetDest: boolean) => {
        const toMove: UILink[] = [];

        const newSourceGroups = sourceGroups.map(g => ({
            ...g,
            links: g.links.filter(l => {
                if (l.selected) { toMove.push(l); return false; }
                return true;
            })
        }));

        const newTargetGroups = targetGroups.map(g => ({
            ...g,
            links: g.links.filter(l => {
                if (l.selected) { toMove.push(l); return false; }
                return true;
            })
        }));

        if (toMove.length === 0) return;

        const mappedLinks = toMove.map(l => ({
            ...l,
            selected: false,
            id: `moved-${Date.now()}-${Math.random()}`
        }));

        if (isTargetDest) {
            setSourceGroups(newSourceGroups);
            setTargetGroups(newTargetGroups.map(g =>
                g.id === targetId ? { ...g, links: [...g.links, ...mappedLinks] } : g
            ));
        } else {
            setTargetGroups(newTargetGroups);
            setSourceGroups(newSourceGroups.map(g =>
                g.id === targetId ? { ...g, links: [...g.links, ...mappedLinks] } : g
            ));
        }
    }, [sourceGroups, targetGroups]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);
        setActiveDragData(null);

        if (!over) return;

        const draggedLinkId = active.id as string;
        const targetContainerId = over.id as string;

        const isTargetGroupDest = targetGroups.some(g => g.id === targetContainerId);
        const isSourceGroupDest = sourceGroups.some(g => g.id === targetContainerId);
        if (!isTargetGroupDest && !isSourceGroupDest) return;

        // Find dragged link
        let draggedLink: UILink | undefined;
        let sourceGroupIndex = -1;
        let isFromSource = false;

        sourceGroups.some((g, i) => {
            const link = g.links.find(l => l.id === draggedLinkId);
            if (link) { draggedLink = link; sourceGroupIndex = i; isFromSource = true; return true; }
            return false;
        });

        if (!draggedLink) {
            targetGroups.some((g, i) => {
                const link = g.links.find(l => l.id === draggedLinkId);
                if (link) { draggedLink = link; sourceGroupIndex = i; isFromSource = false; return true; }
                return false;
            });
        }

        if (!draggedLink || sourceGroupIndex === -1) return;

        // Multi-drag: if dragged link is selected, move ALL selected links
        if (draggedLink.selected) {
            moveSelectedItems(targetContainerId, isTargetGroupDest);
        } else {
            moveItem(draggedLink, sourceGroupIndex, isFromSource, targetContainerId, isTargetGroupDest);
        }

    }, [sourceGroups, targetGroups, moveSelectedItems]);

    const moveItem = (item: UILink, sourceGroupIdx: number, isFromSource: boolean, targetId: string, isTargetDest: boolean) => {
         // Remove from Origin
         if (isFromSource) {
            setSourceGroups(prev => {
                const newGroups = [...prev];
                newGroups[sourceGroupIdx] = {
                    ...newGroups[sourceGroupIdx],
                    links: newGroups[sourceGroupIdx].links.filter(l => l.id !== item.id)
                };
                return newGroups;
            });
        } else {
            setTargetGroups(prev => {
                const newGroups = [...prev];
                newGroups[sourceGroupIdx] = {
                    ...newGroups[sourceGroupIdx],
                    links: newGroups[sourceGroupIdx].links.filter(l => l.id !== item.id)
                };
                return newGroups;
            });
        }

        // Add to Destination
        const linkToAdd = { ...item, id: `moved-${Date.now()}-${Math.random()}` }; 

        if (isTargetDest) {
            setTargetGroups(prev => prev.map(g => {
                if (g.id === targetId) return { ...g, links: [...g.links, linkToAdd] };
                return g;
            }));
        } else {
            setSourceGroups(prev => prev.map(g => {
                if (g.id === targetId) return { ...g, links: [...g.links, linkToAdd] };
                return g;
            })); 
        }
    };

    const toggleGroupSelect = useCallback((id: string, isSource: boolean) => {
        const setter = isSource ? setSourceGroups : setTargetGroups;
        setter(prev => prev.map(g => {
            if (g.id === id) {
                const allSelected = g.links.every(l => l.selected);
                return { 
                    ...g, 
                    links: g.links.map(l => ({ ...l, selected: !allSelected })) 
                };
            }
            return g;
        }));
    }, []);

    const toggleLinkSelect = useCallback((groupId: string, linkId: string, isSource: boolean) => {
        const setter = isSource ? setSourceGroups : setTargetGroups;
        setter(prev => prev.map(g => {
            if (g.id === groupId) {
                return {
                    ...g,
                    links: g.links.map(l => l.id === linkId ? { ...l, selected: !l.selected } : l)
                };
            }
            return g;
        }));
    }, []);

    const toggleExpand = useCallback((id: string, isSource: boolean) => {
        const setter = isSource ? setSourceGroups : setTargetGroups;
        setter(prev => prev.map(g => g.id === id ? { ...g, isExpanded: !g.isExpanded } : g));
    }, []);

    const confirmCreateFolder = () => {
        if (newFolderName.trim()) {
            const newGroup: UIGroup = {
                id: `new-group-${Date.now()}`,
                title: newFolderName,
                links: [],
                isExpanded: true,
                isTarget: true
            };
            setTargetGroups(prev => [newGroup, ...prev]);
        }
        setIsNewFolderOpen(false);
        setNewFolderName("Neuer Ordner");
    };
    
    const handleBulkMoveRight = () => {
        let hasSelected = false;
        const newSourceGroups = [...sourceGroups];
        const newTargetGroups = [...targetGroups];

        for (let i = 0; i < newSourceGroups.length; i++) {
            const sg = newSourceGroups[i];
            const selectedLinks = sg.links.filter(l => l.selected);
            const keepLinks = sg.links.filter(l => !l.selected);

            if (selectedLinks.length > 0) {
                hasSelected = true;
                // Update source group to remove selected
                newSourceGroups[i] = { ...sg, links: keepLinks };

                // Map to new IDs
                const mappedLinks = selectedLinks.map(l => ({ 
                    ...l, 
                    selected: false, 
                    id: `bulk-${Date.now()}-${Math.random()}-${l.id}` 
                }));

                // Try to find matching target group by title
                const existingTargetIdx = newTargetGroups.findIndex(tg => tg.title === sg.title);
                
                if (existingTargetIdx >= 0) {
                    newTargetGroups[existingTargetIdx] = {
                        ...newTargetGroups[existingTargetIdx],
                        links: [...newTargetGroups[existingTargetIdx].links, ...mappedLinks],
                        isExpanded: true // Expand to show new items
                    };
                } else {
                    // Create new folder with the original title
                    newTargetGroups.unshift({
                        id: `import-group-${Date.now()}-${i}`,
                        title: sg.title, // Keep original folder name!
                        links: mappedLinks,
                        isExpanded: true,
                        isTarget: true
                    });
                }
            }
        }

        if (!hasSelected) return;

        setSourceGroups(newSourceGroups);
        setTargetGroups(newTargetGroups);
    };

    const deleteLink = useCallback((groupId: string, linkId: string) => {
        setTargetGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                return {
                    ...g,
                    links: g.links.filter(l => l.id !== linkId)
                };
            }
            return g;
        }));
    }, []);


    const doSave = async () => {
        setIsSubmitting(true);
        try {
            const finalData: ImportPreviewData = {
                groups: targetGroups.map(g => ({
                    title: g.title,
                    // Strip base64 data-URI icons — they are huge and cause 413 errors.
                    // Only keep HTTP(S) icon URLs (small strings).
                    links: g.links.map(l => ({
                        title: l.title,
                        url: l.url,
                        icon: l.icon && !l.icon.startsWith('data:') ? l.icon : ''
                    }))
                })),
                totalLinks: targetGroups.reduce((acc, g) => acc + g.links.length, 0)
            };

            await executeImport(finalData, false);
            setSuccessMessage('AppLauncher erfolgreich aktualisiert!');
        } catch (error: unknown) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
            if (message.includes('413')) {
                setErrorMessage('Die Import-Datei ist zu groß. Bitte weniger Lesezeichen auf einmal importieren oder eine kleinere Datei verwenden.');
            } else {
                setErrorMessage('Fehler beim Speichern: ' + message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSave = () => {
        // Collect duplicate links that were moved to target
        const dupes = targetGroups.flatMap(g => g.links.filter(l => l.isDuplicate));
        if (dupes.length > 0) {
            setPendingDuplicates(dupes);
            setIsDuplicateConfirmOpen(true);
            return;
        }
        doSave();
    };

    if (!isOpen) return null;

    const sourceSelectedCount = sourceGroups.reduce((acc, g) => acc + g.links.filter(l => l.selected).length, 0);
    const totalSourceLinks = sourceGroups.reduce((acc, g) => acc + g.links.length, 0);
    const totalTargetLinks = targetGroups.reduce((acc, g) => acc + (g.links?.length || 0), 0);
    const totalDuplicates = sourceGroups.reduce((acc, g) => acc + g.links.filter(l => l.isDuplicate).length, 0);
    const multiDragActive = activeDragId !== null && (activeDragData?.isDraggedSelected ?? false);

    return (
        <DndContext 
            sensors={sensors} 
            collisionDetection={pointerWithin}
            measuring={{ droppable: { strategy: MeasuringStrategy.WhileDragging } }}
            onDragStart={handleDragStart} 
            onDragEnd={handleDragEnd}
        >
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8 bg-black/80 backdrop-blur-lg">
                 <div className="w-full max-w-[92vw] h-[88vh] flex flex-col rounded-2xl overflow-hidden shadow-[0_32px_80px_-12px_rgba(0,0,0,0.8)] border border-white/[0.08] bg-[linear-gradient(145deg,hsl(var(--card))_0%,hsl(var(--background))_100%)]">
                    
                    {/* ── Header ── */}
                    <div className="relative px-6 py-4 border-b border-white/[0.07] flex items-center justify-between shrink-0 overflow-hidden">
                        {/* BG glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
                        
                        <div className="flex items-center gap-4 relative">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg" />
                                <div className="relative bg-primary/10 border border-primary/20 p-2.5 rounded-xl">
                                    <Folder className="h-5 w-5 text-primary" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-foreground tracking-tight">Bookmark Import Manager</h2>
                                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                                    Wähle Lesezeichen aus und verschiebe sie in den AppLauncher
                                </p>
                            </div>
                        </div>

                        {/* Stats pills */}
                        <div className="flex items-center gap-2 mr-4 relative">
                            <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 py-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                                <span className="text-[10px] font-semibold text-muted-foreground">{totalSourceLinks} gefunden</span>
                            </div>
                            {totalDuplicates > 0 && (
                                <div className="flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-1">
                                    <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />
                                    <span className="text-[10px] font-semibold text-amber-400">{totalDuplicates} Duplikate</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                <span className="text-[10px] font-semibold text-primary">{totalTargetLinks} im Launcher</span>
                            </div>
                        </div>

                        <Button variant="ghost" size="icon" onClick={onClose} title="Close import preview" aria-label="Close import preview" className="relative rounded-xl hover:bg-white/5 shrink-0">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* ── Columns ── */}
                    <div className="flex-1 flex overflow-hidden min-h-0">
                        
                        {/* LEFT: SOURCE */}
                        <div className="flex-1 flex flex-col min-w-0 border-r border-white/[0.06]">
                            {/* Column header */}
                            <div className="px-4 py-2.5 border-b border-white/[0.05] bg-white/[0.015] flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-0.5 bg-muted-foreground/30 rounded-full" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">Importierte Datei</span>
                                </div>
                                <span className="text-[11px] font-semibold text-muted-foreground/50 tabular-nums">
                                    {sourceGroups.length} Ordner
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-0">
                                {sourceGroups.map(group => (
                                    <DroppableGroup 
                                        key={group.id} 
                                        group={group} 
                                        onToggle={() => toggleExpand(group.id, true)}
                                        onSelectGroup={() => toggleGroupSelect(group.id, true)} 
                                        isSource
                                    >
                                        {group.links.map(link => (
                                            <DraggableLink 
                                                key={link.id} 
                                                link={link} 
                                                group={group} 
                                                onSelect={() => toggleLinkSelect(group.id, link.id, true)}
                                                isGhosted={multiDragActive && !!link.selected}
                                            />
                                        ))}
                                    </DroppableGroup>
                                ))}
                            </div>
                        </div>

                        {/* CENTER: ACTION PANEL */}
                        <div className="w-14 flex flex-col items-center justify-center gap-4 border-r border-white/[0.06] bg-black/[0.15] shrink-0 relative py-6">
                            {/* Decorative line */}
                            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />
                            
                            <Button 
                                variant="secondary" 
                                size="icon" 
                                className={cn(
                                    "relative h-10 w-10 shrink-0 rounded-full shadow-lg transition-all duration-200",
                                    sourceSelectedCount > 0 
                                        ? "bg-primary text-primary-foreground shadow-[0_0_20px_-4px_hsl(var(--primary))] hover:scale-110 hover:shadow-[0_0_30px_-4px_hsl(var(--primary))]" 
                                        : "bg-white/5 text-white/20 cursor-not-allowed"
                                )}
                                onClick={handleBulkMoveRight}
                                disabled={sourceSelectedCount === 0}
                                title={sourceSelectedCount > 0 ? `${sourceSelectedCount} importieren` : "Links links auswählen"}
                            >
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                            
                            {sourceSelectedCount > 0 && (
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-[9px] text-primary font-bold tabular-nums bg-primary/15 px-1.5 py-0.5 rounded-full">
                                        {sourceSelectedCount}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* RIGHT: TARGET */}
                        <div className="flex-1 flex flex-col min-w-0">
                            <div className="px-4 py-2.5 border-b border-white/[0.05] bg-primary/[0.03] flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-0.5 bg-primary/50 rounded-full" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/70">AppLauncher</span>
                                </div>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 text-[10px] gap-1.5 border-primary/20 hover:bg-primary/10 hover:border-primary/40 font-semibold rounded-lg px-2.5"
                                    onClick={() => setIsNewFolderOpen(true)}
                                >
                                    <Plus className="h-3 w-3" />
                                    Ordner
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                                {targetGroups.map(group => (
                                    <DroppableGroup 
                                        key={group.id} 
                                        group={group} 
                                        onToggle={() => toggleExpand(group.id, false)}
                                        onSelectGroup={() => toggleGroupSelect(group.id, false)}
                                    >
                                        {group.links.map(link => (
                                            <DraggableLink 
                                                key={link.id} 
                                                link={link} 
                                                group={group}
                                                onSelect={() => toggleLinkSelect(group.id, link.id, false)} 
                                                onDelete={() => deleteLink(group.id, link.id)}
                                                isGhosted={multiDragActive && !!link.selected}
                                            />
                                        ))}
                                    </DroppableGroup>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Footer ── */}
                    <div className="px-6 py-3.5 border-t border-white/[0.07] bg-black/[0.1] flex items-center justify-between shrink-0">
                        <div className="text-[10px] text-muted-foreground/40">
                            {totalTargetLinks > 0 ? `${totalTargetLinks} Links werden gespeichert` : 'Keine Links ausgewählt'}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="h-8 text-xs font-semibold px-4 hover:bg-white/5">
                                Abbrechen
                            </Button>
                            <Button 
                                onClick={handleSave} 
                                disabled={isSubmitting || totalTargetLinks === 0} 
                                className="h-8 text-xs font-bold px-5 min-w-[140px] rounded-lg shadow-[0_0_20px_-6px_hsl(var(--primary))]"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                        </svg>
                                        Speichere...
                                    </span>
                                ) : 'AppLauncher Update'}
                            </Button>
                        </div>
                    </div>

                    {/* Duplicate Confirmation Dialog */}
                    <Dialog open={isDuplicateConfirmOpen} onOpenChange={setIsDuplicateConfirmOpen}>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-amber-400">
                                    <AlertTriangle className="h-5 w-5" />
                                    Bereits vorhandene Links
                                </DialogTitle>
                                <DialogDescription>
                                    Die folgenden {pendingDuplicates.length} Links sind bereits in der App vorhanden. Möchtest du sie trotzdem nochmal hinzufügen?
                                </DialogDescription>
                            </DialogHeader>
                            <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
                                {pendingDuplicates.map((l, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs">
                                        <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                                        <div className="min-w-0">
                                            <div className="font-semibold truncate">{l.title}</div>
                                            <div className="text-muted-foreground/60 truncate">{l.url}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <DialogFooter className="gap-2">
                                <Button variant="ghost" onClick={() => setIsDuplicateConfirmOpen(false)}>
                                    Nochmal bearbeiten
                                </Button>
                                <Button
                                    className="bg-amber-500 hover:bg-amber-600 text-white"
                                    onClick={() => { setIsDuplicateConfirmOpen(false); doSave(); }}
                                >
                                    Trotzdem hinzufügen
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Create Folder Dialog */}
                    <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Neuen Ordner erstellen</DialogTitle>
                                <DialogDescription>
                                    Erstelle einen neuen Ordner im AppLauncher.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex items-center space-x-2">
                                <div className="grid flex-1 gap-2">
                                    <Input 
                                        id="folderName" 
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && confirmCreateFolder()}
                                    />
                                </div>
                            </div>
                            <DialogFooter className="sm:justify-start">
                                <Button type="button" variant="secondary" onClick={() => setIsNewFolderOpen(false)}>
                                    Abbrechen
                                </Button>
                                <Button type="button" onClick={confirmCreateFolder}>
                                    Erstellen
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                </div>
            </div>
            <DragOverlay>
                 {activeDragId ? (
                    <div className="bg-[hsl(var(--card))] border border-primary/40 px-3 py-2 rounded-xl shadow-[0_20px_40px_-8px_rgba(0,0,0,0.7)] opacity-95 w-[200px] flex items-center gap-2.5 rotate-1">
                        <LinkIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-[11px] font-bold truncate text-foreground">
                            {activeDragData && activeDragData.selectedCount > 1
                                ? `${activeDragData.selectedCount} Links verschieben`
                                : 'Link verschieben'}
                        </span>
                    </div>
                 ) : null}
            </DragOverlay>

            {/* ── Success Dialog ── */}
            <Dialog open={!!successMessage} onOpenChange={() => {}}>
                <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-emerald-400">
                            <div className="relative shrink-0">
                                <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-md" />
                                <CheckCircle2 className="relative h-6 w-6" />
                            </div>
                            Import erfolgreich
                        </DialogTitle>
                        <DialogDescription className="text-sm text-foreground/70 pt-1">
                            {successMessage}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-[0_0_20px_-4px_rgba(52,211,153,0.5)]"
                            onClick={() => {
                                setSuccessMessage(null);
                                void queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
                                onClose();
                            }}
                        >
                            OK
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Error Dialog ── */}
            <Dialog open={!!errorMessage} onOpenChange={() => setErrorMessage(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-destructive">
                            <div className="relative shrink-0">
                                <div className="absolute inset-0 bg-destructive/20 rounded-full blur-md" />
                                <XCircle className="relative h-6 w-6" />
                            </div>
                            Fehler beim Import
                        </DialogTitle>
                        <DialogDescription className="text-sm text-foreground/70 pt-1">
                            {errorMessage}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setErrorMessage(null)} className="w-full">
                            Schließen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </DndContext>
    );
};
