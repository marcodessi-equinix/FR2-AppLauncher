import type { PreferredLanguage } from '../store/useStore';

interface LocalizedText {
  de: string;
  en: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

interface LocalizedChangelogEntry {
  version: string;
  date: string;
  title: LocalizedText;
  items: LocalizedText[];
}

const APP_CHANGELOG: LocalizedChangelogEntry[] = [
  {
    version: 'v2.0.0',
    date: '2026-04-07',
    title: {
      de: 'Open-Source-Release und voll portable',
      en: 'Open-source release and fully portable',
    },
    items: [
      {
        de: 'Alle hart codierten URLs, Hostnamen und herstellerspezifischen Konfigurationen entfernt.',
        en: 'Removed all hardcoded URLs, hostnames, and vendor-specific configurations.',
      },
      {
        de: 'Die App lässt sich jetzt auf jedem Rechner mit Docker oder Podman installieren, ohne DNS- oder VM-Voraussetzungen.',
        en: 'The app can now be installed on any machine with Docker or Podman, without DNS or VM prerequisites.',
      },
      {
        de: 'Das vereinheitlichte Installationsskript unterstützt sowohl Docker Compose als auch Podman Compose.',
        en: 'The unified install script supports both Docker Compose and Podman Compose.',
      },
      {
        de: 'Alte Proxy-Netzwerk-Abhängigkeiten und nginx-proxy-manager-Referenzen entfernt.',
        en: 'Removed legacy proxy-network dependencies and nginx-proxy-manager references.',
      },
      {
        de: 'Veraltete API-Endpunkte und alter Frontend-Code entfernt.',
        en: 'Deprecated API endpoints and frontend code removed.',
      },
      {
        de: 'Dokumentation für internationalen Einsatz auf Englisch überarbeitet.',
        en: 'All documentation rewritten in English for international use.',
      },
      {
        de: 'MIT-Lizenz hinzugefügt.',
        en: 'Added MIT license.',
      },
      {
        de: 'Umgebungsvariablen zur besseren Verständlichkeit umbenannt (FRONTEND_PORT zu APP_PORT).',
        en: 'Renamed environment variables for clarity (FRONTEND_PORT to APP_PORT).',
      },
    ],
  },
  {
    version: 'v1.6.0',
    date: '2026-04-07',
    title: {
      de: 'Proxy, Deployment und Startverhalten stabilisiert',
      en: 'Proxy, deployment, and startup behavior stabilized',
    },
    items: [
      {
        de: 'Der App-Start wurde für direkten Hostnamen-Zugriff und den Betrieb hinter Reverse Proxies vereinheitlicht.',
        en: 'App startup unified for direct hostname access and operation behind reverse proxies.',
      },
      {
        de: 'Frontend-Builds bleiben funktionsfähig, auch wenn Browser oder Proxy ein älteres Bundle cachen.',
        en: 'Frontend builds remain functional even when browser or proxy caches an older bundle.',
      },
      {
        de: 'Die API-Anbindung zwischen Frontend und Backend für zuverlässige Container-Kommunikation bereinigt.',
        en: 'API upstream between frontend and backend cleaned up for reliable container communication.',
      },
      {
        de: 'HTTPS-Erkennung für Cookies hinter Reverse Proxies korrigiert.',
        en: 'HTTPS detection for cookies behind reverse proxies corrected.',
      },
      {
        de: 'README, .env-Beispiel und Installationspfad an den realen Produktiveinsatz angepasst.',
        en: 'README, .env example, and installation path aligned with actual production use.',
      },
    ],
  },
  {
    version: 'v1.5.0',
    date: '2026-04-06',
    title: {
      de: 'Dashboard, Admin-Workflow und Versionshinweise erweitert',
      en: 'Dashboard, admin workflow, and release notes expanded',
    },
    items: [
      {
        de: 'Links können jetzt gruppenübergreifend zwischen beliebigen Einträgen platziert werden.',
        en: 'Links can now be placed between any two entries across groups.',
      },
      {
        de: 'Nach dem Wechsel der Gruppe wird die Zielgruppe sofort erkannt und die Sortierung bleibt bearbeitbar.',
        en: 'After switching groups, the target group is recognized immediately and ordering remains editable.',
      },
      {
        de: 'Im Bearbeitungsmodus öffnet ein Klick auf die gesamte Link-Karte die Bearbeitung; sichtbar bleibt nur das Löschsymbol.',
        en: 'In edit mode, clicking the entire link card opens editing; only the delete icon remains visible.',
      },
      {
        de: 'Import, Dashboard-Cache und lokale Gruppenverwaltung bleiben nach Änderungen ohne erzwungenes Neuladen synchron.',
        en: 'Import, dashboard cache, and local group management stay in sync after changes without forced reload.',
      },
      {
        de: 'Benutzerdefinierte Icons unterstützen mehr Formate, zeigen Originalnamen an und können direkt gelöscht werden.',
        en: 'Custom icons support more formats, display original names, and can be deleted directly.',
      },
      {
        de: 'Lesezeichen-Export und ein klickbarer Versionsdialog hinzugefügt, der neue Änderungen automatisch hervorhebt.',
        en: 'Added bookmark export and a clickable version dialog that highlights new changes automatically.',
      },
    ],
  },
  {
    version: 'v1.4.0',
    date: '2026-04-05',
    title: {
      de: 'Deployment erneuert und Container-Betrieb verbessert',
      en: 'Deployment refresh and container operation improved',
    },
    items: [
      {
        de: 'Anwendungs-Deployment für den Produktiveinsatz aktualisiert und aufgeräumt.',
        en: 'Application deployment updated and cleaned up for production use.',
      },
      {
        de: 'Frontend- und Backend-Container für den gemeinsamen Betrieb stabilisiert.',
        en: 'Frontend and backend containers stabilized for combined operation.',
      },
      {
        de: 'Plattformspezifische Reibung im Deployment entfernt.',
        en: 'Removed platform-specific deployment friction.',
      },
    ],
  },
  {
    version: 'v1.3.0',
    date: '2026-04-05',
    title: {
      de: 'Persistente Datenspeicherung in Docker aktiviert',
      en: 'Persistent data storage in Docker enabled',
    },
    items: [
      {
        de: 'Backend-Daten werden jetzt in benannten Docker-Volumes gespeichert.',
        en: 'Backend data is now stored in named Docker volumes.',
      },
      {
        de: 'Datenbank und Uploads bleiben bei Container-Neustarts und Updates erhalten.',
        en: 'Database and uploads survive container restarts and updates.',
      },
      {
        de: 'Der Docker-Betrieb ist robuster gegen versehentlichen Datenverlust geworden.',
        en: 'Docker operation made more robust against accidental data loss.',
      },
    ],
  },
  {
    version: 'v1.2.0',
    date: '2026-04-05',
    title: {
      de: 'Admin-Login hinter Proxy und CORS stabilisiert',
      en: 'Admin login behind proxy and CORS stabilized',
    },
    items: [
      {
        de: 'CORS-Verhalten für den Admin-Login korrigiert.',
        en: 'CORS behavior for admin login corrected.',
      },
      {
        de: 'Cookie-Verarbeitung hinter Proxy und Reverse Proxy funktioniert zuverlässiger.',
        en: 'Cookie handling behind proxy and reverse proxy works more reliably.',
      },
      {
        de: 'Die Authentifizierung zwischen Frontend und Backend ist jetzt stabiler.',
        en: 'Authentication between frontend and backend is now more stable.',
      },
    ],
  },
  {
    version: 'v1.1.0',
    date: '2026-03-08',
    title: {
      de: 'Erste Erweiterung nach dem Initial-Release',
      en: 'First expansion after initial release',
    },
    items: [
      {
        de: 'Projektstruktur, Konfiguration und grundlegende Workflows verfeinert.',
        en: 'Project structure, configuration, and basic workflows refined.',
      },
      {
        de: 'Diese Version markiert die erste Entwicklungsiteration nach v1.0.0.',
        en: 'This version marks the first development iteration after v1.0.0.',
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
    items: [
      {
        de: 'Grundprojekt mit Frontend, Backend und Docker-Struktur erstellt.',
        en: 'Base project with frontend, backend, and Docker structure created.',
      },
      {
        de: 'Erste lauffähige Version des AppLaunchers.',
        en: 'First working version of the AppLauncher.',
      },
    ],
  },
];

export const getAppChangelog = (language: PreferredLanguage): ChangelogEntry[] =>
  APP_CHANGELOG.map((entry) => ({
    version: entry.version,
    date: entry.date,
    title: entry.title[language],
    items: entry.items.map((item) => item[language]),
  }));

export const getLatestChangelogEntry = (): LocalizedChangelogEntry | undefined => APP_CHANGELOG[0];