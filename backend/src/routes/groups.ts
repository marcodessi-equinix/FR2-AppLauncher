import express from 'express';
import db from '../db/index';
import { requireAdmin } from '../middleware/auth';
import { z } from 'zod';
import { isAllowedIconValue, normalizeStoredIconValue } from '../lib/iconPolicy';
import { requireTrustedOrigin } from '../middleware/trustedOrigin';

const router = express.Router();

const GroupSchema = z.object({
  title: z.string().trim().min(1).max(80),
  order: z.coerce.number().int().min(0).max(10000).optional().default(0),
  icon: z.preprocess(
    (value) => typeof value === 'string' ? value.trim() : value,
    z.string().max(160).optional()
  ).refine((value) => value === undefined || isAllowedIconValue(value), { message: 'Invalid icon value' }),
});

// GET all groups
router.get('/', (req, res) => {
  const groups = db.prepare('SELECT * FROM groups ORDER BY "order" ASC').all();
  res.json(groups);
});

// POST create group (Admin only)
router.post('/', requireTrustedOrigin, requireAdmin, (req, res) => {
  const result = GroupSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const { title, order, icon } = result.data;
  const normalizedIcon = normalizeStoredIconValue(icon);
  
  try {
    const stmt = db.prepare('INSERT INTO groups (title, "order", icon) VALUES (?, ?, ?)');
    const info = stmt.run(title, order, normalizedIcon || null);
    
    // Log audit
    db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(
      'CREATE_GROUP', 
      JSON.stringify({ id: info.lastInsertRowid, title })
    );

    res.json({ id: info.lastInsertRowid, title, order, icon: normalizedIcon });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// PUT update group
router.put('/:id', requireTrustedOrigin, requireAdmin, (req, res) => {
  const idResult = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!idResult.success) {
    return res.status(400).json({ error: 'Invalid group id' });
  }

  const id = idResult.data;
  const result = GroupSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const { title, order, icon } = result.data;
  const normalizedIcon = normalizeStoredIconValue(icon);

  try {
    const stmt = db.prepare('UPDATE groups SET title = ?, "order" = ?, icon = ? WHERE id = ?');
    const info = stmt.run(title, order, normalizedIcon || null, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(
      'UPDATE_GROUP', 
      JSON.stringify({ id, title })
    );

    res.json({ id: Number(id), title, order, icon: normalizedIcon });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// DELETE group
router.delete('/:id', requireTrustedOrigin, requireAdmin, (req, res) => {
  const idResult = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!idResult.success) {
    return res.status(400).json({ error: 'Invalid group id' });
  }

  const id = idResult.data;

  try {
    const stmt = db.prepare('DELETE FROM groups WHERE id = ?');
    const info = stmt.run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(
      'DELETE_GROUP', 
      JSON.stringify({ id })
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

export default router;
