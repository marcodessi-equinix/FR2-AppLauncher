import React, { useState, useEffect, Suspense } from 'react';
import { Info, Plus, Edit, Trash2, X, Megaphone } from 'lucide-react';
import { useStore } from '../../store/useStore';
import api from '../../lib/api';
import DOMPurify from 'dompurify';
import { Button } from '../ui/button';
import { useI18n } from '../../lib/i18n';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

import type { InfoCard } from '../../types/infoCard';
import { getCardTitle, getCardContent } from '../../types/infoCard';

const ManageInfoCardModal = React.lazy(async () => {
  const module = await import('../admin/ManageInfoCardModal');
  return { default: module.ManageInfoCardModal };
});

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  const { language, t } = useI18n();
  const isAdmin = useStore((state) => state.isAdmin);
  const editMode = useStore((state) => state.editMode);
  const [cards, setCards] = useState<InfoCard[]>([]);
  const [editingCard, setEditingCard] = useState<InfoCard | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchCards = async () => {
      try {
        const res = await api.get('/system/info-cards');
        setCards(res.data.cards || []);
      } catch {
        setCards([]);
      }
    };
    fetchCards();
  }, [isOpen]);

  const sanitizeForRender = (html: string) =>
    DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
    });

  const cardTitle = (card: InfoCard) => getCardTitle(card, language);
  const cardContent = (card: InfoCard) => getCardContent(card, language);

  const saveCards = async (newCards: InfoCard[]) => {
    try {
      const res = await api.post('/system/info-cards', { cards: newCards });
      // Use the response which includes auto-translated content from backend
      if (res.data.cards) {
        setCards(res.data.cards);
      } else {
        setCards(newCards);
      }
    } catch {
      console.error('Failed to save info cards');
    }
  };

  const handleAddCard = () => {
    setEditingCard(null);
    setIsCardModalOpen(true);
  };

  const handleEditCard = (card: InfoCard) => {
    setEditingCard(card);
    setIsCardModalOpen(true);
  };

  const handleDeleteCard = (cardId: string) => {
    const newCards = cards.filter((c) => c.id !== cardId);
    saveCards(newCards);
  };

  const handleSaveCard = (card: InfoCard) => {
    let newCards: InfoCard[];
    const idx = cards.findIndex((c) => c.id === card.id);
    if (idx >= 0) {
      newCards = [...cards];
      newCards[idx] = card;
    } else {
      newCards = [card, ...cards];
    }
    saveCards(newCards);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="glass-card max-w-4xl overflow-hidden rounded-3xl border border-[hsl(var(--glass-border)/0.1)] bg-background/92 p-0 text-foreground shadow-2xl backdrop-blur-xl [&>button]:hidden">
          <div className="overflow-hidden rounded-3xl">
            {/* Header — identical style to VersionChangelogDialog */}
            <div className="border-b border-[hsl(var(--glass-border)/0.05)] px-8 py-6">
              <DialogHeader className="space-y-0 text-left">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[hsl(var(--glass-border)/0.08)] bg-[hsl(var(--glass-highlight)/0.05)] text-primary/80 shadow-[0_0_20px_-12px_hsl(var(--glow)/0.45)]">
                      <Megaphone className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-primary/80">
                        <Info className="h-3.5 w-3.5" />
                        {t('info.systemAnnouncements')}
                      </div>
                      <DialogTitle className="text-2xl font-black tracking-tight text-foreground md:text-[1.75rem]">
                        {t('info.importantInformation')}
                      </DialogTitle>
                      <DialogDescription className="max-w-2xl text-sm leading-relaxed text-muted-foreground/80">
                        {t('info.description')}
                      </DialogDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdmin && editMode && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleAddCard}
                        className="gap-1.5 rounded-xl text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t('info.addCard')}
                      </Button>
                    )}
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
                </div>
              </DialogHeader>
            </div>

            {/* Cards list */}
            <div className="max-h-[68vh] overflow-y-auto px-8 py-6 custom-scrollbar">
              {cards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/60">
                  <Megaphone className="h-12 w-12 mb-4 opacity-30" />
                  <p className="text-sm font-medium">{t('info.noCards')}</p>
                  {isAdmin && editMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddCard}
                      className="mt-4 gap-1.5 rounded-xl text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t('info.addFirstCard')}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {cards.map((card) => (
                    <section
                      key={card.id}
                      className="rounded-[1.4rem] border border-[hsl(var(--glass-border)/0.08)] bg-[linear-gradient(180deg,hsl(var(--card)/0.58),hsl(var(--card)/0.32))] p-5 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.55)]"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-primary/80">
                            <Info className="h-3.5 w-3.5" />
                            {t('info.announcement')}
                          </div>
                          <h3 className="text-lg font-bold tracking-tight text-foreground">
                            {cardTitle(card)}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-[hsl(var(--glass-border)/0.08)] bg-[hsl(var(--glass-highlight)/0.04)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80">
                            {formatDate(card.createdAt)}
                          </span>
                          {isAdmin && editMode && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditCard(card)}
                                className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
                                title={t('info.editCard')}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCard(card.id)}
                                className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title={t('info.deleteCard')}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card content — rich HTML */}
                      <div className="mt-4">
                        <div
                          className="prose prose-sm max-w-none text-foreground/88 leading-relaxed
                            prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight
                            prose-p:text-foreground/80 prose-p:leading-relaxed prose-p:my-1.5
                            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                            prose-ul:text-foreground/80 prose-li:marker:text-primary/50
                            prose-strong:text-foreground prose-strong:font-bold
                            prose-em:text-foreground/90
                            dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: sanitizeForRender(cardContent(card)) }}
                        />
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end border-t border-[hsl(var(--glass-border)/0.05)] px-8 py-5">
              <Button type="button" className="rounded-xl" onClick={onClose}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Card editor modal */}
      <Suspense fallback={null}>
        {isCardModalOpen && (
          <ManageInfoCardModal
            isOpen={isCardModalOpen}
            onClose={() => {
              setIsCardModalOpen(false);
              setEditingCard(null);
            }}
            onSave={handleSaveCard}
            card={editingCard}
          />
        )}
      </Suspense>
    </>
  );
};
