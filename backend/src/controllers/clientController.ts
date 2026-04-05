import { Request, Response } from 'express';
import db from '../db/index';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const RegisterClientSchema = z.object({
  fingerprint: z.string().regex(/^([a-f0-9]{64}|fallback-[a-f0-9]{8})$/i),
});

export const registerClient = (req: Request, res: Response) => {
  const result = RegisterClientSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid fingerprint' });
  }

  const { fingerprint } = result.data;

  try {
    // Check if client exists
    const stmt = db.prepare('SELECT id, created_at FROM clients WHERE fingerprint = ?');
    const existing = stmt.get(fingerprint) as { id: string, created_at: string } | undefined;

    if (existing) {
        // Update last_seen
        db.prepare('UPDATE clients SET last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(existing.id);
        return res.json({ id: existing.id, created: false });
    }

    // Create new client
    const newId = uuidv4();
    const insert = db.prepare('INSERT INTO clients (id, fingerprint) VALUES (?, ?)');
    insert.run(newId, fingerprint);

    res.json({ id: newId, created: true });
  } catch (error) {
    console.error('Error registering client:', error);
    res.status(500).json({ error: 'Failed to register client' });
  }
};
