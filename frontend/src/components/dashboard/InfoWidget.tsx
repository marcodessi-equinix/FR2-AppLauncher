import React, { useState, useEffect } from 'react';
import { Edit, Save, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { PreferredLanguage } from '../../store/useStore';
import api from '../../lib/api';
import DOMPurify from 'dompurify';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { RichTextEditor } from '../admin/RichTextEditor';
import { cn } from '../../lib/utils';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';

interface InfoWidgetProps {
  mainContent?: React.ReactNode;
  favoritesContent?: React.ReactNode;
}

export const InfoWidget: React.FC<InfoWidgetProps> = ({ mainContent, favoritesContent }) => {
  const isAdmin = useStore((state) => state.isAdmin);
  const editMode = useStore((state) => state.editMode);
  const preferredLanguage = useStore((state) => state.preferredLanguage);
  const setPreferredLanguage = useStore((state) => state.setPreferredLanguage);
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);
  const [content, setContent] = useState<{ de: string; en: string }>({ 
    de: 'Laden...', 
    en: 'Loading...' 
  });
  const [editDE, setEditDE] = useState('');
  const [editEN, setEditEN] = useState('');

  const activeContent = preferredLanguage === 'de' ? content.de : content.en;

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await api.get('/system/info');
        if (res.data.content) {
          try {
            const parsed = JSON.parse(res.data.content);
            if (parsed.de !== undefined && parsed.en !== undefined) {
              setContent(parsed);
            } else {
              setContent({ de: res.data.content, en: '' });
            }
          } catch {
            setContent({ de: res.data.content, en: 'Welcome to AppLauncher.' });
          }
        } else {
          setContent({ de: 'Willkommen im AppLauncher.', en: 'Welcome to AppLauncher.' });
        }
      } catch {
        setContent({ de: 'Willkommen im AppLauncher.', en: 'Welcome to AppLauncher.' });
      }
    };
    fetchInfo();
  }, []);

  const handleEdit = () => {
    setEditDE(content.de);
    setEditEN(content.en);
    setIsEditing(true);
  };

  const sanitizeForRender = (html: string) =>
    DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
    });

  const sanitizeHtml = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    const cleanElement = (element: Element) => {
      const classes = Array.from(element.classList);
      const classesToRemove = classes.filter(cls => 
        cls === 'text-white' || cls === 'text-black' || 
        cls.startsWith('text-gray-') || cls.startsWith('text-zinc-') ||
        cls.startsWith('text-slate-') || cls.startsWith('bg-')
      );
      classesToRemove.forEach(cls => element.classList.remove(cls));
      if (element.classList.length === 0) {
        element.removeAttribute('class');
      }
      Array.from(element.children).forEach(child => cleanElement(child));
    };
    cleanElement(div);
    return sanitizeForRender(div.innerHTML);
  };

  const handleSave = async () => {
    try {
      const cleanDE = sanitizeHtml(editDE);
      const cleanEN = sanitizeHtml(editEN);
      const newContent = { de: cleanDE, en: cleanEN };
      await api.post('/system/info', { content: JSON.stringify(newContent) });
      setContent(newContent);
      setEditDE(cleanDE);
      setEditEN(cleanEN);
      setIsEditing(false);
    } catch {
      console.error('Failed to save info');
      alert('Fehler beim Speichern');
    }
  };

  const langOptions: { id: PreferredLanguage; label: string; flag: string }[] = [
    { id: 'de', label: 'DE', flag: 'fi fi-de' },
    { id: 'en', label: 'EN', flag: 'fi fi-us' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-top-2 duration-500">
      {isEditing ? (
        <Card className="relative group/widget border-primary/20 bg-background/80 backdrop-blur-xl shadow-[0_0_30px_-10px_rgba(var(--primary-rgb),0.2)] overflow-hidden mb-6">
          <CardContent className="p-5 md:p-6 relative z-10">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                      <Info className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                      <h2 className="text-lg font-bold text-foreground">System Announcements</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Edit maintenance banners and announcements</p>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 bg-muted/30 p-5 rounded-xl border border-border/50">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                      <span className="fi fi-de text-base rounded-sm overflow-hidden"></span>
                      <label className="text-[10px] font-black text-foreground/80 uppercase tracking-[0.2em]">Deutsch</label>
                  </div>
                  <RichTextEditor content={editDE} onChange={setEditDE} placeholder="Infos auf Deutsch..." />
                </div>
                <div className="space-y-2 bg-muted/30 p-5 rounded-xl border border-border/50">
                   <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                      <span className="fi fi-us text-base rounded-sm overflow-hidden"></span>
                      <label className="text-[10px] font-black text-foreground/80 uppercase tracking-[0.2em]">English</label>
                  </div>
                  <RichTextEditor content={editEN} onChange={setEditEN} placeholder="Info in English..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsEditing(false)} className="rounded-xl px-6">Cancel</Button>
                <Button variant="default" onClick={handleSave} className="gap-2 rounded-xl px-6 shadow-lg shadow-primary/20">
                  <Save className="h-4 w-4" /> Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Single Announcement Card with language toggle */
        <Card className="relative group/widget border-primary/10 bg-background/80 backdrop-blur-xl shadow-sm overflow-hidden mb-6 transition-colors duration-300 hover:border-primary/20">
          <CardContent className="p-0 relative z-10">
            {/* Compact header with language toggle */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                  <span className="text-[10px] font-bold text-foreground/80 uppercase tracking-[0.15em]">
                    {preferredLanguage === 'de' ? 'Ankündigung' : 'Announcement'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Language Toggle */}
                <div className="flex items-center rounded-lg bg-muted/50 p-0.5 border border-border/30">
                  {langOptions.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setPreferredLanguage(lang.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200",
                        preferredLanguage === lang.id
                          ? "bg-primary/15 text-primary shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className={cn(lang.flag, "text-sm rounded-sm overflow-hidden")} />
                      {lang.label}
                    </button>
                  ))}
                </div>

                {isAdmin && editMode && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleEdit}
                    className="h-7 w-7 text-muted-foreground/40 hover:text-primary hover:bg-primary/10 rounded-lg"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Content area — compact with expand */}
            <div className={cn(
              "px-4 py-3 relative overflow-hidden transition-all duration-300",
              isExpanded ? "max-h-none" : "max-h-[100px]"
            )}>
              <div 
                className="prose prose-sm max-w-none text-foreground/90 leading-relaxed font-medium
                prose-headings:text-foreground prose-headings:text-sm prose-headings:font-bold
                prose-p:text-foreground/80 prose-p:text-sm prose-p:my-1
                prose-strong:text-foreground prose-ul:text-foreground/80 prose-ul:my-1"
                dangerouslySetInnerHTML={{ __html: sanitizeForRender(activeContent) }}
              />
              {!isExpanded && (
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/95 to-transparent pointer-events-none" />
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-border/20">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                {isExpanded ? (
                  <><ChevronUp className="h-3 w-3" /> {preferredLanguage === 'de' ? 'Weniger' : 'Less'}</>
                ) : (
                  <><ChevronDown className="h-3 w-3" /> {preferredLanguage === 'de' ? 'Mehr anzeigen' : 'Show more'}</>
                )}
              </button>
              <button
                onClick={() => setShowFullModal(true)}
                className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                {preferredLanguage === 'de' ? 'Vollansicht' : 'Full view'}
                <span className="text-sm leading-none">→</span>
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Favorites */}
      {favoritesContent && (
        <div className="mb-6">{favoritesContent}</div>
      )}

      {/* Main content — groups flow naturally */}
      {mainContent && (
        <div className="space-y-2">{mainContent}</div>
      )}

      {/* Full Announcement Modal */}
      <Dialog open={showFullModal} onOpenChange={(open) => !open && setShowFullModal(false)}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-background/95 border-border p-0 rounded-2xl backdrop-blur-xl shadow-2xl">
              <DialogHeader className="p-5 border-b border-border/50 sticky top-0 bg-background/95 z-50 backdrop-blur-xl flex flex-row items-center justify-between">
                   <div className="flex items-center gap-3">
                      <span className={cn("text-2xl rounded-sm overflow-hidden", preferredLanguage === 'de' ? 'fi fi-de' : 'fi fi-us')} />
                       <div>
                          <DialogTitle className="text-lg font-bold text-foreground">
                              {preferredLanguage === 'de' ? 'Systemmitteilungen' : 'System Announcements'}
                          </DialogTitle>
                          <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              <p className="text-[10px] text-primary font-bold uppercase tracking-widest">
                                  {preferredLanguage === 'de' ? 'Wichtige Informationen' : 'Important Information'}
                              </p>
                          </div>
                       </div>
                  </div>
                  {/* Language switch in modal too */}
                  <div className="flex items-center rounded-lg bg-muted/50 p-0.5 border border-border/30">
                    {langOptions.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => setPreferredLanguage(lang.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200",
                          preferredLanguage === lang.id
                            ? "bg-primary/15 text-primary shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <span className={cn(lang.flag, "text-sm rounded-sm overflow-hidden")} />
                        {lang.label}
                      </button>
                    ))}
                  </div>
              </DialogHeader>
              
              <div className="p-8">
                <div 
                  className="prose prose-base max-w-none 
                  prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight
                  prose-p:text-muted-foreground prose-p:leading-relaxed
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                  prose-ul:text-muted-foreground prose-li:marker:text-primary/50
                  prose-strong:text-foreground prose-strong:font-bold
                  dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: sanitizeForRender(activeContent) }}
                />
              </div>
              
              <DialogFooter className="p-5 border-t border-border/50 sticky bottom-0 bg-background/95 z-50 backdrop-blur-xl">
                   <Button onClick={() => setShowFullModal(false)} className="w-full sm:w-auto px-6 rounded-xl">
                      {preferredLanguage === 'de' ? 'Schließen' : 'Close'}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
};
