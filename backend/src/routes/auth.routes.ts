import express from 'express';
import { signup, login, refreshToken, logout, changePassword } from '../controllers/auth.controller';
import { firebasePhoneAuth, signupWithOtp } from '../controllers/firebaseAuth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/signup', signup); // original password signup (can keep as backup)
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.post('/change-password', authMiddleware, changePassword);
router.post('/firebase-phone', firebasePhoneAuth); // passwordless login (not used now)
router.post('/signup-with-otp', signupWithOtp);

export default router;
