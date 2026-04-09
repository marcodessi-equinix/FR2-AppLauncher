import type { PreferredLanguage } from '../store/useStore';

interface LocalizedText {
  de: string;
  en: string;
}

export interface ChangelogSection {
  title: string;
  items: string[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  summary: string;
  highlights: string[];
  importantChanges: string[];
  sections: ChangelogSection[];
}

interface LocalizedChangelogSection {
  title: LocalizedText;
  items: LocalizedText[];
}

interface LocalizedChangelogEntry {
  version: string;
  date: string;
  title: LocalizedText;
  summary: LocalizedText;
  highlights: LocalizedText[];
  importantChanges?: LocalizedText[];
  sections: LocalizedChangelogSection[];
}

const APP_CHANGELOG: LocalizedChangelogEntry[] = [
  {
    version: 'v2.1.0',
    date: '2026-04-09',
    title: {
      de: 'Deployment-Profile, Admin-Workflow und Release-Kommunikation geschärft',
      en: 'Deployment profiles, admin workflow, and release communication refined',
    },
    summary: {
      de: 'Aktueller Produktstand mit klar getrennten Deployment-Modi, robusterer Versionsdiagnostik und einem deutlich erweiterten Admin-Workflow.',
      en: 'Current product state with clearly separated deployment modes, stronger version diagnostics, and a substantially expanded admin workflow.',
    },
    highlights: [
      {
        de: 'Direktzugriff und Proxy-Only Compose',
        en: 'Direct access and proxy-only compose',
      },
      {
        de: 'Multi-Link-Administration',
        en: 'Multi-link administration',
      },
      {
        de: 'Bereinigte Release-Historie',
        en: 'Cleaned-up release history',
      },
    ],
    importantChanges: [
      {
        de: 'Standard-Deployments laufen jetzt über docker-compose.yml mit veröffentlichtem APP_PORT. Für reine Reverse-Proxy-Setups gibt es docker-compose.proxy.yml und .env.proxy.example.',
        en: 'Standard deployments now run through docker-compose.yml with a published APP_PORT. Pure reverse-proxy setups use docker-compose.proxy.yml and .env.proxy.example.',
      },
      {
        de: 'Die Versionshistorie wurde bewusst auf echte Produktmeilensteine konsolidiert. Frühere Zwischenstände vom selben Ausbauzyklus sind zusammengeführt.',
        en: 'The release history was deliberately consolidated into actual product milestones. Earlier intermediate states from the same delivery cycle are grouped together.',
      },
    ],
    sections: [
      {
        title: {
          de: 'Deployment und Portabilität',
          en: 'Deployment and portability',
        },
        items: [
          {
            de: 'Direktes Host-Port-Deployment und Proxy-Only-Deployment sind jetzt sauber getrennt, inklusive eigener Compose- und Env-Vorlagen.',
            en: 'Direct host-port deployment and proxy-only deployment are now cleanly separated, including dedicated compose and env templates.',
          },
          {
            de: 'Backup und Restore arbeiten auf named volumes statt Projektordnern und passen damit sauber zum Container-Betrieb.',
            en: 'Backup and restore now operate on named volumes instead of project folders, aligning cleanly with container-based operation.',
          },
          {
            de: 'README, Installationspfad und Compose-Dateien wurden auf den tatsächlichen Betriebsmodus des Projekts abgestimmt.',
            en: 'README, installation flow, and compose files were aligned with the project’s actual operating model.',
          },
        ],
      },
      {
        title: {
          de: 'Release und Diagnose',
          en: 'Release and diagnostics',
        },
        items: [
          {
            de: 'Build- und Runtime-Konfigurationen sind im Backend zentralisiert; /api/health und /api/system/version liefern verwendbare Versionsdaten für Diagnosezwecke.',
            en: 'Build and runtime configuration are centralized in the backend; /api/health and /api/system/version now expose usable version data for diagnostics.',
          },
          {
            de: 'Release-Version, Git SHA, Build-Datum und Build-Nummer bleiben auch mit CI-Overrides oder ohne Git-Metadaten robust anzeigbar.',
            en: 'Release version, Git SHA, build date, and build number remain displayable even with CI overrides or without Git metadata.',
          },
        ],
      },
      {
        title: {
          de: 'Admin und UX',
          en: 'Admin and UX',
        },
        items: [
          {
            de: 'Mehrfachauswahl für Links, Sammel-Löschvorgänge und ein Bulk-Dialog für gemeinsame Icon-Änderungen erweitern den Admin-Workflow.',
            en: 'Multi-select for links, batch deletion, and a bulk dialog for shared icon changes expand the admin workflow.',
          },
          {
            de: 'Neue Dialoge für Link-Änderungen, Löschbestätigungen und Info-Ankündigungen verbessern Transparenz und Bedienbarkeit.',
            en: 'New dialogs for link changes, delete confirmation, and info announcements improve transparency and usability.',
          },
          {
            de: 'Die Import-Vorschau wurde für größere Datenmengen überarbeitet und reagiert beim Verschieben stabiler.',
            en: 'The import preview was reworked for larger datasets and behaves more reliably during drag-and-drop.',
          },
        ],
      },
      {
        title: {
          de: 'Qualität und Konsistenz',
          en: 'Quality and consistency',
        },
        items: [
          {
            de: 'Fehlerausgaben in Modals sind klarer, Theme-Wechsel laufen ohne visuelle Sprünge und Light-Theme-Details wurden nachgeschärft.',
            en: 'Modal error feedback is clearer, theme switches avoid visible jumps, and light-theme details were refined.',
          },
          {
            de: 'Mehrere UI-Texte und Systemhinweise wurden überarbeitet, damit Bedienung und Release-Kommunikation konsistenter wirken.',
            en: 'Several UI texts and system hints were revised so interaction and release communication feel more consistent.',
          },
        ],
      },
    ],
  },
  {
    version: 'v2.0.0',
    date: '2026-04-08',
    title: {
      de: 'Portable Open-Source-Basis freigegeben',
      en: 'Portable open-source baseline released',
    },
    summary: {
      de: 'Die Anwendung wurde von projektspezifischer Infrastruktur gelöst und als portables Open-Source-Projekt neu aufgestellt.',
      en: 'The application was detached from project-specific infrastructure and repositioned as a portable open-source project.',
    },
    highlights: [
      {
        de: 'Vendor-neutrale Bereinigung',
        en: 'Vendor-neutral cleanup',
      },
      {
        de: 'Automatische Build-Metadaten',
        en: 'Automatic build metadata',
      },
      {
        de: 'Plattformneutraler Betrieb',
        en: 'Platform-neutral operation',
      },
    ],
    importantChanges: [
      {
        de: 'Bisherige Proxy-, Netzwerk- und Naming-Annahmen wurden entfernt oder umbenannt. Bestehende Deployments sollten Compose- und Env-Dateien auf den neuen Stand anheben.',
        en: 'Previous proxy, network, and naming assumptions were removed or renamed. Existing deployments should align their compose and env files with the new baseline.',
      },
    ],
    sections: [
      {
        title: {
          de: 'Portabilität und Packaging',
          en: 'Portability and packaging',
        },
        items: [
          {
            de: 'Hart codierte URLs, Hostnamen und vendor-spezifische Konfigurationen wurden entfernt.',
            en: 'Hardcoded URLs, hostnames, and vendor-specific configuration were removed.',
          },
          {
            de: 'Dokumentation, Branding-Texte und Lizenzierung wurden für die öffentliche Nutzung als Open-Source-Projekt aufbereitet.',
            en: 'Documentation, branding text, and licensing were prepared for public open-source usage.',
          },
          {
            de: 'Umgebungsvariablen und Benennung wurden bereinigt, damit Deployments verständlicher und reproduzierbarer bleiben.',
            en: 'Environment variables and naming were cleaned up so deployments remain easier to understand and reproduce.',
          },
        ],
      },
      {
        title: {
          de: 'Build und Release-Sichtbarkeit',
          en: 'Build and release visibility',
        },
        items: [
          {
            de: 'Die UI zeigt Release-Version, Git SHA, Build-Datum und Build-Nummer automatisch aus dem Build-Prozess an.',
            en: 'The UI shows release version, Git SHA, build date, and build number automatically from the build pipeline.',
          },
          {
            de: 'Frontend-Builds funktionieren auch in Docker- und CI-Umgebungen ohne verfügbares Git-Repository.',
            en: 'Frontend builds continue to work in Docker and CI environments even when no Git repository is available.',
          },
        ],
      },
      {
        title: {
          de: 'Sicherheit und Runtime-Härtung',
          en: 'Security and runtime hardening',
        },
        items: [
          {
            de: 'Healthchecks, Caching und Frontend-Bootstrapping wurden bereinigt, damit der Stack zuverlässiger startet.',
            en: 'Health checks, caching, and frontend bootstrapping were cleaned up so the stack starts more reliably.',
          },
          {
            de: 'Mehrere Sicherheitskorrekturen härten Import, Sanitizing und Icon-Verarbeitung zusätzlich ab.',
            en: 'Several security fixes additionally harden import handling, sanitizing, and icon processing.',
          },
        ],
      },
    ],
  },
  {
    version: 'v1.6.0',
    date: '2026-04-07',
    title: {
      de: 'Reverse-Proxy-Verhalten, Startup und Versionsanzeige konsolidiert',
      en: 'Reverse proxy behavior, startup, and version visibility consolidated',
    },
    summary: {
      de: 'Mehrere kurzfristige Proxy-, Startup- und Versionsanzeige-Änderungen wurden zu einem stabilen Zwischenrelease zusammengeführt.',
      en: 'Several short-cycle proxy, startup, and version-visibility changes were combined into a stable intermediate release.',
    },
    highlights: [
      {
        de: 'Reverse-Proxy-Stabilisierung',
        en: 'Reverse proxy stabilization',
      },
      {
        de: 'Sichtbare Release-Metadaten',
        en: 'Visible release metadata',
      },
      {
        de: 'Einfacherer Startpfad',
        en: 'Simplified startup path',
      },
    ],
    importantChanges: [
      {
        de: 'Dieser Eintrag fasst mehrere Zwischenstände vom selben Ausbauzyklus zusammen, die zuvor künstlich als eigene Releases geführt wurden.',
        en: 'This entry combines several intermediate states from the same delivery cycle that were previously tracked as separate releases.',
      },
    ],
    sections: [
      {
        title: {
          de: 'Netzwerk und Proxy',
          en: 'Networking and proxy',
        },
        items: [
          {
            de: 'Proxy-Timeouts, gzip/default_server, Cookie-Sicherheit hinter Reverse Proxies und die Backend-Upstream-Konfiguration wurden mehrfach nachgeschärft.',
            en: 'Proxy timeouts, gzip/default_server behavior, secure cookies behind reverse proxies, and backend upstream configuration were refined repeatedly.',
          },
          {
            de: 'Instabile Netzwerk-Experimente wurden zurückgenommen, bis ein belastbares Compose-Modell erreicht war.',
            en: 'Unstable networking experiments were rolled back until a dependable compose model was reached.',
          },
        ],
      },
      {
        title: {
          de: 'Kompatibilität und Startverhalten',
          en: 'Compatibility and startup behavior',
        },
        items: [
          {
            de: 'Runtime-config-Kompatibilität für gecachte Frontend-Bundles wurde gesichert und Browser-Startblocker entfernt.',
            en: 'Runtime-config compatibility for cached frontend bundles was preserved and browser startup blockers were removed.',
          },
          {
            de: 'Frontend und Backend starten zuverlässiger in der richtigen Reihenfolge.',
            en: 'Frontend and backend now start more reliably in the correct order.',
          },
        ],
      },
      {
        title: {
          de: 'Release-Sichtbarkeit',
          en: 'Release visibility',
        },
        items: [
          {
            de: 'Die sichtbare Release-Version wurde zentralisiert und um automatische Build-Nummern ergänzt.',
            en: 'The visible release version was centralized and extended with automatic build numbers.',
          },
          {
            de: 'Der Versionsdialog wurde als eigene UI eingeführt und anschließend erweitert.',
            en: 'The version dialog was introduced as its own UI surface and then expanded.',
          },
        ],
      },
    ],
  },
  {
    version: 'v1.3.0',
    date: '2026-04-05',
    title: {
      de: 'Persistenz und Betriebsbasis gelegt',
      en: 'Persistence and operational baseline established',
    },
    summary: {
      de: 'Nach dem Initial-Release wurde die technische Betriebsbasis für Datenhaltung, Login und Container-Deployment geschaffen.',
      en: 'After the initial release, the technical operating baseline for persistence, login, and container deployment was established.',
    },
    highlights: [
      {
        de: 'Named volumes',
        en: 'Named volumes',
      },
      {
        de: 'Admin-Login-Fixes',
        en: 'Admin login fixes',
      },
      {
        de: 'Deployment-Refresh',
        en: 'Deployment refresh',
      },
    ],
    sections: [
      {
        title: {
          de: 'Persistenz und Deployment',
          en: 'Persistence and deployment',
        },
        items: [
          {
            de: 'SQLite-Daten und Uploads wurden in named volumes verschoben, damit Updates keine Nutzdaten überschreiben.',
            en: 'SQLite data and uploads were moved into named volumes so updates no longer overwrite user data.',
          },
          {
            de: 'Das Container-Deployment wurde für Docker- und Portainer-Betrieb aufgeräumt und Node-Versionen klarer abgesichert.',
            en: 'Container deployment was cleaned up for Docker and Portainer usage, and Node version requirements were made more explicit.',
          },
        ],
      },
      {
        title: {
          de: 'Zugriff und Authentifizierung',
          en: 'Access and authentication',
        },
        items: [
          {
            de: 'Admin-Login, CORS und Proxy-Cookies wurden korrigiert, damit Authentifizierung hinter Proxy-Szenarien zuverlässig funktioniert.',
            en: 'Admin login, CORS, and proxy cookie handling were corrected so authentication works reliably behind proxy setups.',
          },
          {
            de: 'Die ersten README- und Infrastruktur-Anpassungen für produktionsnähere Nutzung wurden ergänzt.',
            en: 'The first README and infrastructure refinements for more production-like usage were added.',
          },
        ],
      },
    ],
  },
  {
    version: 'v1.0.0',
    date: '2026-03-07',
    title: {
      de: 'Erstveröffentlichung',
      en: 'Initial release',
    },
    summary: {
      de: 'Erster lauffähiger Stand von AppLauncher mit React-Frontend, Node/Express-Backend und Docker-basierter Auslieferung.',
      en: 'First working AppLauncher baseline with a React frontend, Node/Express backend, and Docker-based delivery.',
    },
    highlights: [
      {
        de: 'Dashboard-Grundlage',
        en: 'Dashboard foundation',
      },
      {
        de: 'Admin-Backend',
        en: 'Admin backend',
      },
      {
        de: 'Docker-Startpunkt',
        en: 'Docker starting point',
      },
    ],
    sections: [
      {
        title: {
          de: 'Grundlage',
          en: 'Foundation',
        },
        items: [
          {
            de: 'Frontend, Backend, Compose-Stack und initiale Build-Konfiguration wurden als gemeinsames Grundprojekt angelegt.',
            en: 'Frontend, backend, compose stack, and initial build configuration were created as the shared project foundation.',
          },
          {
            de: 'Die erste lauffähige Dashboard- und Admin-Struktur war damit einsatzbereit.',
            en: 'The first working dashboard and admin structure was ready for use.',
          },
        ],
      },
    ],
  },
];

export const getAppChangelog = (language: PreferredLanguage): ChangelogEntry[] =>
  APP_CHANGELOG.map((entry) => ({
    version: entry.version,
    date: entry.date,
    title: entry.title[language],
    summary: entry.summary[language],
    highlights: entry.highlights.map((item) => item[language]),
    importantChanges: (entry.importantChanges || []).map((item) => item[language]),
    sections: entry.sections.map((section) => ({
      title: section.title[language],
      items: section.items.map((item) => item[language]),
    })),
  }));

export const getLatestChangelogEntry = (language: PreferredLanguage): ChangelogEntry | undefined =>
  getAppChangelog(language)[0];