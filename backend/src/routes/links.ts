import express from 'express';
import db from '../db/index';
import { requireAdmin } from '../middleware/auth';
import { z } from 'zod';
import { isAllowedIconValue, normalizeStoredIconValue } from '../lib/iconPolicy';
import { requireTrustedOrigin } from '../middleware/trustedOrigin';

const router = express.Router();

const LinkSchema = z.object({
  group_id: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(120),
  url: z.string().trim().url().max(2048),
  description: z.string().trim().max(500).optional(),
  icon: z.preprocess(
    (value) => typeof value === 'string' ? value.trim() : value,
    z.string().max(160).optional()
  ).refine((value) => value === undefined || isAllowedIconValue(value), { message: 'Invalid icon value' }),
  order: z.coerce.number().int().min(0).max(100000).optional().default(0),
});

const BulkLinkIconSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1).max(500),
  icon: z.preprocess(
    (value) => typeof value === 'string' ? value.trim() : value,
    z.string().max(160).optional()
  ).refine((value) => value === undefined || isAllowedIconValue(value), { message: 'Invalid icon value' }),
});

// GET all links
router.get('/', (req, res) => {
  const links = db.prepare('SELECT * FROM links ORDER BY "order" ASC').all();
  res.json(links);
});

// POST create link
router.post('/', requireTrustedOrigin, requireAdmin, (req, res) => {
  const result = LinkSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const { group_id, title, url, description, icon, order } = result.data;
  const normalizedIcon = normalizeStoredIconValue(icon);

  try {
    const groupCheck = db.prepare('SELECT id FROM groups WHERE id = ?').get(group_id) as { id: number } | undefined;
    if (!groupCheck) {
      return res.status(400).json({ error: 'Group does not exist' });
    }

    const stmt = db.prepare(
      'INSERT INTO links (group_id, title, url, description, icon, "order") VALUES (?, ?, ?, ?, ?, ?)'
    );
    const info = stmt.run(group_id, title, url, description || '', normalizedIcon, order);

    db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(
      'CREATE_LINK',
      JSON.stringify({ id: info.lastInsertRowid, title, url })
    );

    res.json({ id: info.lastInsertRowid, group_id, title, url, description, icon: normalizedIcon, order });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create link' });
  }
});

// PUT bulk update link icons
router.put('/bulk/icon', requireTrustedOrigin, requireAdmin, (req, res) => {
  const result = BulkLinkIconSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const ids = Array.from(new Set(result.data.ids));
  const normalizedIcon = normalizeStoredIconValue(result.data.icon);

  try {
    const placeholders = ids.map(() => '?').join(', ');
    const existing = db
      .prepare(`SELECT id FROM links WHERE id IN (${placeholders})`)
      .all(...ids) as Array<{ id: number }>;

    if (existing.length !== ids.length) {
      return res.status(404).json({ error: 'One or more links were not found' });
    }

    const updateStmt = db.prepare('UPDATE links SET icon = ? WHERE id = ?');
    const selectStmt = db.prepare('SELECT * FROM links WHERE id = ?');

    const updatedLinks = db.transaction((linkIds: number[]) => {
      const updated: unknown[] = [];

      for (const id of linkIds) {
        updateStmt.run(normalizedIcon, id);
        updated.push(selectStmt.get(id));
      }

      return updated;
    })(ids);

    db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(
      'BULK_UPDATE_LINK_ICON',
      JSON.stringify({ ids, icon: normalizedIcon })
    );

    res.json({ success: true, links: updatedLinks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk update link icons' });
  }
});

// PUT update link
router.put('/:id', requireTrustedOrigin, requireAdmin, (req, res) => {
  const idResult = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!idResult.success) {
    return res.status(400).json({ error: 'Invalid link id' });
  }

  const id = idResult.data;
  const result = LinkSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const { group_id, title, url, description, icon, order } = result.data;
  const normalizedIcon = normalizeStoredIconValue(icon);

  try {
    const groupCheck = db.prepare('SELECT id FROM groups WHERE id = ?').get(group_id) as { id: number } | undefined;
    if (!groupCheck) {
      return res.status(400).json({ error: 'Group does not exist' });
    }

    const stmt = db.prepare(
      'UPDATE links SET group_id = ?, title = ?, url = ?, description = ?, icon = ?, "order" = ? WHERE id = ?'
    );
    const info = stmt.run(group_id, title, url, description || '', normalizedIcon, order, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(
      'UPDATE_LINK',
      JSON.stringify({ id, title })
    );

    res.json({ id: Number(id), group_id, title, url, description, icon: normalizedIcon, order });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update link' });
  }
});

// DELETE link
router.delete('/:id', requireTrustedOrigin, requireAdmin, (req, res) => {
  const idResult = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!idResult.success) {
    return res.status(400).json({ error: 'Invalid link id' });
  }

  const id = idResult.data;

  try {
    const stmt = db.prepare('DELETE FROM links WHERE id = ?');
    const info = stmt.run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(
      'DELETE_LINK',
      JSON.stringify({ id })
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

export default router;
