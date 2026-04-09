import express from 'express';
import db from '../db/index';
import { requireAdmin } from '../middleware/auth';
import sanitizeHtml from 'sanitize-html';
import { requireTrustedOrigin } from '../middleware/trustedOrigin';
import { getBuildInfo } from '../config/buildInfo';

const router = express.Router();

const SANITIZE_OPTS = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'span']),
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title'],
    '*': ['class'],
    span: ['class', 'data-color'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  disallowedTagsMode: 'discard' as const,
};

const readStoredJsonArray = (rawValue: string | undefined) => {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

router.get('/version', (req, res) => {
  res.json(getBuildInfo());
});

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
router.post('/info', requireTrustedOrigin, requireAdmin, (req, res) => {
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

// ── Info Cards (new card-based system) ──

router.get('/info-cards', (req, res) => {
  try {
    const row = db.prepare('SELECT value FROM config WHERE key = ?').get('info_cards') as { value: string } | undefined;
    const cards = readStoredJsonArray(row?.value);
    // Migrate old-format cards on the fly (title/content → title_de/title_en/content_de/content_en)
    const migrated = cards.map((card: Record<string, unknown>) => ({
      id: card.id || '',
      title_de: card.title_de || card.title || '',
      title_en: card.title_en || card.title || '',
      content_de: card.content_de || card.content || '',
      content_en: card.content_en || card.content || '',
      createdAt: card.createdAt || new Date().toISOString(),
    }));
    res.json({ cards: migrated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch info cards' });
  }
});

router.post('/info-cards', requireTrustedOrigin, requireAdmin, (req, res) => {
  const { cards } = req.body;
  try {
    if (!Array.isArray(cards)) {
      return res.status(400).json({ error: 'cards must be an array' });
    }

    // Translation is handled by the frontend (browser).
    // Backend only sanitizes and stores.
    const sanitized = cards.map((card: {
      id: string;
      title_de: string; title_en: string;
      content_de: string; content_en: string;
      createdAt: string;
    }) => ({
      id: String(card.id || ''),
      title_de: sanitizeHtml(String(card.title_de || ''), { allowedTags: [], allowedAttributes: {} }),
      title_en: sanitizeHtml(String(card.title_en || ''), { allowedTags: [], allowedAttributes: {} }),
      content_de: sanitizeHtml(String(card.content_de || ''), SANITIZE_OPTS),
      content_en: sanitizeHtml(String(card.content_en || ''), SANITIZE_OPTS),
      createdAt: String(card.createdAt || new Date().toISOString()),
    }));

    const stmt = db.prepare('INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    stmt.run('info_cards', JSON.stringify(sanitized));
    res.json({ success: true, cards: sanitized });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save info cards' });
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
