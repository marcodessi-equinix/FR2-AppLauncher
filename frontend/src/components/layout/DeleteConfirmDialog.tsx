import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
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

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName?: string;
  itemUrl?: string;
  items?: Array<{
    name: string;
    url?: string;
  }>;
  isDeleting?: boolean;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  itemUrl,
  items,
  isDeleting = false,
}) => {
  const { t } = useI18n();
  const listItems = items && items.length > 0
    ? items
    : itemName
      ? [{ name: itemName, url: itemUrl }]
      : [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-card max-w-lg overflow-hidden rounded-3xl border border-rose-500/18 bg-background/94 p-0 text-foreground shadow-2xl backdrop-blur-xl [&>button]:hidden">
        <div className="overflow-hidden rounded-3xl">
          <div className="border-b border-rose-500/10 px-6 py-5">
            <DialogHeader className="space-y-0 text-left">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center pt-0.5 text-rose-300">
                    <AlertTriangle className="h-7 w-7 drop-shadow-[0_0_12px_rgba(244,63,94,0.35)]" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-rose-200/90">
                      <Trash2 className="h-3 w-3" />
                      {t('deleteDialog.warning')}
                    </div>
                    <DialogTitle className="text-xl font-black tracking-tight text-foreground">
                      {title}
                    </DialogTitle>
                    <DialogDescription className="max-w-md text-[13px] leading-relaxed text-muted-foreground/80">
                      {description}
                    </DialogDescription>
                    {listItems.length > 0 ? (
                      <div className="max-w-full">
                        <div className="max-h-[34vh] space-y-2.5 overflow-y-auto pr-1 custom-scrollbar">
                          {listItems.map((item, index) => (
                            <div key={`${item.name}-${index}`}>
                              <div className="rounded-2xl border border-rose-500/12 bg-rose-500/6 px-4 py-3">
                                <div className="break-words text-sm font-semibold leading-relaxed text-foreground/90">
                                  {item.name}
                                </div>
                              </div>
                              {item.url ? (
                                <div className="mt-2 break-all px-1 text-[11px] font-normal leading-relaxed text-muted-foreground/68">
                                  {item.url}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <DialogClose asChild>
                  <button
                    type="button"
                    title={t('common.close')}
                    aria-label={t('common.close')}
                    className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-[hsl(var(--glass-highlight)/0.05)] hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </DialogClose>
              </div>
            </DialogHeader>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4">
            <Button variant="outline" onClick={onClose} className="rounded-xl" disabled={isDeleting}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="rounded-xl border border-rose-500/18 bg-rose-500/90 text-white shadow-lg shadow-rose-500/20 transition-colors hover:bg-rose-500"
            >
              {t('deleteDialog.confirm')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
