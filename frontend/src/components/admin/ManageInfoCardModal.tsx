import React, { useState } from 'react';
import { Save, X, FileText, Languages, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { RichTextEditor } from './RichTextEditor';
import { useI18n } from '../../lib/i18n';
import { getCardTitle, getCardContent } from '../../types/infoCard';
import type { InfoCard } from '../../types/infoCard';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '../ui/dialog';

interface ManageInfoCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (card: InfoCard) => void;
  card?: InfoCard | null;
}

export const ManageInfoCardModal: React.FC<ManageInfoCardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  card,
}) => {
  const { language, t } = useI18n();
  const [title, setTitle] = useState(card ? getCardTitle(card, language) : '');
  const [content, setContent] = useState(card ? getCardContent(card, language) : '');
  const [isSaving, setIsSaving] = useState(false);

  const prevCardId = React.useRef(card?.id);
  if (prevCardId.current !== card?.id) {
    prevCardId.current = card?.id;
    setTitle(card ? getCardTitle(card, language) : '');
    setContent(card ? getCardContent(card, language) : '');
  }

  /** Strip HTML tags for plain-text translation */
  const stripHtml = (html: string): string => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  /** Translate via MyMemory API (runs in browser — always has internet) */
  const translateText = async (text: string, from: 'de' | 'en', to: 'de' | 'en'): Promise<string | null> => {
    const plain = stripHtml(text).trim().slice(0, 500);
    if (!plain) return null;
    try {
      const langPair = `${from}|${to}`;
      const encoded = encodeURIComponent(plain);
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encoded}&langpair=${langPair}`);
      const data = await res.json();
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        const translated = data.responseData.translatedText as string;
        if (translated.startsWith('MYMEMORY WARNING')) return null;
        return translated;
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    if (!title.trim() || isSaving) return;
    setIsSaving(true);

    const sourceLang = language;
    const targetLang: 'de' | 'en' = language === 'de' ? 'en' : 'de';

    // Translate title and content in the browser before saving
    const [translatedTitle, translatedContent] = await Promise.all([
      translateText(title.trim(), sourceLang, targetLang),
      translateText(content, sourceLang, targetLang),
    ]);

    const newCard: InfoCard = {
      id: card?.id || crypto.randomUUID(),
      title_de: sourceLang === 'de' ? title.trim() : (translatedTitle || title.trim()),
      title_en: sourceLang === 'en' ? title.trim() : (translatedTitle || title.trim()),
      content_de: sourceLang === 'de' ? content : (translatedContent ? `<p>${translatedContent}</p>` : content),
      content_en: sourceLang === 'en' ? content : (translatedContent ? `<p>${translatedContent}</p>` : content),
      createdAt: card?.createdAt || new Date().toISOString(),
    };

    onSave(newCard);
    setIsSaving(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-card max-w-3xl overflow-hidden rounded-3xl border border-[hsl(var(--glass-border)/0.1)] bg-background/92 p-0 text-foreground shadow-2xl backdrop-blur-xl [&>button]:hidden">
        <div className="overflow-hidden rounded-3xl">
          {/* Header */}
          <div className="border-b border-[hsl(var(--glass-border)/0.05)] px-8 py-6">
            <DialogHeader className="space-y-0 text-left">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[hsl(var(--glass-border)/0.08)] bg-[hsl(var(--glass-highlight)/0.05)] text-primary/80 shadow-[0_0_20px_-12px_hsl(var(--glow)/0.45)]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-primary/80">
                      <FileText className="h-3.5 w-3.5" />
                      {card ? t('info.editCard') : t('info.newCard')}
                    </div>
                    <DialogTitle className="text-2xl font-black tracking-tight text-foreground md:text-[1.75rem]">
                      {card ? t('info.editCardTitle') : t('info.newCardTitle')}
                    </DialogTitle>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                      <Languages className="h-3.5 w-3.5" />
                      {t('info.autoTranslateHint')}
                    </div>
                  </div>
                </div>
                <DialogClose asChild>
                  <button
                    type="button"
                    title={t('common.close')}
                    aria-label={t('common.close')}
                    className="p-2 hover:bg-[hsl(var(--glass-highlight)/0.05)] rounded-xl transition-colors text-muted-foreground hover:text-foreground active:scale-90"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </DialogClose>
              </div>
            </DialogHeader>
          </div>

          {/* Form Content */}
          <div className="max-h-[60vh] overflow-y-auto px-8 py-6 custom-scrollbar space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.22em] text-foreground/70">
                {t('info.cardTitleLabel')}
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('info.cardTitlePlaceholder')}
                className="rounded-xl border-[hsl(var(--glass-border)/0.12)] bg-[hsl(var(--glass-highlight)/0.03)] text-base font-semibold"
                autoFocus
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.22em] text-foreground/70">
                {t('info.cardContentLabel')}
              </label>
              <div className="rounded-xl border border-[hsl(var(--glass-border)/0.08)] bg-[hsl(var(--glass-highlight)/0.02)] p-1">
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder={t('info.cardContentPlaceholder')}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="flex justify-end border-t border-[hsl(var(--glass-border)/0.05)] px-8 py-5">
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="rounded-xl px-6">
                {t('common.cancel')}
              </Button>
              <Button
                variant="default"
                onClick={handleSave}
                disabled={!title.trim() || isSaving}
                className="gap-2 rounded-xl px-6 shadow-lg shadow-primary/20"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? t('info.translatingAndSaving') : t('common.save')}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
