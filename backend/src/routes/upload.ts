import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { requireAdmin } from '../middleware/auth';

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/icons');
const iconMetadataPath = path.join(uploadDir, '.metadata.json');
const allowedExtensions = new Set([
  '.apng',
  '.avif',
  '.bmp',
  '.dib',
  '.gif',
  '.heic',
  '.heif',
  '.ico',
  '.jfif',
  '.jpeg',
  '.jpg',
  '.pjp',
  '.pjpeg',
  '.png',
  '.svg',
  '.svgz',
  '.tif',
  '.tiff',
  '.webp'
]);

interface UploadedIconMetadata {
  originalName: string;
  displayName: string;
  uploadedAt: number;
}

type UploadedIconMetadataMap = Record<string, UploadedIconMetadata>;

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const getFallbackDisplayName = (filename: string): string => {
  const parsed = path.parse(filename);
  const cleanedBase = parsed.name.replace(/^icon-\d+-\d+-?/, '').replace(/^[\-_]+/, '');
  return cleanedBase ? `${cleanedBase}${parsed.ext}` : filename;
};

const readIconMetadata = (): UploadedIconMetadataMap => {
  if (!fs.existsSync(iconMetadataPath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(iconMetadataPath, 'utf8');
    if (!raw.trim()) {
      return {};
    }

    const parsed = JSON.parse(raw) as UploadedIconMetadataMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeIconMetadata = (metadata: UploadedIconMetadataMap) => {
  fs.writeFileSync(iconMetadataPath, JSON.stringify(metadata, null, 2), 'utf8');
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename and append timestamp to prevent collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'icon-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req: any, file: any, cb: any) => {
  const fileExtension = path.extname(file.originalname || '').toLowerCase();
  const isImageMimeType = String(file.mimetype || '').toLowerCase().startsWith('image/');

  if (isImageMimeType || allowedExtensions.has(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only image uploads are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  }
});

router.post(['/', '/icon'], requireAdmin, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Path traversal check
    const resolvedPath = path.resolve(req.file.path);
    if (!resolvedPath.startsWith(path.resolve(uploadDir))) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: 'Invalid file path' });
    }

    const metadata = readIconMetadata();
    const safeOriginalName = (req.file.originalname || req.file.filename).replace(/[<>"'&]/g, '_');
    const displayName = safeOriginalName || getFallbackDisplayName(req.file.filename);
    metadata[req.file.filename] = {
      originalName: safeOriginalName,
      displayName,
      uploadedAt: Date.now()
    };
    writeIconMetadata(metadata);

    const fileUrl = `/uploads/icons/${req.file.filename}`;

    res.json({ 
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      displayName
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.get('/', requireAdmin, async (req, res) => {
  try {
    const metadata = readIconMetadata();
    const files = await fsPromises.readdir(uploadDir);
    const iconPromises = files
      .filter((file) => allowedExtensions.has(path.extname(file).toLowerCase()))
      .map(async (file) => {
        const filePath = path.join(uploadDir, file);
        const stat = await fsPromises.stat(filePath);
        const fileMetadata = metadata[file];

        return {
          url: `/uploads/icons/${file}`,
          filename: file,
          originalName: fileMetadata?.originalName || file,
          displayName: fileMetadata?.displayName || getFallbackDisplayName(file),
          uploadedAt: fileMetadata?.uploadedAt || stat.mtimeMs
        };
      });

    const icons = (await Promise.all(iconPromises))
      .sort((left, right) => right.uploadedAt - left.uploadedAt)
      .map(({ uploadedAt, ...icon }) => icon);

    res.json(icons);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list icons' });
  }
});

router.delete('/:filename', requireAdmin, (req, res) => {
  try {
    const filenameParam = req.params.filename;
    const requestedFilename = decodeURIComponent(
      Array.isArray(filenameParam) ? filenameParam[0] || '' : filenameParam || ''
    );
    const safeFilename = path.basename(requestedFilename);

    if (!safeFilename || safeFilename !== requestedFilename) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(uploadDir, safeFilename);
    const resolvedPath = path.resolve(filePath);

    if (!resolvedPath.startsWith(path.resolve(uploadDir))) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    if (!fs.existsSync(filePath) || !allowedExtensions.has(path.extname(safeFilename).toLowerCase())) {
      return res.status(404).json({ error: 'Icon not found' });
    }

    fs.unlinkSync(filePath);

    const metadata = readIconMetadata();
    if (metadata[safeFilename]) {
      delete metadata[safeFilename];
      writeIconMetadata(metadata);
    }

    res.json({ success: true, filename: safeFilename });
  } catch (error) {
    console.error('Delete icon error:', error);
    res.status(500).json({ error: 'Failed to delete icon' });
  }
});

export default router;
