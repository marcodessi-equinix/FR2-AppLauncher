import express from 'express';
import multer from 'multer';
import { parseBookmarksFromHtml, saveImportedData, ImportPreviewData } from '../services/bookmarkService';
import { requireAdmin } from '../middleware/auth';

const router = express.Router();

// Memory storage for parsing
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// POST /api/admin/parse-bookmarks
// Returns JSON structure of bookmarks for preview
router.post('/parse-bookmarks', requireAdmin, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const htmlContent = req.file.buffer.toString('utf-8');
    const data = parseBookmarksFromHtml(htmlContent);

    res.json(data);

  } catch (error: any) {
    console.error('Parse error:', error);
    res.status(500).json({ error: error.message || 'Parse failed' });
  }
});

// POST /api/admin/execute-import
// Saves the SELECTED structure (groups/links)
// Header "x-keep-existing" optional
router.post('/execute-import', requireAdmin, (req, res) => {
    try {
        const data = req.body as ImportPreviewData;
        const keepExisting = req.headers['x-keep-existing'] === 'true';

        // Basic validation
        if (!data || !Array.isArray(data.groups)) {
             return res.status(400).json({ error: 'Invalid data format' });
        }

        saveImportedData(data, keepExisting);
        res.json({ success: true, message: 'Import executed' });

    } catch (error: any) {
        console.error('Execute Import Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
