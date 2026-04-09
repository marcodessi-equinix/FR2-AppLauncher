import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImagePlus, Loader2, Save, X } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { DynamicIcon } from '../ui/DynamicIcon';
import { IconPicker } from '../ui/IconPicker';
import { useI18n } from '../../lib/i18n';

interface BulkLinkIconModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (icon: string) => Promise<void>;
  selectedCount: number;
  initialIcon?: string;
}

export const BulkLinkIconModal: React.FC<BulkLinkIconModalProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedCount,
  initialIcon = '',
}) => {
  const { t } = useI18n();
  const [icon, setIcon] = useState(initialIcon);
  const [isSaving, setIsSaving] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIcon(initialIcon);
    }
  }, [initialIcon, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(icon);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 text-foreground">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={() => !isSaving && onClose()}
      />

      <Card className="light-modal-card relative z-10 w-full max-w-md overflow-hidden rounded-3xl border-white/10 bg-card/95 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[hsl(var(--glass-border)/0.05)] pb-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/90">
              {t('bulk.editIconsTitle')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground/75">
              {t('bulk.editIconsDescription', { count: selectedCount })}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            title={t('common.close')}
            aria-label={t('common.close')}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-[hsl(var(--glass-highlight)/0.05)] hover:text-foreground active:scale-90"
            disabled={isSaving}
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <CardContent className="space-y-4 pt-5">
          <div className="space-y-2">
            <label className="modal-field-label pl-1 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
              {t('common.icon')}
            </label>
            <div className="flex items-center gap-3">
              {icon ? (
                <div className="glass-surface flex h-10 w-10 items-center justify-center rounded-xl">
                  <DynamicIcon icon={icon} className="h-6 w-6" />
                </div>
              ) : (
                <div className="glass-surface flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground/50">
                  <ImagePlus className="h-5 w-5" />
                </div>
              )}

              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowIconPicker(true)}
                className="light-modal-secondary flex-1 rounded-xl"
              >
                {icon ? t('groups.changeIcon') : t('groups.selectIcon')}
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3 border-t border-[hsl(var(--glass-border)/0.05)] pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl" disabled={isSaving}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={() => void handleSave()} className="gap-2 rounded-xl" disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('common.save')}
          </Button>
        </CardFooter>
      </Card>

      {showIconPicker && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setShowIconPicker(false)}
          />
          <Card className="light-modal-card relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border-white/10 bg-card shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[hsl(var(--glass-border)/0.05)] px-6 py-4">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/90">
                {t('groups.selectIcon')}
              </h3>
              <button
                onClick={() => setShowIconPicker(false)}
                type="button"
                title={t('groups.closeIconPicker')}
                aria-label={t('groups.closeIconPicker')}
                className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-[hsl(var(--glass-highlight)/0.05)] hover:text-foreground active:scale-90"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <div className="flex-1 overflow-hidden bg-background p-0">
              <IconPicker
                value={icon}
                onChange={(value) => setIcon(value)}
                onClose={() => setShowIconPicker(false)}
              />
            </div>
          </Card>
        </div>
      )}
    </div>,
    document.body
  );
};
