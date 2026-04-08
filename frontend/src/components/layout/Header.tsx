import React, { Suspense } from 'react';
import { Search, Lock, Unlock, Moon, Sun, LogOut, Upload, Info, Download, Languages } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useWeather } from '../../hooks/useWeather';
import api, { parseBookmarks, ImportPreviewData } from '../../lib/api';
import { Button } from '../ui/button';
import { LiveClock } from './Clocks';
import { downloadBookmarksFile } from '../../lib/bookmarkExport';
import { useI18n } from '../../lib/i18n';

const LoginModal = React.lazy(async () => {
  const module = await import('../admin/LoginModal');
  return { default: module.LoginModal };
});

const WeatherModal = React.lazy(async () => {
  const module = await import('../widgets/WeatherModal');
  return { default: module.WeatherModal };
});

const ImportPreviewModal = React.lazy(async () => {
  const module = await import('../admin/ImportPreviewModal');
  return { default: module.ImportPreviewModal };
});

const InfoModal = React.lazy(async () => {
  const module = await import('../dashboard/InfoModal');
  return { default: module.InfoModal };
});

export const Header: React.FC = () => {
  const { language, toggleLanguage, t } = useI18n();
  const searchQuery = useStore((state) => state.searchQuery);
  const setSearchQuery = useStore((state) => state.setSearchQuery);
  const isAdmin = useStore((state) => state.isAdmin);
  const setIsAdmin = useStore((state) => state.setIsAdmin);
  const toggleEditMode = useStore((state) => state.toggleEditMode);
  const editMode = useStore((state) => state.editMode);
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const groups = useStore((state) => state.groups);
  const [isLoginOpen, setIsLoginOpen] = React.useState(false);
  const [isWeatherOpen, setIsWeatherOpen] = React.useState(false);
  const [isInfoOpen, setIsInfoOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  
  // Import State
  const [importData, setImportData] = React.useState<ImportPreviewData | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);

  const { weather, loading: weatherLoading } = useWeather();
  const hasExportableLinks = groups.some((group) => (group.links?.length || 0) > 0);
  
  // File upload ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      setIsAdmin(false);
      setIsImportModalOpen(false);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleExportClick = () => {
    if (!hasExportableLinks) {
      return;
    }

    try {
      setIsExporting(true);
      downloadBookmarksFile(groups);
    } catch (error) {
      console.error('Export failed', error);
      alert(t('header.exportError'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        const data = await parseBookmarks(file);
        setImportData(data);
        setIsImportModalOpen(true);
    } catch (error) {
        console.error('Parse failed', error);
      alert(t('header.readFileError', { error: String(error) }));
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <header className="app-header sticky top-0 z-50 w-full border-b border-[hsl(var(--glass-border)/0.08)] bg-[linear-gradient(180deg,hsl(var(--glass-bg)/0.78),hsl(var(--glass-bg)/0.58))] backdrop-blur-lg">
        {/* Top highlight line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[hsl(var(--glass-highlight)/0.1)] to-transparent" />
        
        <div className="w-full px-4 py-2 md:px-[clamp(24px,3vw,72px)] md:py-2.5">
          <div className="flex flex-col gap-2 xl:grid xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center xl:gap-x-8 xl:gap-y-2">
            <div className="flex items-center gap-4 shrink-0 xl:justify-self-start">
              <div className="brand-lockup flex items-center gap-4">
                <img 
                  src="/logo.png" 
                  alt="AppLauncher" 
                  className="h-10 w-auto object-contain drop-shadow-[0_16px_32px_hsl(var(--glow)/0.28)] md:h-11 lg:h-12"
                />
                <div className="flex flex-col">
                  <span className="brand-title text-lg font-black tracking-tight leading-tight md:text-[1.28rem]">AppLauncher</span>
                  <span className="header-subtitle-stack mt-1.5">
                    <span
                      aria-hidden="true"
                      className="header-subtitle-reserve text-[10px] font-semibold uppercase leading-none tracking-[0.24em]"
                    >
                      Plattform für Anwendungszugriff
                    </span>
                    <span className="header-subtitle-current text-[10px] font-semibold uppercase leading-none tracking-[0.24em] text-muted-foreground/70">
                      {t('header.applicationAccessPlatform')}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="min-w-0 xl:flex xl:justify-center">
              <div className="relative group xl:w-full xl:max-w-3xl">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-200" />
                <input 
                  type="text"
                  placeholder={t('header.searchPlaceholder')}
                  className="h-10 w-full rounded-2xl glass-input pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground/45 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 xl:justify-self-end xl:justify-end xl:flex-nowrap">
              <div className="flex items-center gap-2 ml-auto xl:ml-0">
                <button 
                  onClick={() => setIsInfoOpen(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
                >
                  <Info className="h-4 w-4" />
                  {t('header.infoButton')}
                </button>

                <div className="telemetry-shell hidden xl:flex items-center gap-2 rounded-2xl border border-[hsl(var(--glass-border)/0.08)] bg-[hsl(var(--glass-highlight)/0.03)] px-3 py-2">
                  <button 
                    onClick={() => setIsWeatherOpen(true)}
                    className="flex items-center gap-2 rounded-xl px-2 py-1 transition-colors duration-200 hover:bg-[hsl(var(--glass-highlight)/0.05)] group"
                  >
                    {weatherLoading || !weather ? (
                      <div className="h-6 w-6 bg-muted-foreground/20 rounded-full animate-pulse" />
                    ) : (
                      <div className="h-6 w-6 flex items-center justify-center pointer-events-none transition-transform duration-300 group-hover:scale-110">
                        <weather.current.icon className="header-weather-icon w-full h-full drop-shadow-md" />
                      </div>
                    )}
                    <span className="text-sm font-bold tabular-nums text-foreground group-hover:text-primary transition-colors">
                      {weatherLoading || !weather ? '--' : `${weather.current.temp}°`}
                    </span>
                  </button>
                  <LiveClock />
                </div>
              </div>

              <div className="toolbar-shell ml-auto flex items-center gap-1 rounded-full border border-[hsl(var(--glass-border)/0.08)] bg-[hsl(var(--glass-highlight)/0.03)] p-1 xl:ml-0">
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-[hsl(var(--glass-highlight)/0.05)] hover:text-foreground"
                  title={t('header.switchLanguage')}
                  aria-label={t('header.switchLanguage')}
                >
                  <Languages className="h-3.5 w-3.5 text-primary" />
                  <span>{language.toUpperCase()}</span>
                </button>

                <button
                  type="button"
                  onClick={handleThemeToggle}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-[hsl(var(--glass-highlight)/0.05)] hover:text-foreground"
                  title={theme === 'dark' ? t('header.switchToLightMode') : t('header.switchToDarkMode')}
                >
                  {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-primary" /> : <Moon className="h-3.5 w-3.5 text-primary" />}
                  <span className="hidden sm:inline">{theme === 'dark' ? t('common.light') : t('common.dark')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsWeatherOpen(true)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[hsl(var(--glass-highlight)/0.05)] hover:text-foreground xl:hidden"
                  title={t('header.showWeather')}
                >
                  {weatherLoading || !weather ? (
                    <div className="h-4 w-4 rounded-full bg-muted-foreground/20 animate-pulse" />
                  ) : (
                    <weather.current.icon className="header-weather-icon h-4 w-4" />
                  )}
                </button>

                {isAdmin ? (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".html"
                      title={t('header.importBookmarks')}
                      onChange={handleFileChange}
                    />

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 disabled:text-muted-foreground/50"
                      title={hasExportableLinks ? t('header.exportBookmarks') : t('header.noBookmarksToExport')}
                      aria-label={t('header.exportBookmarks')}
                      onClick={handleExportClick}
                      disabled={isExporting || !hasExportableLinks}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>

                    {editMode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-primary hover:bg-primary/10"
                        title={t('header.importBookmarks')}
                        onClick={handleImportClick}
                      >
                        <Upload className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    <Button 
                      variant={editMode ? "default" : "ghost"} 
                      size="icon" 
                      className="h-8 w-8 rounded-full"
                      onClick={toggleEditMode}
                      title={editMode ? t('header.endEditMode') : t('header.startEditMode')}
                    >
                      {editMode ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                      onClick={handleLogout}
                      title={t('header.logout')}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setIsLoginOpen(true)}
                    className="h-8 rounded-full border-primary/15 bg-transparent px-4 text-[11px] font-semibold transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  >
                    {t('common.admin')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <Suspense fallback={null}>
        {isLoginOpen ? <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} /> : null}
        {isWeatherOpen ? <WeatherModal isOpen={isWeatherOpen} onClose={() => setIsWeatherOpen(false)} data={weather} /> : null}
        {isImportModalOpen ? (
          <ImportPreviewModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} data={importData} />
        ) : null}
        {isInfoOpen ? <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} /> : null}
      </Suspense>
    </>
  );
};
