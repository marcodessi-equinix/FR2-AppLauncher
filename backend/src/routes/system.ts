import express from 'express';
import db from '../db/index';
import { requireAdmin } from '../middleware/auth';
import sanitizeHtml from 'sanitize-html';

const router = express.Router();

// Get System Info (Public or Protected depending on use case, let's make it public for dashboard view)
router.get('/info', (req, res) => {
  try {
    const row = db.prepare('SELECT value FROM config WHERE key = ?').get('system_info') as { value: string } | undefined;
    res.json({ content: row ? row.value : '' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch info' });
  }
});

// Update System Info (Admin)
router.post('/info', requireAdmin, (req, res) => {
  const { content } = req.body;
  try {
    const safeContent = sanitizeHtml(String(content || ''), {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3']),
      allowedAttributes: {
        a: ['href', 'name', 'target', 'rel'],
        img: ['src', 'alt', 'title'],
        '*': ['class'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      disallowedTagsMode: 'discard',
    });
    const stmt = db.prepare('INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    stmt.run('system_info', safeContent);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update info' });
  }
});

// Get Audit Logs
router.get('/audit-logs', requireAdmin, (req, res) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100').all();
  res.json(logs);
});

// Export Backup
router.get('/backup/export', requireAdmin, (req, res) => {
  const groups = db.prepare('SELECT * FROM groups').all();
  const links = db.prepare('SELECT * FROM links').all();
  const config = db.prepare('SELECT * FROM config').all();
  
  const backup = {
    version: 1,
    timestamp: new Date().toISOString(),
    data: {
      groups,
      links,
      config
    }
  };

  db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run('BACKUP_EXPORT', 'Exported system backup');

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=backup-${Date.now()}.json`);
  res.json(backup);
});

// Import Backup logic would go here (requires multer for file upload)

export default router;
