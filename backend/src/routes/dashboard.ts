import express from 'express';
import db from '../db/index';

const router = express.Router();

router.get('/data', (req, res) => {
  try {
    const groups = db.prepare('SELECT * FROM groups ORDER BY "order" ASC').all() as any[];
    const links = db.prepare('SELECT * FROM links ORDER BY "order" ASC').all() as any[];

    const linksByGroup = new Map<number, any[]>();
    for (const link of links) {
      const groupLinks = linksByGroup.get(link.group_id);
      if (groupLinks) {
        groupLinks.push(link);
      } else {
        linksByGroup.set(link.group_id, [link]);
      }
    }

    const groupsWithLinks = groups.map(group => ({
      ...group,
      links: linksByGroup.get(group.id) ?? []
    }));

    res.json(groupsWithLinks);
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
