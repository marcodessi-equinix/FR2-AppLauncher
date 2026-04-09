import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X, Folder, Link as LinkIcon, ChevronRight, ChevronDown, Trash2, ArrowRight, Plus, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { cn } from '../../lib/utils';
import { executeImport, ImportPreviewData, ParsedGroup, ParsedLink } from '../../lib/api';
import { useStore } from '../../store/useStore';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../../lib/i18n';
import { DynamicIcon } from '../ui/DynamicIcon';

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

interface ImportDropPreview {
    groupId: string;
    groupTitle: string;
    isTarget: boolean;
    insertIndex: number;
}

interface ImportRowMetric {
    id: string;
    top: number;
    bottom: number;
    mid: number;
    height: number;
}

interface ImportGroupMetric {
    groupId: string;
    linksTop: number;
    emptyStateMid: number | null;
    rows: ImportRowMetric[];
}

interface ImportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: ImportPreviewData | null;
}

const PREVIEW_GROUP_CLASS = 'is-drop-preview';
const GROUP_OVERSCAN_PX = 520;
const ESTIMATED_GROUP_HEADER_HEIGHT = 46;
const ESTIMATED_GROUP_LINK_ROW_HEIGHT = 48;
const ESTIMATED_GROUP_EMPTY_HEIGHT = 62;
const ESTIMATED_GROUP_CHROME_HEIGHT = 18;
const IMPORT_DROP_HYSTERESIS_MIN_PX = 6;
const IMPORT_DROP_HYSTERESIS_MAX_PX = 14;

const estimateGroupHeight = (group: UIGroup) => {
    if (!group.isExpanded) {
        return ESTIMATED_GROUP_HEADER_HEIGHT + ESTIMATED_GROUP_CHROME_HEIGHT;
    }

    return ESTIMATED_GROUP_HEADER_HEIGHT
        + ESTIMATED_GROUP_CHROME_HEIGHT
        + (group.links.length > 0
            ? group.links.length * ESTIMATED_GROUP_LINK_ROW_HEIGHT
            : ESTIMATED_GROUP_EMPTY_HEIGHT);
};

const MeasuredVirtualItem = React.memo(({
    itemId,
    onHeightChange,
    children,
}: {
    itemId: string;
    onHeightChange: (itemId: string, height: number) => void;
    children: React.ReactNode;
}) => {
    const itemRef = useRef<HTMLDivElement | null>(null);

    React.useLayoutEffect(() => {
        if (!itemRef.current) {
            return;
        }

        const element = itemRef.current;
        const reportHeight = () => onHeightChange(itemId, element.offsetHeight);
        reportHeight();

        const resizeObserver = new ResizeObserver(() => {
            reportHeight();
        });
        resizeObserver.observe(element);

        return () => {
            resizeObserver.disconnect();
        };
    }, [itemId, onHeightChange]);

    return (
        <div ref={itemRef} className="pb-3">
            {children}
        </div>
    );
});

const VirtualizedGroupList = React.memo(({
    groups,
    className,
    renderGroup,
}: {
    groups: UIGroup[];
    className?: string;
    renderGroup: (group: UIGroup) => React.ReactNode;
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const scrollFrameRef = useRef<number | null>(null);
    const [viewportHeight, setViewportHeight] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const [groupHeights, setGroupHeights] = useState<Record<string, number>>({});

    React.useLayoutEffect(() => {
        if (!containerRef.current) {
            return;
        }

        const element = containerRef.current;
        const updateViewport = () => {
            setViewportHeight(element.clientHeight);
            setScrollTop(element.scrollTop);
        };

        updateViewport();

        const resizeObserver = new ResizeObserver(() => {
            updateViewport();
        });
        resizeObserver.observe(element);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    useEffect(() => {
        return () => {
            if (scrollFrameRef.current !== null) {
                cancelAnimationFrame(scrollFrameRef.current);
            }
        };
    }, []);

    const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
        const nextScrollTop = event.currentTarget.scrollTop;
        if (scrollFrameRef.current !== null) {
            return;
        }

        scrollFrameRef.current = requestAnimationFrame(() => {
            scrollFrameRef.current = null;
            setScrollTop(nextScrollTop);
        });
    }, []);

    const handleHeightChange = useCallback((itemId: string, height: number) => {
        setGroupHeights((current) => {
            if (current[itemId] === height) {
                return current;
            }

            return {
                ...current,
                [itemId]: height,
            };
        });
    }, []);

    const { startIndex, endIndex, topSpacerHeight, bottomSpacerHeight } = React.useMemo(() => {
        if (groups.length === 0) {
            return {
                startIndex: 0,
                endIndex: 0,
                topSpacerHeight: 0,
                bottomSpacerHeight: 0,
            };
        }

        const maxVisibleBottom = scrollTop + Math.max(viewportHeight, 1) + GROUP_OVERSCAN_PX;
        const minVisibleTop = Math.max(0, scrollTop - GROUP_OVERSCAN_PX);

        let accumulatedHeight = 0;
        let start = 0;

        while (start < groups.length) {
            const nextHeight = groupHeights[groups[start].id] ?? estimateGroupHeight(groups[start]);
            if (accumulatedHeight + nextHeight >= minVisibleTop) {
                break;
            }
            accumulatedHeight += nextHeight;
            start += 1;
        }

        let end = start;
        let visibleHeight = accumulatedHeight;

        while (end < groups.length) {
            const nextHeight = groupHeights[groups[end].id] ?? estimateGroupHeight(groups[end]);
            visibleHeight += nextHeight;
            end += 1;
            if (visibleHeight >= maxVisibleBottom) {
                break;
            }
        }

        const totalHeight = groups.reduce((sum, group) => {
            return sum + (groupHeights[group.id] ?? estimateGroupHeight(group));
        }, 0);

        return {
            startIndex: start,
            endIndex: end,
            topSpacerHeight: accumulatedHeight,
            bottomSpacerHeight: Math.max(0, totalHeight - visibleHeight),
        };
    }, [groupHeights, groups, scrollTop, viewportHeight]);

    return (
        <div
            ref={containerRef}
            className={className}
            onScroll={handleScroll}
        >
            <div style={{ paddingTop: topSpacerHeight, paddingBottom: bottomSpacerHeight }}>
                {groups.slice(startIndex, endIndex).map((group) => (
                    <MeasuredVirtualItem
                        key={group.id}
                        itemId={group.id}
                        onHeightChange={handleHeightChange}
                    >
                        {renderGroup(group)}
                    </MeasuredVirtualItem>
                ))}
            </div>
        </div>
    );
});

// --- Draggable Link Component ---
const DraggableLink = React.memo(({
    linkId,
    groupId,
    isTarget,
    title,
    url,
    icon,
    isSelected,
    isDuplicate,
    onSelectLink,
    onDeleteLink,
    bulkDragSelected,
    onDragStart,
    onDragEnd,
}: {
    linkId: string;
    groupId: string;
    isTarget: boolean;
    title: string;
    url: string;
    icon?: string;
    isSelected?: boolean;
    isDuplicate?: boolean;
    onSelectLink: (groupId: string, linkId: string, isTarget: boolean) => void;
    onDeleteLink?: (groupId: string, linkId: string) => void;
    bulkDragSelected?: boolean;
    onDragStart?: (event: React.DragEvent<HTMLDivElement>, linkId: string) => void;
    onDragEnd?: () => void;
}) => {
    const { t } = useI18n();
    const [isDragging, setIsDragging] = React.useState(false);

    const handleSelectChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        event.stopPropagation();
        onSelectLink(groupId, linkId, isTarget);
    }, [groupId, isTarget, linkId, onSelectLink]);

    const handleDelete = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onDeleteLink?.(groupId, linkId);
    }, [groupId, linkId, onDeleteLink]);

    return (
        <div 
            draggable
            onDragStart={(event) => {
                setIsDragging(true);
                onDragStart?.(event, linkId);
            }}
            onDragEnd={() => {
                setIsDragging(false);
                onDragEnd?.();
            }}
            data-import-link-id={linkId}
            data-import-group-id={groupId}
            data-selected={isSelected ? 'true' : 'false'}
            data-dragging={isDragging ? 'true' : 'false'}
            data-bulk-drag-selected={bulkDragSelected ? 'true' : 'false'}
            className={cn(
                "import-preview-link-row flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-[border-color,background-color,opacity,box-shadow] duration-150 group relative cursor-grab active:cursor-grabbing touch-none",
                isDragging ? "opacity-20 bg-primary/20 border-primary/40 z-50 shadow-lg" : "border-transparent hover:border-white/10 hover:bg-white/[0.04]",
                isDuplicate ? "bg-amber-400/5 border-amber-400/20 hover:border-amber-400/30" :
                isSelected ? "bg-primary/8 border-primary/20" : ""
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
                title={t('import.selectLink', { title })}
                aria-label={t('import.selectLink', { title })}
                checked={!!isSelected} 
                onClick={(e) => e.stopPropagation()}
                onChange={handleSelectChange}
                className="import-preview-checkbox h-3.5 w-3.5 shrink-0 rounded border-white/20 bg-black/20 text-primary focus:ring-primary cursor-pointer"
            />

            {/* Icon */}
            <div className="import-preview-link-icon w-6 h-6 shrink-0 rounded-md flex items-center justify-center bg-white/5 border border-white/[0.06]">
                <DynamicIcon icon={icon} className="h-4 w-4 text-muted-foreground/70" fallback={<LinkIcon className="h-3 w-3 text-muted-foreground/40" />} />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="import-preview-link-title text-[11px] font-semibold truncate text-foreground/90">{title}</span>
                    {isDuplicate && (
                        <span title={t('import.duplicateExists')} className="import-preview-duplicate-badge inline-flex items-center gap-0.5 text-[8px] font-bold text-amber-400 bg-amber-400/15 border border-amber-400/25 px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider">
                            <AlertTriangle className="h-2 w-2" />
                            {t('import.duplicate')}
                        </span>
                    )}
                </div>
                <div className="import-preview-link-url text-[9px] text-muted-foreground/35 truncate">{url}</div>
            </div>
            
            {isTarget && (
                <button
                    type="button"
                    title={t('import.removeLink', { title })}
                    aria-label={t('import.removeLink', { title })}
                    className="import-preview-remove shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/20"
                    onClick={handleDelete}
                >
                    <Trash2 className="h-3 w-3 text-muted-foreground/50 hover:text-destructive transition-colors" />
                </button>
            )}
        </div>
    );
}, (previousProps, nextProps) => (
    previousProps.linkId === nextProps.linkId
    && previousProps.groupId === nextProps.groupId
    && previousProps.isTarget === nextProps.isTarget
    && previousProps.title === nextProps.title
    && previousProps.url === nextProps.url
    && previousProps.icon === nextProps.icon
    && previousProps.isSelected === nextProps.isSelected
    && previousProps.isDuplicate === nextProps.isDuplicate
    && previousProps.bulkDragSelected === nextProps.bulkDragSelected
    && previousProps.onSelectLink === nextProps.onSelectLink
    && previousProps.onDeleteLink === nextProps.onDeleteLink
    && previousProps.onDragStart === nextProps.onDragStart
    && previousProps.onDragEnd === nextProps.onDragEnd
));

// --- Droppable Group Component ---
const DroppableGroup = React.memo(({
    group,
    children,
    onToggle,
    isSource,
    onSelectGroup,
    registerGroupNode,
    registerLinksNode,
}: {
    group: UIGroup;
    children: React.ReactNode;
    onToggle: () => void;
    isSource?: boolean;
    onSelectGroup?: () => void;
    registerGroupNode?: (id: string, node: HTMLDivElement | null) => void;
    registerLinksNode?: (id: string, node: HTMLDivElement | null) => void;
}) => {
    const { t } = useI18n();
    const setCombinedGroupRef = React.useCallback((node: HTMLDivElement | null) => {
        registerGroupNode?.(group.id, node);
    }, [group.id, registerGroupNode]);

    const allSelected = group.links.length > 0 && group.links.every(l => l.selected);
    const someSelected = group.links.some(l => l.selected);
    const duplicateCount = group.links.filter(l => l.isDuplicate).length;

    return (
        <div 
            ref={setCombinedGroupRef}
            data-import-group-id={group.id}
            className={cn(
                "import-preview-group rounded-xl border transition-[border-color,background-color,box-shadow,ring-color] duration-200 overflow-hidden",
                "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.1]"
            )}
        >
            {/* Group Header */}
            <div onClick={onToggle} className="import-preview-group-header flex items-center gap-2.5 px-3.5 py-2.5 select-none cursor-pointer hover:bg-white/[0.03] transition-colors">
                <div className="import-preview-group-chevron shrink-0 text-muted-foreground/50">
                    {group.isExpanded 
                        ? <ChevronDown className="h-3.5 w-3.5" />
                        : <ChevronRight className="h-3.5 w-3.5" />
                    }
                </div>
                
                <input 
                    type="checkbox"
                    title={t('import.selectGroup', { title: group.title })}
                    aria-label={t('import.selectGroup', { title: group.title })}
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={(e) => {
                        e.stopPropagation();
                        onSelectGroup?.();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="import-preview-checkbox h-3.5 w-3.5 shrink-0 rounded border-white/20 bg-black/20 text-primary focus:ring-primary cursor-pointer"
                />

                <div className={cn("import-preview-group-icon p-1 rounded-md shrink-0", isSource ? "bg-white/5" : "bg-primary/10")}>
                    <Folder className={cn("h-3.5 w-3.5", isSource ? "text-muted-foreground/60" : "text-primary")} />
                </div>
                <span className="import-preview-group-title font-semibold text-[11px] uppercase tracking-[0.08em] flex-1 truncate text-foreground/80">{group.title}</span>
                
                <div className="flex items-center gap-1.5 shrink-0">
                    {duplicateCount > 0 && !isSource && (
                        <span className="import-preview-group-duplicate text-[9px] font-bold text-amber-400 bg-amber-400/15 border border-amber-400/25 px-1.5 py-0.5 rounded-full">
                            {duplicateCount}×
                        </span>
                    )}
                    <span className={cn(
                        "import-preview-group-count text-[10px] font-bold px-2 py-0.5 rounded-full",
                        isSource ? "text-muted-foreground bg-white/8" : "text-primary bg-primary/15"
                    )}>
                        {group.links.length}
                    </span>
                </div>
            </div>

            {/* Links */}
            {group.isExpanded && (
                <div
                    ref={(node) => registerLinksNode?.(group.id, node)}
                    data-import-links-group-id={group.id}
                    className="import-preview-group-links border-t border-white/[0.05] px-2 py-1.5 bg-black/[0.12] min-h-[40px] space-y-0.5"
                >
                    {children}
                    {group.links.length === 0 && (
                        <div className="import-preview-empty flex items-center justify-center gap-2 py-4 border border-dashed border-white/[0.08] rounded-lg mx-1">
                            <div className="h-px flex-1 bg-white/[0.05]" />
                            <span className="import-preview-empty-text text-[10px] text-muted-foreground/30 font-medium">{t('import.dragHere')}</span>
                            <div className="h-px flex-1 bg-white/[0.05]" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

const ImportGroupSection = React.memo(({
    group,
    isSource,
    bulkDragSelectionActive,
    registerGroupNode,
    registerLinksNode,
    onToggleExpand,
    onToggleGroupSelect,
    onSelectLink,
    onDeleteLink,
    onDragStart,
    onDragEnd,
}: {
    group: UIGroup;
    isSource: boolean;
    bulkDragSelectionActive: boolean;
    registerGroupNode: (id: string, node: HTMLDivElement | null) => void;
    registerLinksNode: (id: string, node: HTMLDivElement | null) => void;
    onToggleExpand: (id: string, isSource: boolean) => void;
    onToggleGroupSelect: (id: string, isSource: boolean) => void;
    onSelectLink: (groupId: string, linkId: string, isTarget: boolean) => void;
    onDeleteLink?: (groupId: string, linkId: string) => void;
    onDragStart: (event: React.DragEvent<HTMLDivElement>, linkId: string) => void;
    onDragEnd: () => void;
}) => {
    const handleToggle = useCallback(() => {
        onToggleExpand(group.id, isSource);
    }, [group.id, isSource, onToggleExpand]);

    const handleGroupSelect = useCallback(() => {
        onToggleGroupSelect(group.id, isSource);
    }, [group.id, isSource, onToggleGroupSelect]);

    return (
        <DroppableGroup
            group={group}
            onToggle={handleToggle}
            onSelectGroup={handleGroupSelect}
            isSource={isSource}
            registerGroupNode={registerGroupNode}
            registerLinksNode={registerLinksNode}
        >
            {group.links.map((link) => (
                <DraggableLink
                    key={link.id}
                    linkId={link.id}
                    groupId={group.id}
                    isTarget={!isSource}
                    title={link.title}
                    url={link.url}
                    icon={link.icon}
                    isSelected={link.selected}
                    isDuplicate={link.isDuplicate}
                    onSelectLink={onSelectLink}
                    onDeleteLink={onDeleteLink}
                    bulkDragSelected={bulkDragSelectionActive && !!link.selected}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                />
            ))}
        </DroppableGroup>
    );
}, (previousProps, nextProps) => (
    previousProps.group === nextProps.group
    && previousProps.isSource === nextProps.isSource
    && previousProps.bulkDragSelectionActive === nextProps.bulkDragSelectionActive
    && previousProps.registerGroupNode === nextProps.registerGroupNode
    && previousProps.registerLinksNode === nextProps.registerLinksNode
    && previousProps.onToggleExpand === nextProps.onToggleExpand
    && previousProps.onToggleGroupSelect === nextProps.onToggleGroupSelect
    && previousProps.onSelectLink === nextProps.onSelectLink
    && previousProps.onDeleteLink === nextProps.onDeleteLink
    && previousProps.onDragStart === nextProps.onDragStart
    && previousProps.onDragEnd === nextProps.onDragEnd
));

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({ isOpen, onClose, data }) => {
    const { t } = useI18n();
    const currentGroups = useStore((state) => state.groups);
    const queryClient = useQueryClient();
    const [sourceGroups, setSourceGroups] = React.useState<UIGroup[]>([]);
    const [targetGroups, setTargetGroups] = React.useState<UIGroup[]>([]);
    const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
    const [bulkDragSelectionActive, setBulkDragSelectionActive] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Duplicate confirmation state
    const [isDuplicateConfirmOpen, setIsDuplicateConfirmOpen] = useState(false);
    const [pendingDuplicates, setPendingDuplicates] = useState<UILink[]>([]);

    // Feedback dialogs
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // New Folder Dialog State
    const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState(t('import.newFolderDefaultName'));
    const groupRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const groupLinksRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const previewMarkerRef = useRef<HTMLDivElement | null>(null);
    const activePreviewRef = useRef<ImportDropPreview | null>(null);
    const draggedIdsRef = useRef<Set<string>>(new Set());
    const groupMetricsRef = useRef<Map<string, ImportGroupMetric>>(new Map());
    const dragOverFrameRef = useRef<number | null>(null);
    const lastDragPointRef = useRef<{ x: number; y: number; hoveredElement: HTMLElement | null } | null>(null);

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

    useEffect(() => {
        const marker = document.createElement('div');
        marker.className = 'import-preview-insert-marker';
        marker.innerHTML = '<div class="import-preview-insert-marker-dot"></div><div class="import-preview-insert-marker-line"></div>';
        previewMarkerRef.current = marker;

        return () => {
            marker.remove();
            previewMarkerRef.current = null;
        };
    }, []);

    useEffect(() => {
        return () => {
            if (dragOverFrameRef.current !== null) {
                cancelAnimationFrame(dragOverFrameRef.current);
            }
        };
    }, []);

    const registerGroupNode = useCallback((id: string, node: HTMLDivElement | null) => {
        if (node) {
            groupRefs.current.set(id, node);
        } else {
            groupRefs.current.delete(id);
        }
    }, []);

    const registerLinksNode = useCallback((id: string, node: HTMLDivElement | null) => {
        if (node) {
            groupLinksRefs.current.set(id, node);
        } else {
            groupLinksRefs.current.delete(id);
        }
    }, []);

    const clearPreviewIndicator = useCallback(() => {
        const marker = previewMarkerRef.current;
        if (marker) {
            marker.remove();
            marker.style.removeProperty('top');
            marker.style.removeProperty('left');
            marker.style.removeProperty('width');
        }

        const activePreview = activePreviewRef.current;
        if (activePreview) {
            const previousGroupNode = groupRefs.current.get(activePreview.groupId);
            previousGroupNode?.classList.remove(PREVIEW_GROUP_CLASS);
        }

        activePreviewRef.current = null;
    }, []);

    const captureGroupMetric = useCallback((groupId: string) => {
        const linksNode = groupLinksRefs.current.get(groupId);
        if (!linksNode) {
            return null;
        }

        const linksRect = linksNode.getBoundingClientRect();
        const draggedIds = draggedIdsRef.current;
        const rows = Array.from(
            linksNode.querySelectorAll<HTMLElement>('[data-import-link-id]')
        )
            .filter((row) => !draggedIds.has(row.dataset.importLinkId ?? ''))
            .map((row) => {
                const rowId = row.dataset.importLinkId;
                if (!rowId) {
                    return null;
                }

                const rowRect = row.getBoundingClientRect();
                const top = rowRect.top - linksRect.top;
                const height = rowRect.height;

                return {
                    id: rowId,
                    top,
                    bottom: top + height,
                    mid: top + height / 2,
                    height,
                } satisfies ImportRowMetric;
            })
            .filter((row): row is ImportRowMetric => row !== null);

        const metric: ImportGroupMetric = {
            groupId,
            linksTop: linksRect.top,
            emptyStateMid: (() => {
                const emptyState = linksNode.querySelector<HTMLElement>('.import-preview-empty');
                if (!emptyState) {
                    return null;
                }

                return emptyState.offsetTop + emptyState.offsetHeight / 2;
            })(),
            rows,
        };

        groupMetricsRef.current.set(groupId, metric);
        return metric;
    }, []);

    const previewKeyRef = useRef('');
    const groupMetaMap = React.useMemo(() => {
        const map = new Map<string, { groupId: string; title: string; isTarget: boolean }>();

        sourceGroups.forEach((group) => {
            map.set(group.id, {
                groupId: group.id,
                title: group.title,
                isTarget: false,
            });
        });

        targetGroups.forEach((group) => {
            map.set(group.id, {
                groupId: group.id,
                title: group.title,
                isTarget: true,
            });
        });

        return map;
    }, [sourceGroups, targetGroups]);

    const getGroupMeta = useCallback((groupId: string) => groupMetaMap.get(groupId) ?? null, [groupMetaMap]);

    const findLinkLocation = useCallback((linkId: string, customSourceGroups = sourceGroups, customTargetGroups = targetGroups) => {
        for (const group of customSourceGroups) {
            const linkIndex = group.links.findIndex((entry) => entry.id === linkId);
            if (linkIndex >= 0) {
                return { link: group.links[linkIndex], groupId: group.id, isSource: true, linkIndex };
            }
        }

        for (const group of customTargetGroups) {
            const linkIndex = group.links.findIndex((entry) => entry.id === linkId);
            if (linkIndex >= 0) {
                return { link: group.links[linkIndex], groupId: group.id, isSource: false, linkIndex };
            }
        }

        return null;
    }, [sourceGroups, targetGroups]);

    const handleDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, draggedLinkId: string) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', draggedLinkId);
        setActiveDragId(draggedLinkId);
        clearPreviewIndicator();

        const draggedLocation = findLinkLocation(draggedLinkId);
        if (!draggedLocation) {
            setBulkDragSelectionActive(false);
            return;
        }

        draggedIdsRef.current = new Set(
            draggedLocation.link.selected
                ? (draggedLocation.isSource ? sourceGroups : targetGroups)
                    .flatMap((group) => group.links)
                    .filter((link) => link.selected)
                    .map((link) => link.id)
                : [draggedLocation.link.id]
        );

        groupMetricsRef.current.clear();

        setBulkDragSelectionActive(!!draggedLocation.link.selected);
    }, [clearPreviewIndicator, findLinkLocation, sourceGroups, targetGroups]);

    const showPreviewIndicator = useCallback((preview: ImportDropPreview) => {
        const marker = previewMarkerRef.current;
        const groupNode = groupRefs.current.get(preview.groupId);
        const linksNode = groupLinksRefs.current.get(preview.groupId);
        const groupMetric = groupMetricsRef.current.get(preview.groupId) ?? captureGroupMetric(preview.groupId);

        if (!marker || !groupNode || !linksNode || !groupMetric) {
            return;
        }

        const previousPreview = activePreviewRef.current;
        if (previousPreview?.groupId !== preview.groupId) {
            const previousGroupNode = previousPreview ? groupRefs.current.get(previousPreview.groupId) : null;
            previousGroupNode?.classList.remove(PREVIEW_GROUP_CLASS);
        }

        groupNode.classList.add(PREVIEW_GROUP_CLASS);
        const { rows } = groupMetric;
        let markerTop = 14;

        if (rows.length > 0) {
            if (preview.insertIndex <= 0) {
                markerTop = rows[0].top;
            } else if (preview.insertIndex >= rows.length) {
                markerTop = rows[rows.length - 1].bottom;
            } else {
                markerTop = rows[preview.insertIndex].top;
            }
        } else {
            if (groupMetric.emptyStateMid !== null) {
                markerTop = groupMetric.emptyStateMid;
            }
        }

        marker.style.top = `${markerTop}px`;
        marker.style.left = '8px';
        marker.style.width = `calc(100% - 16px)`;

        if (marker.parentElement !== linksNode) {
            linksNode.appendChild(marker);
        }

        activePreviewRef.current = preview;
    }, [captureGroupMetric]);

    const updatePreviewFromPoint = useCallback((pointerY: number, hoveredElement: HTMLElement | null) => {
        if (!hoveredElement) {
            previewKeyRef.current = '';
            clearPreviewIndicator();
            return;
        }

        const linksContainer = hoveredElement.closest('[data-import-links-group-id]') as HTMLElement | null;
        const groupElement = hoveredElement.closest('[data-import-group-id]') as HTMLElement | null;
        const groupId = linksContainer?.dataset.importLinksGroupId || groupElement?.dataset.importGroupId;
        if (!groupId) {
            previewKeyRef.current = '';
            clearPreviewIndicator();
            return;
        }

        const groupMeta = getGroupMeta(groupId);
        if (!groupMeta) {
            previewKeyRef.current = '';
            clearPreviewIndicator();
            return;
        }

        const linksNode = groupLinksRefs.current.get(groupId);
        const groupMetric = groupMetricsRef.current.get(groupId) ?? captureGroupMetric(groupId);
        if (!linksNode || !groupMetric) {
            previewKeyRef.current = '';
            clearPreviewIndicator();
            return;
        }

        const localY = pointerY - groupMetric.linksTop;
        const rows = groupMetric.rows;
        let insertIndex = rows.length;

        if (rows.length > 0) {
            insertIndex = rows.findIndex((row) => localY < row.mid);
            if (insertIndex < 0) {
                insertIndex = rows.length;
            }

            const previousPreview = activePreviewRef.current;
            if (previousPreview && previousPreview.groupId === groupId && previousPreview.insertIndex !== insertIndex) {
                const lowerIndex = Math.min(previousPreview.insertIndex, insertIndex);
                const upperIndex = Math.max(previousPreview.insertIndex, insertIndex);

                if (upperIndex - lowerIndex === 1 && lowerIndex < rows.length) {
                    const boundaryRow = rows[lowerIndex];
                    const hysteresis = Math.min(
                        IMPORT_DROP_HYSTERESIS_MAX_PX,
                        Math.max(IMPORT_DROP_HYSTERESIS_MIN_PX, boundaryRow.height * 0.18)
                    );

                    if (Math.abs(localY - boundaryRow.mid) <= hysteresis) {
                        insertIndex = previousPreview.insertIndex;
                    }
                }
            }
        }

        const nextPreview: ImportDropPreview = {
            groupId: groupMeta.groupId,
            groupTitle: groupMeta.title,
            isTarget: groupMeta.isTarget,
            insertIndex,
        };
        const nextKey = `${nextPreview.groupId}:${nextPreview.insertIndex}`;
        if (previewKeyRef.current !== nextKey) {
            previewKeyRef.current = nextKey;
            showPreviewIndicator(nextPreview);
        }
    }, [captureGroupMetric, clearPreviewIndicator, getGroupMeta, showPreviewIndicator]);

    const flushScheduledPreviewUpdate = useCallback(() => {
        if (dragOverFrameRef.current !== null) {
            cancelAnimationFrame(dragOverFrameRef.current);
            dragOverFrameRef.current = null;
        }
    }, []);

    const handleNativeDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        if (!activeDragId) {
            return;
        }

        event.preventDefault();
        lastDragPointRef.current = {
            x: event.clientX,
            y: event.clientY,
            hoveredElement: event.target instanceof HTMLElement ? event.target : null,
        };

        if (dragOverFrameRef.current !== null) {
            return;
        }

        dragOverFrameRef.current = requestAnimationFrame(() => {
            dragOverFrameRef.current = null;
            const point = lastDragPointRef.current;
            if (!point || !activeDragId) {
                return;
            }

            updatePreviewFromPoint(point.y, point.hoveredElement);
        });
    }, [activeDragId, updatePreviewFromPoint]);

    const resetDragState = useCallback(() => {
        flushScheduledPreviewUpdate();
        lastDragPointRef.current = null;
        draggedIdsRef.current = new Set();
        groupMetricsRef.current.clear();
        previewKeyRef.current = '';
        clearPreviewIndicator();
        setActiveDragId(null);
        setBulkDragSelectionActive(false);
    }, [clearPreviewIndicator, flushScheduledPreviewUpdate]);

    const applyDrop = useCallback((activeId: string) => {
        const currentPreview = activePreviewRef.current;

        if (currentPreview) {
            const draggedLocation = findLinkLocation(activeId);
            if (draggedLocation) {
                const draggedItems = draggedLocation.link.selected
                    ? (draggedLocation.isSource ? sourceGroups : targetGroups)
                        .flatMap((group) => group.links)
                        .filter((link) => link.selected)
                    : [draggedLocation.link];

                const draggedIds = new Set(draggedItems.map((link) => link.id));
                const nextSourceGroups = sourceGroups.map((group) => ({
                    ...group,
                    links: draggedLocation.isSource
                        ? group.links.filter((link) => !draggedIds.has(link.id))
                        : [...group.links],
                }));
                const nextTargetGroups = targetGroups.map((group) => ({
                    ...group,
                    links: draggedLocation.isSource
                        ? [...group.links]
                        : group.links.filter((link) => !draggedIds.has(link.id)),
                }));

                const destinationCollections = currentPreview.isTarget ? nextTargetGroups : nextSourceGroups;
                const destinationGroupIndex = destinationCollections.findIndex((group) => group.id === currentPreview.groupId);

                if (destinationGroupIndex >= 0) {
                    const destinationLinks = [...destinationCollections[destinationGroupIndex].links];
                    const insertIndex = Math.min(
                        Math.max(currentPreview.insertIndex, 0),
                        destinationLinks.length
                    );

                    destinationLinks.splice(
                        insertIndex,
                        0,
                        ...draggedItems.map((link) => ({ ...link, selected: false }))
                    );

                    destinationCollections[destinationGroupIndex] = {
                        ...destinationCollections[destinationGroupIndex],
                        isExpanded: true,
                        links: destinationLinks,
                    };

                    setSourceGroups(nextSourceGroups);
                    setTargetGroups(nextTargetGroups);
                }
            }
        }
    }, [findLinkLocation, sourceGroups, targetGroups]);

    const handleNativeDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        if (!activeDragId) {
            return;
        }

        event.preventDefault();
        applyDrop(activeDragId);
        resetDragState();
    }, [activeDragId, applyDrop, resetDragState]);

    const handleNativeDragEnd = useCallback(() => {
        resetDragState();
    }, [resetDragState]);

    const sourceSelectedCount = sourceGroups.reduce((acc, g) => acc + g.links.filter(l => l.selected).length, 0);
    const totalSourceLinks = sourceGroups.reduce((acc, g) => acc + g.links.length, 0);
    const totalTargetLinks = targetGroups.reduce((acc, g) => acc + (g.links?.length || 0), 0);
    const totalDuplicates = sourceGroups.reduce((acc, g) => acc + g.links.filter(l => l.isDuplicate).length, 0);

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
        setNewFolderName(t('import.newFolderDefaultName'));
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

    const handleSelectLink = useCallback((groupId: string, linkId: string, isTarget: boolean) => {
        toggleLinkSelect(groupId, linkId, !isTarget);
    }, [toggleLinkSelect]);

    const renderSourceGroup = useCallback((group: UIGroup) => (
        <ImportGroupSection
            key={group.id}
            group={group}
            isSource
            bulkDragSelectionActive={bulkDragSelectionActive}
            registerGroupNode={registerGroupNode}
            registerLinksNode={registerLinksNode}
            onToggleExpand={toggleExpand}
            onToggleGroupSelect={toggleGroupSelect}
            onSelectLink={handleSelectLink}
            onDragStart={handleDragStart}
            onDragEnd={handleNativeDragEnd}
        />
    ), [
        handleDragStart,
        handleNativeDragEnd,
        handleSelectLink,
        bulkDragSelectionActive,
        registerGroupNode,
        registerLinksNode,
        toggleExpand,
        toggleGroupSelect,
    ]);

    const renderTargetGroup = useCallback((group: UIGroup) => (
        <ImportGroupSection
            key={group.id}
            group={group}
            isSource={false}
            bulkDragSelectionActive={bulkDragSelectionActive}
            registerGroupNode={registerGroupNode}
            registerLinksNode={registerLinksNode}
            onToggleExpand={toggleExpand}
            onToggleGroupSelect={toggleGroupSelect}
            onSelectLink={handleSelectLink}
            onDeleteLink={deleteLink}
            onDragStart={handleDragStart}
            onDragEnd={handleNativeDragEnd}
        />
    ), [
        deleteLink,
        handleDragStart,
        handleNativeDragEnd,
        handleSelectLink,
        bulkDragSelectionActive,
        registerGroupNode,
        registerLinksNode,
        toggleExpand,
        toggleGroupSelect,
    ]);


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
            setSuccessMessage(t('import.success'));
        } catch (error: unknown) {
            console.error(error);
            const message = error instanceof Error ? error.message : t('import.errorUnknown');
            if (message.includes('413')) {
                setErrorMessage(t('import.errorTooLarge'));
            } else {
                setErrorMessage(t('import.errorSaving', { message }));
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

    return (
        <>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8 bg-black/80 backdrop-blur-lg"
                onDragOver={handleNativeDragOver}
                onDrop={handleNativeDrop}
            >
                 <div
                    data-bulk-dragging={bulkDragSelectionActive ? 'true' : 'false'}
                    className="import-preview-shell w-full max-w-[92vw] h-[88vh] flex flex-col rounded-2xl overflow-hidden shadow-[0_32px_80px_-12px_rgba(0,0,0,0.8)] border border-white/[0.08] bg-[linear-gradient(145deg,hsl(var(--card))_0%,hsl(var(--background))_100%)]"
                >
                    
                    {/* ── Header ── */}
                    <div className="import-preview-header relative px-6 py-4 border-b border-white/[0.07] flex items-center justify-between shrink-0 overflow-hidden">
                        {/* BG glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
                        
                        <div className="flex items-center gap-4 relative">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg" />
                                <div className="import-preview-header-icon relative bg-primary/10 border border-primary/20 p-2.5 rounded-xl">
                                    <Folder className="h-5 w-5 text-primary" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-foreground tracking-tight">{t('import.managerTitle')}</h2>
                                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                                    {t('import.managerSubtitle')}
                                </p>
                            </div>
                        </div>

                        {/* Stats pills */}
                        <div className="flex items-center gap-2 mr-4 relative">
                            <div className="import-preview-stat-pill flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 py-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                                <span className="text-[10px] font-semibold text-muted-foreground">{t('import.foundCount', { count: totalSourceLinks })}</span>
                            </div>
                            {totalDuplicates > 0 && (
                                <div className="import-preview-stat-pill import-preview-stat-pill-warning flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-1">
                                    <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />
                                    <span className="text-[10px] font-semibold text-amber-400">{t('import.duplicatesCount', { count: totalDuplicates })}</span>
                                </div>
                            )}
                            <div className="import-preview-stat-pill import-preview-stat-pill-primary flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                <span className="text-[10px] font-semibold text-primary">{t('import.inLauncherCount', { count: totalTargetLinks })}</span>
                            </div>
                        </div>

                        <Button variant="ghost" size="icon" onClick={onClose} title={t('import.closeImportPreview')} aria-label={t('import.closeImportPreview')} className="relative rounded-xl hover:bg-white/5 shrink-0">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* ── Columns ── */}
                    <div className="flex-1 flex overflow-hidden min-h-0">
                        
                        {/* LEFT: SOURCE */}
                        <div className="import-preview-column import-preview-column-source flex-1 flex flex-col min-w-0 border-r border-white/[0.06]">
                            {/* Column header */}
                            <div className="import-preview-column-header px-4 py-2.5 border-b border-white/[0.05] bg-white/[0.015] flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-0.5 bg-muted-foreground/30 rounded-full" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">{t('import.importedFile')}</span>
                                </div>
                                <span className="text-[11px] font-semibold text-muted-foreground/50 tabular-nums">
                                    {t('import.folderCount', { count: sourceGroups.length })}
                                </span>
                            </div>
                            <VirtualizedGroupList
                                groups={sourceGroups}
                                className="flex-1 overflow-y-auto p-3 custom-scrollbar"
                                renderGroup={renderSourceGroup}
                            />
                        </div>

                        {/* CENTER: ACTION PANEL */}
                        <div className="import-preview-actions w-14 flex flex-col items-center justify-center gap-4 border-r border-white/[0.06] bg-black/[0.15] shrink-0 relative py-6">
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
                                title={sourceSelectedCount > 0 ? t('import.importSelected', { count: sourceSelectedCount }) : t('import.selectLinksLeft')}
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
                        <div className="import-preview-column import-preview-column-target flex-1 flex flex-col min-w-0">
                            <div className="import-preview-column-header import-preview-column-header-target px-4 py-2.5 border-b border-white/[0.05] bg-primary/[0.03] flex items-center justify-between shrink-0">
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
                                    {t('import.newFolder')}
                                </Button>
                            </div>
                            <VirtualizedGroupList
                                groups={targetGroups}
                                className="flex-1 overflow-y-auto p-3 custom-scrollbar"
                                renderGroup={renderTargetGroup}
                            />
                        </div>
                    </div>

                    {/* ── Footer ── */}
                    <div className="import-preview-footer px-6 py-3.5 border-t border-white/[0.07] bg-black/[0.1] flex items-center justify-between shrink-0">
                        <div className="import-preview-footer-text text-[10px] text-muted-foreground/40">
                            {totalTargetLinks > 0
                                ? t('import.selectedLinksWillBeSaved', { count: totalTargetLinks })
                                : t('import.noLinksSelected')}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="h-8 text-xs font-semibold px-4 hover:bg-white/5">
                                {t('common.cancel')}
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
                                        {t('import.saving')}
                                    </span>
                                ) : t('import.updateAppLauncher')}
                            </Button>
                        </div>
                    </div>

                    {/* Duplicate Confirmation Dialog */}
                    <Dialog open={isDuplicateConfirmOpen} onOpenChange={setIsDuplicateConfirmOpen}>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-amber-400">
                                    <AlertTriangle className="h-5 w-5" />
                                    {t('import.duplicateLinksTitle')}
                                </DialogTitle>
                                <DialogDescription>
                                    {t('import.duplicateLinksDescription', { count: pendingDuplicates.length })}
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
                                    {t('import.reviewAgain')}
                                </Button>
                                <Button
                                    className="bg-amber-500 hover:bg-amber-600 text-white"
                                    onClick={() => { setIsDuplicateConfirmOpen(false); doSave(); }}
                                >
                                    {t('import.addAnyway')}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Create Folder Dialog */}
                    <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>{t('import.createFolderTitle')}</DialogTitle>
                                <DialogDescription>
                                    {t('import.createFolderDescription')}
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
                                    {t('common.cancel')}
                                </Button>
                                <Button type="button" onClick={confirmCreateFolder}>
                                    {t('import.create')}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                </div>
            </div>

            {/* ── Success Dialog ── */}
            <Dialog open={!!successMessage} onOpenChange={() => {}}>
                <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-emerald-400">
                            <div className="relative shrink-0">
                                <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-md" />
                                <CheckCircle2 className="relative h-6 w-6" />
                            </div>
                            {t('import.importSuccess')}
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
                            {t('import.importError')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-foreground/70 pt-1">
                            {errorMessage}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setErrorMessage(null)} className="w-full">
                            {t('common.close')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
