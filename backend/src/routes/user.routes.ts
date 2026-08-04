import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as userController from '../controllers/user.controller';

const router = express.Router();

router.use(authMiddleware);

router.get('/me', userController.getMe);
router.put('/me', userController.updateMe);
router.get('/search', userController.searchUsers);
router.post("/:userId/block", authMiddleware, userController.blockUser);
router.post("/:userId/unblock", authMiddleware, userController.unblockUser);
router.get("/:userId/blocked", authMiddleware, userController.checkBlocked);
router.post("/:userId/block", authMiddleware, userController.blockUser);
router.post("/:userId/unblock", authMiddleware, userController.unblockUser);
router.get("/:userId/blocked", authMiddleware, userController.checkBlocked);

export default router;
