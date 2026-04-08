import express from 'express';
import db from '../db/index';
import { requireAdmin } from '../middleware/auth';
import { z } from 'zod';
import { requireTrustedOrigin } from '../middleware/trustedOrigin';

const router = express.Router();

// ==================================================
// Reorder Groups
// ==================================================
const ReorderItemSchema = z.object({
  id: z.number(),
  order: z.number(),
});

router.put('/groups', requireTrustedOrigin, requireAdmin, (req, res) => {
  const result = z.array(ReorderItemSchema).safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  try {
    const stmt = db.prepare('UPDATE groups SET "order" = ? WHERE id = ?');
    const updateMany = db.transaction((items: { id: number; order: number }[]) => {
      for (const item of items) {
        stmt.run(item.order, item.id);
      }
    });
    updateMany(result.data);

    db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(
      'REORDER_GROUPS',
      JSON.stringify(result.data)
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to reorder groups:', err);
    res.status(500).json({ error: 'Failed to reorder groups' });
  }
});

// ==================================================
// Reorder Links
// ==================================================
router.put('/links', requireTrustedOrigin, requireAdmin, (req, res) => {
  const result = z.array(ReorderItemSchema).safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  try {
    const stmt = db.prepare('UPDATE links SET "order" = ? WHERE id = ?');
    const updateMany = db.transaction((items: { id: number; order: number }[]) => {
      for (const item of items) {
        stmt.run(item.order, item.id);
      }
    });
    updateMany(result.data);

    db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(
      'REORDER_LINKS',
      JSON.stringify(result.data)
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to reorder links:', err);
    res.status(500).json({ error: 'Failed to reorder links' });
  }
});

// ==================================================
// Save/Load Timezone Order
// ==================================================
router.put('/timezones', requireTrustedOrigin, requireAdmin, (req, res) => {
  const result = z.array(z.string()).safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  try {
    const stmt = db.prepare(
      'INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );
    stmt.run('timezone_order', JSON.stringify(result.data));
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to save timezone order:', err);
    res.status(500).json({ error: 'Failed to save timezone order' });
  }
});

router.get('/timezones', (req, res) => {
  try {
    const row = db.prepare('SELECT value FROM config WHERE key = ?').get('timezone_order') as { value: string } | undefined;
    res.json(row ? JSON.parse(row.value) : []);
  } catch (err) {
    res.json([]);
  }
});

export default router;
