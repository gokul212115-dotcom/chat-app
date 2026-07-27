import express from 'express';
import { signup, login, refreshToken, logout, changePassword } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.post('/change-password', authMiddleware, changePassword);

export default router;
