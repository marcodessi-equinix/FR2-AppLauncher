export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

export const APP_CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v2.0.0',
    date: '2026-04-07',
    title: 'Open-source release — fully portable',
    items: [
      'Removed all hardcoded URLs, hostnames, and vendor-specific configurations.',
      'The app can now be installed on any machine with Docker or Podman — no DNS or VM prerequisites.',
      'Unified install script supports both Docker Compose and Podman Compose.',
      'Removed legacy proxy-network dependencies (nginx-proxy-manager references).',
      'Deprecated API endpoints and frontend code removed.',
      'All documentation rewritten in English for international use.',
      'Added MIT license.',
      'Renamed environment variables for clarity (FRONTEND_PORT → APP_PORT).',
    ],
  },
  {
    version: 'v1.6.0',
    date: '2026-04-07',
    title: 'Proxy, deployment, and startup behavior stabilized',
    items: [
      'App startup unified for direct hostname access and operation behind reverse proxies.',
      'Frontend builds remain functional even when browser or proxy caches an older bundle.',
      'API upstream between frontend and backend cleaned up for reliable container communication.',
      'HTTPS detection for cookies behind reverse proxies corrected.',
      'README, .env example, and installation path aligned with actual production use.',
    ],
  },
  {
    version: 'v1.5.0',
    date: '2026-04-06',
    title: 'Dashboard, admin workflow, and release notes expanded',
    items: [
      'Links can now be placed between any two entries across groups.',
      'After switching groups, the target group is recognized immediately and ordering remains editable.',
      'In edit mode, clicking the entire link card opens editing; only the delete icon remains visible.',
      'Import, dashboard cache, and local group management stay in sync after changes without forced reload.',
      'Custom icons support more formats, display original names, and can be deleted directly.',
      'Added bookmark export and a clickable version dialog that highlights new changes automatically.',
    ],
  },
  {
    version: 'v1.4.0',
    date: '2026-04-05',
    title: 'Deployment refresh and container operation improved',
    items: [
      'Application deployment updated and cleaned up for production use.',
      'Frontend and backend containers stabilized for combined operation.',
      'Removed platform-specific deployment friction.',
    ],
  },
  {
    version: 'v1.3.0',
    date: '2026-04-05',
    title: 'Persistent data storage in Docker enabled',
    items: [
      'Backend data is now stored in named Docker volumes.',
      'Database and uploads survive container restarts and updates.',
      'Docker operation made more robust against accidental data loss.',
    ],
  },
  {
    version: 'v1.2.0',
    date: '2026-04-05',
    title: 'Admin login behind proxy and CORS stabilized',
    items: [
      'CORS behavior for admin login corrected.',
      'Cookie handling behind proxy and reverse proxy works more reliably.',
      'Authentication between frontend and backend is now more stable.',
    ],
  },
  {
    version: 'v1.1.0',
    date: '2026-03-08',
    title: 'First expansion after initial release',
    items: [
      'Project structure, configuration, and basic workflows refined.',
      'This version marks the first development iteration after v1.0.0.',
    ],
  },
  {
    version: 'v1.0.0',
    date: '2026-03-07',
    title: 'Initial release',
    items: [
      'Base project with frontend, backend, and Docker structure created.',
      'First working version of the AppLauncher.',
    ],
  },
];

export const getLatestChangelogEntry = (): ChangelogEntry | undefined => APP_CHANGELOG[0];