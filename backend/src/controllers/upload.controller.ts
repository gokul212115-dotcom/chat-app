import { Request, Response } from 'express';

export function uploadFile(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  return res.status(201).json({
    url: fileUrl,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    originalName: req.file.originalname,
  });
}
