import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as userController from '../controllers/user.controller';

const router = express.Router();

router.use(authMiddleware);

router.get('/me', userController.getMe);
router.put('/me', userController.updateMe);
router.get('/search', userController.searchUsers);

export default router;
