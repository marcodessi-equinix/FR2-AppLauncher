import React from 'react';
import { History, Sparkles, X } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { getAppChangelog } from '../../lib/changelog';
import { useI18n } from '../../lib/i18n';

interface VersionChangelogDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentVersion: string;
  buildVersion: string;
  releaseVersion: string;
  buildDate: string;
}

export const VersionChangelogDialog: React.FC<VersionChangelogDialogProps> = ({
  isOpen,
  onOpenChange,
  currentVersion,
  buildVersion,
  releaseVersion,
  buildDate,
}) => {
  const { language, t } = useI18n();
  const changelogEntries = React.useMemo(() => getAppChangelog(language), [language]);
  const versionDescription = buildVersion === releaseVersion
    ? t('version.descriptionReleaseOnly', { releaseVersion, buildDate })
    : t('version.descriptionWithBuild', { releaseVersion, buildVersion, buildDate });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-4xl overflow-hidden rounded-3xl border border-[hsl(var(--glass-border)/0.1)] bg-background/92 p-0 text-foreground shadow-2xl backdrop-blur-xl [&>button]:hidden">
        <div className="overflow-hidden rounded-3xl">
          <div className="border-b border-[hsl(var(--glass-border)/0.05)] px-8 py-6">
            <DialogHeader className="space-y-0 text-left">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[hsl(var(--glass-border)/0.08)] bg-[hsl(var(--glass-highlight)/0.05)] text-primary/80 shadow-[0_0_20px_-12px_hsl(var(--glow)/0.45)]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-primary/80">
                      <History className="h-3.5 w-3.5" />
                      {t('version.releaseNotes')}
                    </div>
                    <DialogTitle className="text-2xl font-black tracking-tight text-foreground md:text-[1.75rem]">
                      {currentVersion}
                    </DialogTitle>
                    <DialogDescription className="max-w-2xl text-sm leading-relaxed text-muted-foreground/80">
                      {versionDescription}
                    </DialogDescription>
                  </div>
                </div>

                <DialogClose asChild>
                  <button
                    type="button"
                    title={t('version.closeWindow')}
                    aria-label={t('version.closeWindow')}
                    className="p-2 hover:bg-[hsl(var(--glass-highlight)/0.05)] rounded-xl transition-colors text-muted-foreground hover:text-foreground active:scale-90"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </DialogClose>
              </div>
            </DialogHeader>
          </div>

          <div className="max-h-[68vh] overflow-y-auto px-8 py-6 custom-scrollbar">
            <div className="space-y-4">
              {changelogEntries.map((entry) => (
                <section
                  key={`${entry.version}-${entry.date}`}
                  className="rounded-[1.4rem] border border-[hsl(var(--glass-border)/0.08)] bg-[linear-gradient(180deg,hsl(var(--card)/0.58),hsl(var(--card)/0.32))] p-5 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.55)]"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-primary/80">
                        <History className="h-3.5 w-3.5" />
                        {entry.version}
                      </div>
                      <h3 className="text-lg font-bold tracking-tight text-foreground">
                        {entry.title}
                      </h3>
                    </div>
                    <span className="rounded-full border border-[hsl(var(--glass-border)/0.08)] bg-[hsl(var(--glass-highlight)/0.04)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80">
                      {entry.date}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    {entry.items.map((item) => (
                      <div key={item} className="flex items-start gap-3 text-sm leading-relaxed text-foreground/88">
                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                        <p>{item}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <div className="flex justify-end border-t border-[hsl(var(--glass-border)/0.05)] px-8 py-5">
            <Button type="button" className="rounded-xl" onClick={() => onOpenChange(false)}>
              {t('version.close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};