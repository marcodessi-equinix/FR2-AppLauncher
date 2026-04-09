import React from 'react';
import { Info, Link2, Plus, Trash2, X } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { useI18n } from '../../lib/i18n';
import type { LinkAnnouncementSnapshotItem } from '../../lib/linkAnnouncements';

interface LinkChangesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  added: LinkAnnouncementSnapshotItem[];
  removed: LinkAnnouncementSnapshotItem[];
  isFirstRun: boolean;
}

const LinkChangeList: React.FC<{
  items: LinkAnnouncementSnapshotItem[];
  title: string;
  tone: 'green' | 'red';
}> = ({ items, title, tone }) => {
  const { t } = useI18n();
  const [expanded, setExpanded] = React.useState(false);

  if (items.length === 0) {
    return null;
  }

  const isGreen = tone === 'green';
  const previewLimit = 8;
  const hasOverflow = items.length > previewLimit;
  const visibleItems = expanded ? items : items.slice(0, previewLimit);

  return (
    <section
      className={
        isGreen
          ? 'rounded-[1.1rem] border border-emerald-400/14 bg-[linear-gradient(180deg,rgba(16,185,129,0.09),rgba(16,185,129,0.03))] p-4 shadow-[0_14px_30px_-24px_rgba(16,185,129,0.35)]'
          : 'rounded-[1.1rem] border border-rose-400/14 bg-[linear-gradient(180deg,rgba(244,63,94,0.09),rgba(244,63,94,0.03))] p-4 shadow-[0_14px_30px_-24px_rgba(244,63,94,0.35)]'
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
          {isGreen ? <Plus className="h-3 w-3 text-emerald-300" /> : <Trash2 className="h-3 w-3 text-rose-300" />}
          <span className={isGreen ? 'text-emerald-200/90' : 'text-rose-200/90'}>{title}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-foreground/70">
            {items.length}
          </span>
        </div>

        {hasOverflow ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
          >
            {expanded ? t('dashboard.hide') : `${t('dashboard.show')} ${items.length}`}
          </button>
        ) : null}
      </div>

      <div className="mt-3 space-y-2.5">
        {visibleItems.map((item) => (
          <div
            key={`${tone}-${item.id}`}
            className="rounded-[0.95rem] border border-white/8 bg-background/28 px-3.5 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="text-sm font-semibold leading-snug tracking-tight text-foreground">{item.title}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
                  {item.groupTitle}
                </div>
                {item.url ? (
                  <div className="truncate text-[11px] text-muted-foreground/68">{item.url}</div>
                ) : null}
              </div>
              <span
                className={
                  isGreen
                    ? 'mt-1 shrink-0 rounded-full border border-emerald-400/18 bg-emerald-400/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/85'
                    : 'mt-1 shrink-0 rounded-full border border-rose-400/18 bg-rose-400/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-200/85'
                }
              >
                {isGreen ? '+' : '-'}
              </span>
            </div>
          </div>
        ))}

        {!expanded && hasOverflow ? (
          <div className="px-1 pt-1 text-[11px] text-muted-foreground/65">
            {t('changes.hiddenEntries', { count: items.length - previewLimit })}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export const LinkChangesDialog: React.FC<LinkChangesDialogProps> = ({
  isOpen,
  onClose,
  added,
  removed,
  isFirstRun,
}) => {
  const { t } = useI18n();
  const hasChanges = added.length > 0 || removed.length > 0;

  if (!hasChanges) {
    return null;
  }

    return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-card w-[min(92vw,64rem)] max-w-5xl overflow-hidden rounded-3xl border border-[hsl(var(--glass-border)/0.1)] bg-background/92 p-0 text-foreground shadow-2xl backdrop-blur-xl [&>button]:hidden">
        <div className="overflow-hidden rounded-3xl">
          <div className="border-b border-[hsl(var(--glass-border)/0.05)] px-6 py-5">
            <DialogHeader className="space-y-0 text-left">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[hsl(var(--glass-border)/0.08)] bg-[hsl(var(--glass-highlight)/0.05)] text-primary/80 shadow-[0_0_20px_-12px_hsl(var(--glow)/0.45)]">
                    <Link2 className="h-4.5 w-4.5" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">
                      <Info className="h-3 w-3" />
                      {t('changes.systemUpdate')}
                    </div>
                    <DialogTitle className="text-xl font-black tracking-tight text-foreground md:text-[1.55rem]">
                      {t('changes.linkChangesTitle')}
                    </DialogTitle>
                    <DialogDescription className="max-w-2xl text-[13px] leading-relaxed text-muted-foreground/78">
                      {isFirstRun ? t('changes.linkChangesFirstRunDescription') : t('changes.linkChangesDescription')}
                    </DialogDescription>
                  </div>
                </div>

                <DialogClose asChild>
                  <button
                    type="button"
                    title={t('changes.closeWindow')}
                    aria-label={t('changes.closeWindow')}
                    className="p-2 hover:bg-[hsl(var(--glass-highlight)/0.05)] rounded-xl transition-colors text-muted-foreground hover:text-foreground active:scale-90"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </DialogClose>
              </div>
            </DialogHeader>
          </div>

          <div className="max-h-[72vh] overflow-y-auto px-6 py-5 custom-scrollbar">
            <div className="space-y-4">
              <section className="grid gap-2.5 md:grid-cols-3">
                <div className="rounded-[1rem] border border-[hsl(var(--glass-border)/0.08)] bg-[hsl(var(--glass-highlight)/0.04)] p-3.5">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/75">
                    {t('changes.statusLabel')}
                  </div>
                  <div className="mt-1.5 text-sm font-semibold text-foreground">
                    {isFirstRun ? t('changes.firstStartLabel') : t('changes.oneTimeNoticeLabel')}
                  </div>
                </div>
                <div className="rounded-[1rem] border border-emerald-400/14 bg-emerald-400/5 p-3.5">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200/80">
                    {t('changes.addedLinksLabel')}
                  </div>
                  <div className="mt-1.5 text-sm font-semibold text-foreground">{added.length}</div>
                </div>
                <div className="rounded-[1rem] border border-rose-400/14 bg-rose-400/5 p-3.5">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-200/80">
                    {t('changes.removedLinksLabel')}
                  </div>
                  <div className="mt-1.5 text-sm font-semibold text-foreground">{removed.length}</div>
                </div>
              </section>

              <LinkChangeList items={added} title={t('changes.addedLinksSection')} tone="green" />
              <LinkChangeList items={removed} title={t('changes.removedLinksSection')} tone="red" />
            </div>
          </div>

          <div className="flex justify-end border-t border-[hsl(var(--glass-border)/0.05)] px-6 py-4">
            <Button type="button" className="rounded-xl" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
