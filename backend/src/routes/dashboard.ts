import express from 'express';
import db from '../db/index';

const router = express.Router();

router.get('/data', (req, res) => {
  try {
    const groups = db.prepare('SELECT * FROM groups ORDER BY "order" ASC').all() as any[];
    const links = db.prepare('SELECT * FROM links ORDER BY "order" ASC').all() as any[];

    // Map links to groups
    const groupsWithLinks = groups.map(group => ({
      ...group,
      links: links.filter(link => link.group_id === group.id)
    }));

    res.json(groupsWithLinks);
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
