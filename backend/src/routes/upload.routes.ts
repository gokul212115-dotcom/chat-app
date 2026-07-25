import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload } from '../config/upload';
import { uploadFile } from '../controllers/upload.controller';

const router = express.Router();

router.use(authMiddleware);
router.post('/', upload.single('file'), uploadFile);

export default router;
