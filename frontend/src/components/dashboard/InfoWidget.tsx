import React, { useState, useEffect, Suspense } from 'react';
import { Info, Plus, Edit, Trash2, Megaphone } from 'lucide-react';
import { useStore } from '../../store/useStore';
import api from '../../lib/api';
import DOMPurify from 'dompurify';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useI18n } from '../../lib/i18n';

import type { InfoCard } from '../../types/infoCard';
import { getCardTitle, getCardContent } from '../../types/infoCard';

const ManageInfoCardModal = React.lazy(async () => {
  const module = await import('../admin/ManageInfoCardModal');
  return { default: module.ManageInfoCardModal };
});

interface InfoWidgetProps {
  mainContent?: React.ReactNode;
  favoritesContent?: React.ReactNode;
}

export const InfoWidget: React.FC<InfoWidgetProps> = ({ mainContent, favoritesContent }) => {
  const { language, t } = useI18n();
  const isAdmin = useStore((state) => state.isAdmin);
  const editMode = useStore((state) => state.editMode);
  const [cards, setCards] = useState<InfoCard[]>([]);
  const [editingCard, setEditingCard] = useState<InfoCard | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await api.get('/system/info-cards');
        setCards(res.data.cards || []);
      } catch {
        setCards([]);
      }
    };
    fetchCards();
  }, []);

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
    <div className="animate-in fade-in slide-in-from-top-2 duration-500">
      {/* Info Cards */}
      {(cards.length > 0 || (isAdmin && editMode)) && (
        <Card className="relative group/widget border-primary/10 bg-background/80 backdrop-blur-xl shadow-sm overflow-hidden mb-6 transition-colors duration-300 hover:border-primary/20">
          <CardContent className="p-0 relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                  <span className="text-[10px] font-bold text-foreground/80 uppercase tracking-[0.15em]">
                    {t('info.systemAnnouncements')}
                  </span>
                </div>
              </div>
              {isAdmin && editMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddCard}
                  className="h-7 gap-1 text-[10px] font-bold text-muted-foreground/60 hover:text-primary hover:bg-primary/10 rounded-lg"
                >
                  <Plus className="h-3 w-3" />
                  {t('info.addCard')}
                </Button>
              )}
            </div>

            {/* Cards */}
            <div className="p-4 space-y-3">
              {cards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40">
                  <Megaphone className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs font-medium">{t('info.noCards')}</p>
                </div>
              ) : (
                cards.map((card) => (
                  <div
                    key={card.id}
                    className="rounded-xl border border-[hsl(var(--glass-border)/0.08)] bg-[linear-gradient(180deg,hsl(var(--card)/0.58),hsl(var(--card)/0.32))] p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-primary/70">
                          <Info className="h-3 w-3" />
                          {formatDate(card.createdAt)}
                        </div>
                        <h4 className="text-sm font-bold tracking-tight text-foreground">
                          {cardTitle(card)}
                        </h4>
                      </div>
                      {isAdmin && editMode && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => handleEditCard(card)}
                            title={t('info.editCard')}
                            className="p-1 rounded-md text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteCard(card.id)}
                            title={t('info.deleteCard')}
                            className="p-1 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div
                      className="mt-2 prose prose-sm max-w-none text-foreground/80 leading-relaxed
                        prose-headings:text-foreground prose-headings:text-xs prose-headings:font-bold
                        prose-p:text-foreground/75 prose-p:text-xs prose-p:my-0.5
                        prose-strong:text-foreground prose-strong:font-bold
                        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                        prose-ul:text-foreground/75 prose-ul:my-0.5 prose-ul:text-xs
                        dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: sanitizeForRender(cardContent(card)) }}
                    />
                  </div>
                ))
              )}
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
    </div>
  );
};
