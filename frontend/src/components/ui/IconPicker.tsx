import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Icon } from '@iconify/react';
import { Search, Upload, Loader2, Info, X, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

interface IconifyResult {
  icons: string[];
  total: number;
}

type IconPickerTab = 'library' | 'upload';

const ICON_PICKER_TABS: { id: IconPickerTab; label: string }[] = [
  { id: 'library', label: 'Bibliothek (Alle Icons)' },
  { id: 'upload', label: 'Eigener Upload' },
];

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, onClose }) => {
  const [activeTab, setActiveTab] = useState<IconPickerTab>('library');
  const [search, setSearch] = useState('');
  const [icons, setIcons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedIcons, setUploadedIcons] = useState<{ url: string; filename: string }[]>([]);
  const [loadingUploaded, setLoadingUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default icons for "Empty Search"
  const defaultIcons = useMemo(() => [
    'lucide:home', 'lucide:settings', 'lucide:user', 'lucide:mail', 'lucide:bell',
    'lucide:search', 'lucide:heart', 'lucide:star', 'lucide:camera', 'lucide:image',
    'mdi:facebook', 'mdi:twitter', 'mdi:instagram', 'mdi:github', 'mdi:linkedin',
    'logos:google-icon', 'logos:microsoft-icon', 'logos:apple', 'logos:slack-icon'
  ], []);

  useEffect(() => {
    if (activeTab !== 'library') return;

    const timer = setTimeout(async () => {
      if (!search.trim()) {
        setIcons(defaultIcons);
        return;
      }

      setLoading(true);
      try {
        // Iconify Public API for searching
        const response = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(search)}&limit=100`);
        const data: IconifyResult = await response.json();
        setIcons(data.icons || []);
      } catch (err) {
        console.error('Failed to search icons:', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search, activeTab, defaultIcons]);

  useEffect(() => {
    if (activeTab !== 'upload') return;
    setLoadingUploaded(true);
    api.get<{ url: string; filename: string }[]>('/upload/')
      .then(res => setUploadedIcons(res.data || []))
      .catch(() => setUploadedIcons([]))
      .finally(() => setLoadingUploaded(false));
  }, [activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be selected again
    e.target.value = '';

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/upload/icon', formData);
      const newIcon = { url: res.data.url, filename: res.data.filename };
      setUploadedIcons(prev => [newIcon, ...prev]);
      onChange(res.data.url);
      onClose();
    } catch (err) {
      console.error('Upload failed', err);
      alert('Fehler beim Upload. Bitte erneut versuchen.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-[520px] bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/10">
        <h3 className="text-sm font-black uppercase tracking-widest text-foreground/80">Icon wählen</h3>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border bg-muted/30 p-1.5 gap-1.5">
        {ICON_PICKER_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); setSearch(''); }}
            type="button"
            className={cn(
              "flex-1 py-2 text-[11px] font-bold rounded transition-colors uppercase tracking-widest",
              activeTab === t.id ? "bg-background shadow-md text-accent border border-accent/20" : "text-muted-foreground hover:bg-background/40"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 flex-1 overflow-hidden flex flex-col">
        {activeTab === 'library' ? (
          <div className="space-y-4 flex flex-col h-full">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent animate-spin" />}
              <input
                type="text"
                autoFocus
                placeholder="Suche in 200.000+ Icons (z.B. home, car, google)..."
                className="w-full bg-background border border-border rounded-lg pl-10 pr-10 py-2.5 text-sm focus:ring-1 focus:ring-accent outline-none ring-accent/20 transition-shadow font-medium"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            {/* Legend / Info */}
            {!search && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 p-2 rounded-md border border-border/20">
                <Info className="h-3.5 w-3.5 text-accent" />
                <span>Nutzt die Iconify API für Zugriff auf Material, Lucide, Brand-Logos & mehr.</span>
              </div>
            )}

            {/* Icon Grid */}
            <div className="grid grid-cols-5 gap-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {icons.map((name: string) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => { onChange(name); onClose(); }}
                  className={cn(
                    "p-3 rounded-lg flex flex-col items-center justify-center gap-1.5 hover:bg-accent/10 transition-colors border border-transparent hover:border-accent/20 group h-[85px]",
                    value === name ? "bg-accent/15 text-accent border-accent/40 shadow-inner" : "text-muted-foreground"
                  )}
                  title={name}
                >
                  <div className="h-8 w-8 flex items-center justify-center group-hover:scale-125 transition-transform duration-300">
                    <Icon icon={name} className="h-7 w-7" />
                  </div>
                  <span className="text-[8px] truncate w-full text-center font-bold opacity-60 group-hover:opacity-100">
                    {name.split(':').pop()}
                  </span>
                </button>
              ))}
              
              {!loading && icons.length === 0 && search && (
                <div className="col-span-5 h-48 flex flex-col items-center justify-center text-muted-foreground gap-3">
                   <div className="p-4 bg-muted/30 rounded-full">
                     <Search className="h-8 w-8 opacity-20" />
                   </div>
                   <p className="text-xs italic">Keine Icons für "{search}" gefunden.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full gap-3">
            {/* Upload button row */}
            <label className={cn("cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 transition-colors text-accent text-xs font-bold uppercase tracking-widest", uploading && "opacity-50 pointer-events-none")}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {uploading ? 'Wird hochgeladen...' : 'Neues Icon hochladen'}
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
            </label>

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
                <p className="text-xs font-black uppercase tracking-tight">Noch keine Icons hochgeladen</p>
                <p className="text-[11px] text-muted-foreground max-w-[200px]">Lade dein erstes Icon hoch, um es hier zu sehen.</p>
                <div className="pt-3 border-t border-border/20 w-full flex justify-between px-6 text-[9px] text-muted-foreground/60 font-medium">
                  <span>SVG, PNG, WEBP</span>
                  <span>MAX 2MB</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {uploadedIcons.map(icon => (
                  <button
                    key={icon.filename}
                    type="button"
                    onClick={() => { onChange(icon.url); onClose(); }}
                    className={cn(
                      "p-2 rounded-lg flex flex-col items-center justify-center gap-1.5 hover:bg-accent/10 transition-colors border border-transparent hover:border-accent/20 group h-[85px]",
                      value === icon.url ? "bg-accent/15 border-accent/40 shadow-inner" : ""
                    )}
                    title={icon.filename}
                  >
                    <div className="h-10 w-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <img
                        src={icon.url}
                        alt={icon.filename}
                        className="max-h-10 max-w-10 object-contain rounded"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                    <span className="text-[8px] truncate w-full text-center font-bold text-muted-foreground opacity-60 group-hover:opacity-100">
                      {icon.filename.replace(/^icon-\d+-\d+/, '').replace(/^-/, '') || icon.filename}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
