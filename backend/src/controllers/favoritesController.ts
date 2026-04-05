import { Request, Response } from 'express';
import db from '../db/index';
import { z } from 'zod';

const FavoriteClientParamsSchema = z.object({
  clientId: z.string().uuid(),
});
const AddFavoriteSchema = z.object({
  clientId: z.string().uuid(),
  linkId: z.number().int().positive(),
});
const RemoveFavoriteParamsSchema = z.object({
  clientId: z.string().uuid(),
  linkId: z.coerce.number().int().positive(),
});

export const getFavorites = (req: Request, res: Response) => {
  const result = FavoriteClientParamsSchema.safeParse(req.params);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid client id' });
  }

  const { clientId } = result.data;

  try {
    const stmt = db.prepare('SELECT link_id FROM favorites WHERE client_id = ?');
    const rows = stmt.all(clientId) as { link_id: number }[];
    const favoriteIds = rows.map(row => row.link_id);
    res.json(favoriteIds);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
};

export const addFavorite = (req: Request, res: Response) => {
  const result = AddFavoriteSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid favorite payload' });
  }

  const { clientId, linkId } = result.data;

  try {
    const stmt = db.prepare('INSERT OR IGNORE INTO favorites (client_id, link_id) VALUES (?, ?)');
    stmt.run(clientId, linkId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
};

export const removeFavorite = (req: Request, res: Response) => {
  const result = RemoveFavoriteParamsSchema.safeParse(req.params);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid favorite identifier' });
  }

  const { clientId, linkId } = result.data;

  try {
    const stmt = db.prepare('DELETE FROM favorites WHERE client_id = ? AND link_id = ?');
    stmt.run(clientId, linkId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
};
