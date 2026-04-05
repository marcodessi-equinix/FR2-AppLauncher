import express from 'express';
import db from '../db/index';
import { requireAdmin } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

const GroupSchema = z.object({
  title: z.string().min(1),
  order: z.number().optional().default(0),
  icon: z.string().optional(),
});

// GET all groups
router.get('/', (req, res) => {
  const groups = db.prepare('SELECT * FROM groups ORDER BY "order" ASC').all();
  res.json(groups);
});

// POST create group (Admin only)
router.post('/', requireAdmin, (req, res) => {
  const result = GroupSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const { title, order, icon } = result.data;
  
  try {
    const stmt = db.prepare('INSERT INTO groups (title, "order", icon) VALUES (?, ?, ?)');
    const info = stmt.run(title, order, icon || null);
    
    // Log audit
    db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(
      'CREATE_GROUP', 
      JSON.stringify({ id: info.lastInsertRowid, title })
    );

    res.json({ id: info.lastInsertRowid, title, order, icon });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// PUT update group
router.put('/:id', requireAdmin, (req, res) => {
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

  try {
    const stmt = db.prepare('UPDATE groups SET title = ?, "order" = ?, icon = ? WHERE id = ?');
    const info = stmt.run(title, order, icon || null, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(
      'UPDATE_GROUP', 
      JSON.stringify({ id, title })
    );

    res.json({ id: Number(id), title, order, icon });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// DELETE group
router.delete('/:id', requireAdmin, (req, res) => {
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
