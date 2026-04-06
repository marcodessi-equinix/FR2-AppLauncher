export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

export const APP_CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v1.5.0',
    date: '2026-04-06',
    title: 'Dashboard, Admin-Workflow und Release Notes erweitert',
    items: [
      'Links können jetzt gruppenübergreifend direkt zwischen zwei beliebigen Einträgen abgelegt werden.',
      'Nach einem Gruppenwechsel bleibt die Zielgruppe sofort korrekt erkannt und die Reihenfolge ist direkt weiter bearbeitbar.',
      'Im Bearbeitungsmodus öffnet ein Klick auf die gesamte Link-Karte jetzt die Bearbeitung; sichtbar bleibt nur noch das Löschen-Symbol.',
      'Import, Dashboard-Cache und lokale Gruppenverwaltung bleiben nach Änderungen direkter synchron, ohne erzwungenen Voll-Reload.',
      'Eigene Icons können umfangreicher verwaltet werden, inklusive mehr Formaten, Anzeige der Originalnamen und direktem Löschen.',
      'Export für alle App-Links sowie ein klickbares Versionsfenster mit automatischer Anzeige neuer Änderungen wurden hinzugefügt.',
    ],
  },
  {
    version: 'v1.4.0',
    date: '2026-04-05',
    title: 'Deployment-Refresh und Container-Betrieb verbessert',
    items: [
      'Der Deploy-Stand der App wurde für den produktiven Betrieb überarbeitet und bereinigt.',
      'Frontend- und Backend-Container wurden für den gemeinsamen Betrieb stabilisiert.',
      'Portainer-spezifische Stolperstellen beim Build und Start wurden vorbereitet oder entfernt.',
    ],
  },
  {
    version: 'v1.3.0',
    date: '2026-04-05',
    title: 'Persistente Datenhaltung in Docker aktiviert',
    items: [
      'Backend-Daten werden über benannte Volumes dauerhaft gespeichert.',
      'Datenbank und Uploads bleiben bei Neustarts und Container-Updates erhalten.',
      'Der Betrieb in Docker wurde robuster gegen versehentlichen Datenverlust gemacht.',
    ],
  },
  {
    version: 'v1.2.0',
    date: '2026-04-05',
    title: 'Admin-Login hinter Proxy und CORS stabilisiert',
    items: [
      'CORS-Verhalten für den Admin-Login wurde korrigiert.',
      'Cookie-Handling hinter Proxy und Reverse-Proxy funktioniert zuverlässiger.',
      'Die Anmeldung zwischen Frontend und Backend läuft dadurch stabiler.',
    ],
  },
  {
    version: 'v1.1.0',
    date: '2026-03-08',
    title: 'Erste Ausbauphase nach dem Initial-Release',
    items: [
      'Die erste Projektversion wurde nach dem Start weiter angepasst und ausgebaut.',
      'Grundlegende App-Struktur, Konfiguration und erste Abläufe wurden nachgeschärft.',
      'Dieser Stand basiert auf dem vorhandenen Git-Verlauf und markiert die erste Weiterentwicklung nach v1.0.0.',
    ],
  },
  {
    version: 'v1.0.0',
    date: '2026-03-07',
    title: 'Erste Version erstellt',
    items: [
      'Grundprojekt mit Frontend, Backend und Docker-Struktur wurde angelegt.',
      'Die erste lauffähige Basis des FR2 AppLaunchers wurde erstellt.',
      'Damit beginnt die sichtbare Versionshistorie in diesem Repository.',
    ],
  },
];

export const getLatestChangelogEntry = (): ChangelogEntry | undefined => APP_CHANGELOG[0];