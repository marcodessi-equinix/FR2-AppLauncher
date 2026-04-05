import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

function seed() {
  const dbPath = path.join(__dirname, '../../data/applauncher.db');
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)){
      fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      "order" INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      "order" INTEGER DEFAULT 0,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );
  `);

  db.exec('PRAGMA foreign_keys = ON');

  // Create Groups
  const groups = [
    { title: 'Example Group A', order: 0 },
    { title: 'Example Group B', order: 1 },
    { title: 'Internal Tools', order: 2 },
    { title: 'Resources', order: 3 }
  ];

  const insertGroup = db.prepare('INSERT INTO groups (title, "order") VALUES (?, ?)');
  for (const group of groups) {
    insertGroup.run(group.title, group.order);
  }

  // Get Group IDs
  const dbGroups = db.prepare('SELECT id, title FROM groups').all() as {id: number, title: string}[];
  const groupMap = Object.fromEntries(dbGroups.map(g => [g.title, g.id]));

  // Create Links
  const links = [
    { group: 'Example Group A', title: 'Example Application', url: 'https://example.com', description: 'Internal application placeholder', icon: 'ExternalLink', order: 0 },
    { group: 'Example Group A', title: 'Example Service', url: 'https://example.org', description: 'Shared service placeholder', icon: 'Activity', order: 1 },
    
    { group: 'Example Group B', title: 'Version Control', url: 'https://github.com', description: 'Your repository hosting', icon: 'Github', order: 0 },
    { group: 'Example Group B', title: 'Collaboration', url: 'https://example.com', description: 'Team collaboration tool', icon: 'Users', order: 1 },
    
    { group: 'Internal Tools', title: 'Knowledge Base', url: 'https://example.com', description: 'Internal documentation', icon: 'BookOpen', order: 0 },
    { group: 'Internal Tools', title: 'Development Console', url: 'https://example.com', description: 'Dev management portal', icon: 'Terminal', order: 1 },
    
    { group: 'Resources', title: 'Internal Training', url: 'https://example.com', description: 'LMS or training portal', icon: 'GraduationCap', order: 0 },
    { group: 'Resources', title: 'Global Directory', url: 'https://example.com', description: 'Employee directory', icon: 'Search', order: 1 }
  ];

  const insertLink = db.prepare('INSERT INTO links (group_id, title, url, description, icon, "order") VALUES (?, ?, ?, ?, ?, ?)');
  for (const link of links) {
    const groupId = groupMap[link.group];
    insertLink.run(groupId, link.title, link.url, link.description, link.icon, link.order);
  }

  // Seed System Info (DE/EN)
  const systemInfo = JSON.stringify({
    de: '<h2>Willkommen im AppLauncher</h2><p>Dies ist das zentrale Dashboard für Ihre Dienste. Hier finden Sie alle wichtigen Links und Informationen auf einen Blick.</p><ul><li>Systemstatus: <b style="color: #10b981">Online</b></li><li>Wartungsfenster: Sonntags 02:00 Uhr</li></ul>',
    en: '<h2>Welcome to the AppLauncher</h2><p>This is the central dashboard for your services. Here you will find all important links and information at a glance.</p><ul><li>System Status: <b style="color: #10b981">Online</b></li><li>Maintenance Window: Sundays 02:00 AM</li></ul>'
  });

  db.prepare('INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run('system_info', systemInfo);

  db.close();
}

try {
  seed();
} catch (err) {
  console.error('Seed failed:', err);
  process.exit(1);
}
