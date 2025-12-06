import { Router, Request, Response, NextFunction } from "express";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import multer from "multer";

const router = Router();

const ICONS_BASE_PATH = join(__dirname, '../../resources/icons');

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG, JPG, and SVG are allowed.'));
  }
};

router.get("/library/:category/:name/icon", async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, name } = req.params;
    
    // Try different formats in order: svg, png, jpg, jpeg
    const formats = ['svg', 'png', 'jpg', 'jpeg'];
    const mimeTypes: Record<string, string> = {
      'svg': 'image/svg+xml',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg'
    };
    
    let iconPath: string | null = null;
    let foundFormat: string | null = null;
    
    for (const format of formats) {
      const path = join(ICONS_BASE_PATH, category, `${name}.${format}`);
      if (existsSync(path)) {
        iconPath = path;
        foundFormat = format;
        break;
      }
    }
    
    if (!iconPath || !foundFormat) {
      res.status(404).json({ error: "Icon not found" });
      return;
    }
    
    res.setHeader('Content-Type', mimeTypes[foundFormat]);
    res.sendFile(iconPath);
  } catch (err) {
    console.error("Error serving icon:", err);
    res.status(500).json({ error: "Error serving icon" });
  }
});

router.get("/library/:category/:name/icon/:format", async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, name, format } = req.params;
    
    const validFormats = ['png', 'svg', 'jpg', 'jpeg'];
    if (!validFormats.includes(format.toLowerCase())) {
      res.status(400).json({ error: "Invalid format. Supported: png, svg, jpg, jpeg" });
      return;
    }
    
    const iconPath = join(ICONS_BASE_PATH, category, `${name}.${format}`);
    
    if (!existsSync(iconPath)) {
      res.status(404).json({ error: "Icon not found" });
      return;
    }
    
    const mimeTypes: Record<string, string> = {
      'png': 'image/png',
      'svg': 'image/svg+xml',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg'
    };
    
    res.setHeader('Content-Type', mimeTypes[format.toLowerCase()]);
    res.sendFile(iconPath);
  } catch (err) {
    console.error("Error serving icon:", err);
    res.status(500).json({ error: "Error serving icon" });
  }
});

router.post("/library/:category/:name/icon", (req: Request, res: Response, next: NextFunction) => {
  const { category, name } = req.params;
  
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const categoryPath = join(ICONS_BASE_PATH, category);
      if (!existsSync(categoryPath)) {
        mkdirSync(categoryPath, { recursive: true });
      }
      cb(null, categoryPath);
    },
    filename: (req, file, cb) => {
      const ext = file.originalname.split('.').pop()?.toLowerCase() || 'png';
      cb(null, `${name.toLowerCase()}.${ext}`);
    }
  });

  const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
  });

  upload.single('icon')(req, res, next);
}, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const { category, name } = req.params;
    const filePath = `/api/library/${category}/${name}/icon`;

    res.status(201).json({
      message: "Icon uploaded successfully",
      path: filePath,
      filename: req.file.filename,
      category: category,
      name: name
    });
  } catch (err) {
    console.error("Error uploading icon:", err);
    const errorMessage = err instanceof Error ? err.message : "Error uploading icon";
    res.status(500).json({ error: errorMessage });
  }
});

router.post("/library/upload", (req: Request, res: Response, next: NextFunction) => {
  const category = (req.body?.category || 'misc') as string;
  const name = (req.body?.name || 'icon') as string;
  
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const categoryPath = join(ICONS_BASE_PATH, category);
      if (!existsSync(categoryPath)) {
        mkdirSync(categoryPath, { recursive: true });
      }
      cb(null, categoryPath);
    },
    filename: (req, file, cb) => {
      const ext = file.originalname.split('.').pop()?.toLowerCase() || 'png';
      cb(null, `${name.toLowerCase()}.${ext}`);
    }
  });

  const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
  });

  upload.single('icon')(req, res, next);
}, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const category = req.body.category || 'misc';
    const name = req.body.name || req.file.filename.split('.')[0];
    const filePath = `/api/library/${category}/${name}/icon`;

    res.status(201).json({
      message: "Icon uploaded successfully",
      path: filePath,
      filename: req.file.filename,
      category: category,
      name: name
    });
  } catch (err) {
    console.error("Error uploading icon:", err);
    const errorMessage = err instanceof Error ? err.message : "Error uploading icon";
    res.status(500).json({ error: errorMessage });
  }
});

export { router };
