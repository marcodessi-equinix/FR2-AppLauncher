import express from 'express';
import db from '../db/index';
import { requireAdmin } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

const LinkSchema = z.object({
  group_id: z.number(),
  title: z.string().min(1),
  url: z.string().url(),
  description: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().optional().default(0),
});

// GET all links
router.get('/', (req, res) => {
  const links = db.prepare('SELECT * FROM links ORDER BY "order" ASC').all();
  res.json(links);
});

// POST create link
router.post('/', requireAdmin, (req, res) => {
  const result = LinkSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const { group_id, title, url, description, icon, order } = result.data;

  try {
    const stmt = db.prepare(
      'INSERT INTO links (group_id, title, url, description, icon, "order") VALUES (?, ?, ?, ?, ?, ?)'
    );
    const info = stmt.run(group_id, title, url, description || '', icon || '', order);

    db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(
      'CREATE_LINK',
      JSON.stringify({ id: info.lastInsertRowid, title, url })
    );

    res.json({ id: info.lastInsertRowid, group_id, title, url, description, icon, order });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create link' });
  }
});

// PUT update link
router.put('/:id', requireAdmin, (req, res) => {
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

  try {
    const stmt = db.prepare(
      'UPDATE links SET group_id = ?, title = ?, url = ?, description = ?, icon = ?, "order" = ? WHERE id = ?'
    );
    const info = stmt.run(group_id, title, url, description || '', icon || '', order, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(
      'UPDATE_LINK',
      JSON.stringify({ id, title })
    );

    res.json({ id: Number(id), group_id, title, url, description, icon, order });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update link' });
  }
});

// DELETE link
router.delete('/:id', requireAdmin, (req, res) => {
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
