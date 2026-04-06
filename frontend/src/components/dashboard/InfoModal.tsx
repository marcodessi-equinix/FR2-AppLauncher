import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Edit, Save, Info } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { PreferredLanguage } from '../../store/useStore';
import api from '../../lib/api';
import DOMPurify from 'dompurify';
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

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  const isAdmin = useStore((state) => state.isAdmin);
  const editMode = useStore((state) => state.editMode);
  const preferredLanguage = useStore((state) => state.preferredLanguage);
  const setPreferredLanguage = useStore((state) => state.setPreferredLanguage);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState<{ de: string; en: string }>({ 
    de: 'Laden...', 
    en: 'Loading...' 
  });
  const [editDE, setEditDE] = useState('');
  const [editEN, setEditEN] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [activeEditor, setActiveEditor] = useState<'de' | 'en' | null>(null);
  const translateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeEditorRef = useRef<'de' | 'en' | null>(null);

  const activeContent = preferredLanguage === 'de' ? content.de : content.en;

  useEffect(() => {
    if (!isOpen) return;
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
            setContent({ de: res.data.content, en: 'Welcome to FR2 AppLauncher.' });
          }
        } else {
          setContent({ de: 'Willkommen im FR2 AppLauncher.', en: 'Welcome to FR2 AppLauncher.' });
        }
      } catch {
        setContent({ de: 'Willkommen im FR2 AppLauncher.', en: 'Welcome to FR2 AppLauncher.' });
      }
    };
    fetchInfo();
  }, [isOpen]);

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

  const stripHtml = (html: string): string => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const translateText = useCallback(async (text: string, fromLang: 'de' | 'en'): Promise<string | null> => {
    const plainText = stripHtml(text).trim();
    if (!plainText) return null;

    try {
      const langPair = fromLang === 'de' ? 'de|en' : 'en|de';
      const encoded = encodeURIComponent(plainText.slice(0, 500));
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encoded}&langpair=${langPair}`);
      const data = await res.json();
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        let translated = data.responseData.translatedText as string;
        if (translated.startsWith('MYMEMORY WARNING')) return null;
        if (text.includes('<')) {
          translated = `<p>${translated}</p>`;
        }
        return translated;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const scheduleTranslation = useCallback((text: string, fromLang: 'de' | 'en') => {
    if (translateTimerRef.current) clearTimeout(translateTimerRef.current);
    setIsTranslating(true);
    translateTimerRef.current = setTimeout(async () => {
      const result = await translateText(text, fromLang);
      if (result) {
        if (fromLang === 'de' && activeEditorRef.current === 'de') {
          setEditEN(result);
        } else if (fromLang === 'en' && activeEditorRef.current === 'en') {
          setEditDE(result);
        }
      }
      setIsTranslating(false);
    }, 800);
  }, [translateText]);

  const handleEdit = () => {
    setEditDE(content.de);
    setEditEN(content.en);
    setActiveEditor(null);
    activeEditorRef.current = null;
    setIsEditing(true);
  };

  const handleDEChange = useCallback((value: string) => {
    setEditDE(value);
    setActiveEditor('de');
    activeEditorRef.current = 'de';
    scheduleTranslation(value, 'de');
  }, [scheduleTranslation]);

  const handleENChange = useCallback((value: string) => {
    setEditEN(value);
    setActiveEditor('en');
    activeEditorRef.current = 'en';
    scheduleTranslation(value, 'en');
  }, [scheduleTranslation]);

  const handleSave = async () => {
    try {
      const cleanDE = sanitizeHtml(editDE);
      const cleanEN = sanitizeHtml(editEN);
      const newContent = { de: cleanDE, en: cleanEN };
      await api.post('/system/info', { content: JSON.stringify(newContent) });
      setContent(newContent);
      setIsEditing(false);
    } catch {
      console.error('Failed to save info');
      alert('Fehler beim Speichern');
    }
  };

  const langOptions: { id: PreferredLanguage; label: string; flag: string }[] = [
    { id: 'de', label: 'Deutsch', flag: 'fi fi-de' },
    { id: 'en', label: 'English', flag: 'fi fi-us' },
  ];

  const handleClose = () => {
    if (translateTimerRef.current) clearTimeout(translateTimerRef.current);
    setActiveEditor(null);
    setIsEditing(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto bg-background/95 border-border p-0 rounded-2xl backdrop-blur-xl shadow-2xl">
        <DialogHeader className="p-5 border-b border-border/50 sticky top-0 bg-background/95 z-50 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                <Info className="h-5 w-5 text-primary" />
              </div>
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

            <div className="flex items-center gap-2">
              {/* Language toggle */}
              {!isEditing && (
                <div className="flex items-center rounded-lg bg-muted/50 p-0.5 border border-border/30">
                  {langOptions.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setPreferredLanguage(lang.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200",
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
              )}

              {isAdmin && editMode && !isEditing && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleEdit}
                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        
        {isEditing ? (
          /* Side-by-side editors: DE left, EN right */
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* German editor — left */}
              <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
                  <span className="fi fi-de text-base rounded-sm overflow-hidden" />
                  <label className="text-[10px] font-black text-foreground/80 uppercase tracking-[0.2em]">Deutsch</label>
                  {isTranslating && activeEditor === 'en' && (
                    <span className="text-[9px] text-primary/60 animate-pulse ml-auto">auto-translating...</span>
                  )}
                </div>
                <RichTextEditor 
                  content={editDE} 
                  onChange={handleDEChange} 
                  placeholder="Infos auf Deutsch..." 
                />
              </div>

              {/* English editor — right */}
              <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
                  <span className="fi fi-us text-base rounded-sm overflow-hidden" />
                  <label className="text-[10px] font-black text-foreground/80 uppercase tracking-[0.2em]">English</label>
                  {isTranslating && activeEditor === 'de' && (
                    <span className="text-[9px] text-primary/60 animate-pulse ml-auto">auto-translating...</span>
                  )}
                </div>
                <RichTextEditor 
                  content={editEN} 
                  onChange={handleENChange} 
                  placeholder="Info in English..." 
                />
              </div>
            </div>
          </div>
        ) : (
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
        )}
        
        <DialogFooter className="p-5 border-t border-border/50 sticky bottom-0 bg-background/95 z-50 backdrop-blur-xl">
          {isEditing ? (
            <div className="flex w-full justify-end gap-3">
              <Button variant="outline" onClick={() => setIsEditing(false)} className="rounded-xl px-6">
                Abbrechen
              </Button>
              <Button variant="default" onClick={handleSave} className="gap-2 rounded-xl px-6 shadow-lg shadow-primary/20">
                <Save className="h-4 w-4" /> Speichern
              </Button>
            </div>
          ) : (
            <Button onClick={handleClose} className="w-full sm:w-auto px-6 rounded-xl">
              {preferredLanguage === 'de' ? 'Schließen' : 'Close'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
