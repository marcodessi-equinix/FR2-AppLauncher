import React from 'react';
import { CalendarDays, GitBranch, Hash, History, Rocket, Sparkles, TriangleAlert, X } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
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
  releaseVersion: string;
  gitSha: string;
  buildDate: string;
  buildTime: string;
  buildNumber: string;
}

export const VersionChangelogDialog: React.FC<VersionChangelogDialogProps> = ({
  isOpen,
  onOpenChange,
  currentVersion,
  releaseVersion,
  gitSha,
  buildDate,
  buildTime,
  buildNumber,
}) => {
  const { language, t } = useI18n();
  const changelogEntries = React.useMemo(() => getAppChangelog(language), [language]);
  const currentEntry = React.useMemo(
    () => changelogEntries.find((entry) => entry.version === releaseVersion) ?? changelogEntries[0],
    [changelogEntries, releaseVersion],
  );

  const formatReleaseDate = React.useCallback(
    (value: string) => {
      const parsed = Date.parse(`${value}T00:00:00`);
      if (Number.isNaN(parsed)) {
        return value;
      }

      return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      }).format(new Date(parsed));
    },
    [language],
  );

  const formatMetaValue = React.useCallback(
    (value: string) => {
      const trimmed = value.trim();
      return trimmed || t('version.unavailable');
    },
    [t],
  );

  const metaCards = React.useMemo(
    () => [
      {
        key: 'release',
        icon: Rocket,
        label: t('version.releaseLabel'),
        value: formatMetaValue(releaseVersion),
        helper: currentEntry?.title || t('version.latestReleaseFallback'),
      },
      {
        key: 'sha',
        icon: GitBranch,
        label: t('version.gitShaLabel'),
        value: formatMetaValue(gitSha),
        helper: currentVersion,
      },
      {
        key: 'buildDate',
        icon: CalendarDays,
        label: t('version.buildDateLabel'),
        value: formatMetaValue(buildDate),
        helper: buildTime ? `${t('version.buildTimeLabel')}: ${buildTime}` : t('version.unavailable'),
      },
      {
        key: 'buildNumber',
        icon: Hash,
        label: t('version.buildNumberLabel'),
        value: formatMetaValue(buildNumber),
        helper: t('version.currentBuildLabel'),
      },
    ],
    [buildDate, buildNumber, buildTime, currentEntry?.title, currentVersion, formatMetaValue, gitSha, releaseVersion, t],
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card w-[min(94vw,78rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-[hsl(var(--glass-border)/0.1)] bg-background/92 p-0 text-foreground shadow-2xl backdrop-blur-xl [&>button]:hidden">
        <div className="flex max-h-[90vh] min-h-0 flex-col overflow-hidden rounded-[2rem]">
          <div className="border-b border-[hsl(var(--glass-border)/0.05)] px-8 py-7">
            <DialogHeader className="space-y-0 text-left">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] border border-[hsl(var(--glass-border)/0.08)] bg-[linear-gradient(180deg,hsl(var(--glass-highlight)/0.08),hsl(var(--glass-highlight)/0.03))] text-primary/85 shadow-[0_0_28px_-16px_hsl(var(--glow)/0.5)]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary/85">
                      <History className="h-3.5 w-3.5" />
                      {t('version.currentReleaseBadge')}
                    </div>
                    <DialogTitle className="space-y-3">
                      <div className="text-[2rem] font-black tracking-tight text-foreground md:text-[2.25rem]">
                        {currentVersion}
                      </div>
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground/72">
                        {t('version.releaseLabel')}: {releaseVersion}
                      </div>
                      <div className="max-w-3xl text-base font-semibold leading-snug tracking-tight text-foreground/90 md:text-[1.15rem]">
                        {currentEntry?.title || t('version.latestReleaseFallback')}
                      </div>
                    </DialogTitle>
                    {currentEntry?.highlights.length ? (
                      <div className="flex flex-wrap gap-2">
                        {currentEntry.highlights.map((highlight) => (
                          <span
                            key={highlight}
                            className="rounded-full border border-[hsl(var(--glass-border)/0.08)] bg-[hsl(var(--glass-highlight)/0.05)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/72"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground/82 md:text-[0.95rem]">
                      {currentEntry?.summary || t('version.description', { releaseVersion, gitSha, buildDate })}
                    </p>
                    <div className="text-xs font-bold tracking-[0.16em] text-muted-foreground/74">
                      {currentVersion}
                    </div>
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

          <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
            <div className="space-y-5 pb-2">
              <section className="rounded-[1.5rem] border border-[hsl(var(--glass-border)/0.08)] bg-[linear-gradient(180deg,hsl(var(--glass-highlight)/0.05),hsl(var(--glass-highlight)/0.03))] p-4 md:p-5">
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-primary/82">
                      {t('version.buildSnapshotLabel')}
                    </div>
                    <div className="mt-1 text-sm leading-relaxed text-muted-foreground/78">
                      {t('version.buildSnapshotDescription')}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {metaCards.map((card) => {
                    const Icon = card.icon;

                    return (
                      <div
                        key={card.key}
                        className="flex min-h-[8.35rem] flex-col justify-between rounded-[1.2rem] border border-[hsl(var(--glass-border)/0.08)] bg-[hsl(var(--glass-highlight)/0.04)] p-4 shadow-[0_16px_30px_-26px_rgba(0,0,0,0.45)]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/75">
                            {card.label}
                          </div>
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--glass-border)/0.08)] bg-[hsl(var(--glass-highlight)/0.05)] text-primary/80">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="break-words text-base font-black tracking-tight text-foreground">
                            {card.value}
                          </div>
                          <div className="text-xs leading-relaxed text-muted-foreground/72">
                            {card.helper}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-primary/82">
                      {t('version.historyLabel')}
                    </div>
                    <div className="mt-1 text-sm leading-relaxed text-muted-foreground/78">
                      {t('version.historyDescription')}
                    </div>
                  </div>
                </div>
              </section>

              {changelogEntries.map((entry) => (
                <section
                  key={`${entry.version}-${entry.date}`}
                  className={`rounded-[1.45rem] border bg-[linear-gradient(180deg,hsl(var(--card)/0.58),hsl(var(--card)/0.32))] p-5 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.55)] ${entry.version === releaseVersion ? 'border-primary/20 shadow-[0_24px_48px_-30px_hsl(var(--glow)/0.45)]' : 'border-[hsl(var(--glass-border)/0.08)]'}`}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-primary/80">
                          <History className="h-3.5 w-3.5" />
                          {entry.version}
                          {entry.version === releaseVersion ? (
                            <span className="rounded-full border border-primary/18 bg-primary/10 px-2 py-0.5 text-[9px] tracking-[0.18em] text-primary/90">
                              {t('version.currentReleaseBadge')}
                            </span>
                          ) : null}
                        </div>
                        <h3 className="text-xl font-black tracking-tight text-foreground">
                          {entry.title}
                        </h3>
                        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground/82">
                          {entry.summary}
                        </p>
                      </div>
                      <span className="rounded-full border border-[hsl(var(--glass-border)/0.08)] bg-[hsl(var(--glass-highlight)/0.04)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80">
                        {formatReleaseDate(entry.date)}
                      </span>
                    </div>

                    {entry.highlights.length ? (
                      <div className="space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/72">
                          {t('version.highlightsLabel')}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {entry.highlights.map((item) => (
                            <span
                              key={`${entry.version}-${item}`}
                              className="rounded-full border border-[hsl(var(--glass-border)/0.08)] bg-[hsl(var(--glass-highlight)/0.05)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/72"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {entry.importantChanges.length ? (
                      <div className="rounded-[1.1rem] border border-amber-400/16 bg-amber-400/6 p-4">
                        <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/90">
                          <TriangleAlert className="h-3.5 w-3.5" />
                          {t('version.importantChangesLabel')}
                        </div>
                        <div className="space-y-2.5">
                          {entry.importantChanges.map((item) => (
                            <div key={`${entry.version}-important-${item}`} className="flex items-start gap-3 text-sm leading-relaxed text-foreground/88">
                              <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300/80" />
                              <p>{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-3 lg:grid-cols-2">
                      {entry.sections.map((section) => (
                        <div
                          key={`${entry.version}-${section.title}`}
                          className="rounded-[1.1rem] border border-[hsl(var(--glass-border)/0.08)] bg-[hsl(var(--glass-highlight)/0.04)] p-4"
                        >
                          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/72">
                            {section.title}
                          </div>
                          <div className="space-y-2.5">
                            {section.items.map((item) => (
                              <div key={`${section.title}-${item}`} className="flex items-start gap-3 text-sm leading-relaxed text-foreground/88">
                                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                                <p>{item}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
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
