import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Icon } from '@iconify/react';
import { Search, Upload, Loader2, Plus, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../lib/api';
import { Button } from './button';
import { useI18n } from '../../lib/i18n';

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

interface IconifyResult {
  icons: string[];
  total: number;
}

interface UploadedIcon {
  url: string;
  filename: string;
  originalName?: string;
  displayName?: string;
}

type IconPickerTab = 'library' | 'upload';
type IconToneFilter = 'all' | 'color' | 'mono';

const COLORFUL_ICON_PREFIXES = new Set([
  'cib',
  'circle-flags',
  'cryptocurrency-color',
  'devicon',
  'emojione',
  'flat-color-icons',
  'flagpack',
  'fxemoji',
  'logos',
  'noto',
  'openmoji',
  'skill-icons',
  'streamline-color',
  'token-branded',
  'twemoji',
  'vscode-icons',
]);

const DEFAULT_MONO_ICONS = [
  'lucide:home',
  'lucide:settings',
  'lucide:user',
  'lucide:mail',
  'lucide:bell',
  'lucide:search',
  'lucide:heart',
  'lucide:star',
  'lucide:camera',
  'lucide:image',
  'lucide:briefcase',
  'lucide:calendar',
  'lucide:folder',
  'lucide:shield',
  'lucide:bookmark',
  'lucide:server',
  'lucide:database',
  'lucide:monitor',
  'lucide:smartphone',
  'lucide:cloud',
  'lucide:zap',
  'lucide:rocket',
  'lucide:shopping-cart',
  'lucide:chart-column',
  'mdi:web',
  'mdi:account-group',
  'mdi:briefcase-outline',
  'mdi:folder-network-outline',
  'mdi:finance',
  'mdi:tools',
  'mdi:printer-outline',
  'mdi:video-outline',
  'tabler:building-store',
  'tabler:plug',
  'tabler:cpu',
  'tabler:car',
  'tabler:headphones',
  'tabler:world',
  'solar:widget-4-outline',
  'solar:notes-outline',
];

const DEFAULT_COLOR_ICONS = [
  'logos:google-icon',
  'logos:microsoft-icon',
  'logos:apple',
  'logos:slack-icon',
  'logos:github-icon',
  'logos:docker-icon',
  'logos:kubernetes',
  'logos:aws',
  'logos:atlassian',
  'logos:dropbox',
  'logos:figma',
  'logos:google-gmail',
  'logos:google-drive',
  'logos:google-meet',
  'logos:zoom-icon',
  'logos:notion-icon',
  'logos:trello',
  'logos:jira',
  'logos:confluence',
  'logos:airtable',
  'logos:shopify',
  'logos:stripe',
  'logos:youtube-icon',
  'logos:netflix',
  'skill-icons:react-dark',
  'skill-icons:typescript',
  'skill-icons:javascript',
  'skill-icons:nodejs-dark',
  'skill-icons:postgresql-dark',
  'skill-icons:redis-dark',
  'skill-icons:azure-dark',
  'skill-icons:gcp-light',
  'flat-color-icons:calendar',
  'flat-color-icons:advertising',
  'flat-color-icons:assistant',
  'flat-color-icons:globe',
  'flat-color-icons:news',
  'flat-color-icons:picture',
  'twemoji:globe-with-meridians',
  'twemoji:rocket',
];

const DEFAULT_LIBRARY_ICONS = [...DEFAULT_MONO_ICONS, ...DEFAULT_COLOR_ICONS];

const isColorfulIcon = (iconName: string): boolean => {
  const prefix = iconName.split(':')[0]?.toLowerCase() || '';
  return COLORFUL_ICON_PREFIXES.has(prefix);
};

const getUploadedIconLabel = (icon: UploadedIcon): string =>
  icon.displayName?.trim() || icon.originalName?.trim() || icon.filename;

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, onClose }) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<IconPickerTab>('library');
  const [search, setSearch] = useState('');
  const [icons, setIcons] = useState<string[]>(DEFAULT_LIBRARY_ICONS);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedIcons, setUploadedIcons] = useState<UploadedIcon[]>([]);
  const [loadingUploaded, setLoadingUploaded] = useState(false);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
  const [pendingDeleteIcon, setPendingDeleteIcon] = useState<UploadedIcon | null>(null);
  const [toneFilter, setToneFilter] = useState<IconToneFilter>('all');
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconPickerTabs: { id: IconPickerTab; label: string }[] = [
    { id: 'library', label: t('iconPicker.libraryTab') },
    { id: 'upload', label: t('iconPicker.uploadTab') },
  ];
  const toneFilters: { id: IconToneFilter; label: string }[] = [
    { id: 'all', label: t('iconPicker.filterAll') },
    { id: 'color', label: t('iconPicker.filterColor') },
    { id: 'mono', label: t('iconPicker.filterMono') },
  ];

  const filteredIcons = useMemo(() => {
    if (toneFilter === 'all') {
      return icons;
    }

    return icons.filter((iconName) => {
      const colorful = isColorfulIcon(iconName);
      return toneFilter === 'color' ? colorful : !colorful;
    });
  }, [icons, toneFilter]);

  const selectedUploadedIcon = useMemo(
    () => uploadedIcons.find((icon) => icon.url === value),
    [uploadedIcons, value]
  );

  const loadUploadedIcons = async () => {
    setLoadingUploaded(true);
    try {
      const res = await api.get<UploadedIcon[]>('/upload/');
      setUploadedIcons(Array.isArray(res.data) ? res.data : []);
    } catch {
      setUploadedIcons([]);
    } finally {
      setLoadingUploaded(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'library') return;

    const timer = setTimeout(async () => {
      if (!search.trim()) {
        setIcons(DEFAULT_LIBRARY_ICONS);
        return;
      }

      setLoading(true);
      try {
        // Iconify Public API for searching
        const response = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(search)}&limit=180`);
        const data: IconifyResult = await response.json();
        setIcons(data.icons || []);
      } catch (err) {
        console.error('Failed to search icons:', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search, activeTab]);

  useEffect(() => {
    if (activeTab !== 'upload') return;
    void loadUploadedIcons();
  }, [activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be selected again
    e.target.value = '';

    setUploading(true);
    setUploadMessage(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post<UploadedIcon>('/upload/icon', formData);
      const newIcon = res.data;
      setUploadedIcons((prev) => [newIcon, ...prev.filter((icon) => icon.filename !== newIcon.filename)]);
      onChange(newIcon.url);
      setUploadMessage(t('iconPicker.uploaded', { name: getUploadedIconLabel(newIcon) }));
    } catch (err) {
      console.error('Upload failed', err);
      alert(t('iconPicker.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const confirmDeleteUploadedIcon = async () => {
    if (!pendingDeleteIcon) {
      return;
    }

    const icon = pendingDeleteIcon;
    const label = getUploadedIconLabel(icon);
    setDeletingFilename(icon.filename);
    setUploadMessage(null);

    try {
      await api.delete(`/upload/${encodeURIComponent(icon.filename)}`);
      setUploadedIcons((prev) => prev.filter((item) => item.filename !== icon.filename));

      if (value === icon.url) {
        onChange('');
      }

      setUploadMessage(t('iconPicker.deleted', { name: label }));
      setPendingDeleteIcon(null);
    } catch (err) {
      console.error('Delete failed', err);
      alert(t('iconPicker.deleteError'));
    } finally {
      setDeletingFilename(null);
    }
  };

  return (
    <div className="flex flex-col h-[680px] lg:h-[740px] bg-card overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-border bg-muted/30 p-2 gap-2">
        {iconPickerTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSearch('');
              setUploadMessage(null);
            }}
            type="button"
            className={cn(
              "flex-1 py-3 text-xs font-bold rounded-lg transition-colors uppercase tracking-widest",
              activeTab === tab.id ? "bg-background shadow-md text-accent border border-accent/20" : "text-muted-foreground hover:bg-background/40"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-5 lg:p-6 flex-1 overflow-hidden flex flex-col">
        {activeTab === 'library' ? (
          <div className="space-y-5 flex flex-col h-full">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-accent animate-spin" />}
              <input
                type="text"
                autoFocus
                placeholder={t('iconPicker.libraryPlaceholder')}
                className="w-full bg-background border border-border rounded-xl pl-12 pr-12 py-3.5 text-base focus:ring-1 focus:ring-accent outline-none ring-accent/20 transition-shadow font-medium"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-muted/20 p-1">
                {toneFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setToneFilter(filter.id)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-colors',
                      toneFilter === filter.id
                        ? 'bg-background text-accent shadow-sm border border-accent/20'
                        : 'text-muted-foreground hover:bg-background/50'
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <span className="text-xs text-muted-foreground whitespace-nowrap">{t('iconPicker.visibleCount', { count: filteredIcons.length })}</span>
            </div>

            {/* Icon Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {filteredIcons.map((name: string) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => { onChange(name); onClose(); }}
                  className={cn(
                    "p-4 rounded-xl flex flex-col items-center justify-center gap-2.5 hover:bg-accent/10 transition-colors border border-transparent hover:border-accent/20 group h-[118px]",
                    value === name ? "bg-accent/15 text-accent border-accent/40 shadow-inner" : "text-muted-foreground"
                  )}
                  title={name}
                >
                  <div className="h-12 w-12 flex items-center justify-center group-hover:scale-125 transition-transform duration-300">
                    <Icon icon={name} className="h-10 w-10" />
                  </div>
                  <span className="text-[10px] truncate w-full text-center font-bold opacity-60 group-hover:opacity-100">
                    {name.split(':').pop()}
                  </span>
                </button>
              ))}
              
              {!loading && filteredIcons.length === 0 && (
                <div className="col-span-full h-48 flex flex-col items-center justify-center text-muted-foreground gap-3">
                   <div className="p-4 bg-muted/30 rounded-full">
                     <Search className="h-8 w-8 opacity-20" />
                   </div>
                   <p className="text-xs italic text-center max-w-[240px]">
                     {search
                       ? t('iconPicker.searchNoResults', {
                           tone: toneFilter === 'all' ? '' : toneFilter === 'color' ? t('iconPicker.colorTone') : t('iconPicker.monoTone'),
                           search,
                         })
                       : t('iconPicker.filterNoIcons')}
                   </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full gap-3">
            {uploadMessage && (
              <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-xs font-medium text-foreground/85">
                {uploadMessage}
              </div>
            )}

            {/* Upload button row */}
            <label className={cn("cursor-pointer flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 transition-colors text-accent text-xs font-bold uppercase tracking-widest", uploading && "opacity-50 pointer-events-none")}>
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              {uploading ? t('iconPicker.uploading') : t('iconPicker.newUpload')}
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
            </label>

            {selectedUploadedIcon && (
              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                {t('iconPicker.selectedLabel')}: <span className="font-semibold text-foreground">{getUploadedIconLabel(selectedUploadedIcon)}</span>
              </div>
            )}

            {/* Uploaded icons grid */}
            {loadingUploaded ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : uploadedIcons.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border/40 rounded-xl p-8 text-center space-y-3 bg-muted/5">
                <div className="p-4 bg-accent/10 rounded-full text-accent">
                  <Upload className="h-8 w-8" />
                </div>
                <p className="text-xs font-black uppercase tracking-tight">{t('iconPicker.noUploads')}</p>
                <p className="text-[11px] text-muted-foreground max-w-[200px]">{t('iconPicker.firstUpload')}</p>
                <div className="pt-3 border-t border-border/20 w-full flex justify-between px-6 text-[9px] text-muted-foreground/60 font-medium">
                  <span>{t('iconPicker.allImageFormats')}</span>
                  <span>{t('iconPicker.max2mb')}</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {uploadedIcons.map(icon => (
                  <div
                    key={icon.filename}
                    className={cn(
                      'relative rounded-xl border transition-colors h-[148px]',
                      value === icon.url ? 'border-accent/40 bg-accent/10 shadow-inner' : 'border-transparent hover:border-accent/20'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => { onChange(icon.url); onClose(); }}
                      className="w-full h-full p-3 rounded-xl flex flex-col items-center justify-center gap-3 hover:bg-accent/10 transition-colors group"
                      title={getUploadedIconLabel(icon)}
                    >
                      <div className="h-14 w-14 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <img
                          src={icon.url}
                          alt={getUploadedIconLabel(icon)}
                          className="max-h-14 max-w-14 object-contain rounded"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                      <span className="w-full text-center text-xs font-semibold text-foreground/85 leading-tight break-all max-h-10 overflow-hidden">
                        {getUploadedIconLabel(icon)}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDeleteIcon(icon);
                      }}
                      disabled={deletingFilename === icon.filename}
                      className="absolute top-1.5 right-1.5 rounded-md border border-border/50 bg-background/90 p-1 text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors disabled:pointer-events-none"
                      title={`${getUploadedIconLabel(icon)} löschen`}
                    >
                      {deletingFilename === icon.filename ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {pendingDeleteIcon && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={t('iconPicker.closeDeleteDialog')}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setPendingDeleteIcon(null)}
          />

          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-card shadow-2xl">
            <div className="border-b border-[hsl(var(--glass-border)/0.05)] px-6 py-5">
              <div className="space-y-2 text-left">
                <h3 className="text-base font-black uppercase tracking-[0.18em] text-foreground/90">
                  {t('iconPicker.deleteTitle')}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t('iconPicker.deleteConfirm', { name: getUploadedIconLabel(pendingDeleteIcon) })}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingDeleteIcon(null)}
                className="rounded-xl"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void confirmDeleteUploadedIcon()}
                disabled={deletingFilename === pendingDeleteIcon.filename}
                className="gap-2 rounded-xl"
              >
                {deletingFilename === pendingDeleteIcon.filename && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
