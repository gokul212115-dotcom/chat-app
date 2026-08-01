import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { firebaseAuth } from '../config/firebase';
import {
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
} from '../services/auth.service';

const prisma = new PrismaClient();

const firebasePhoneSchema = z.object({
  idToken: z.string().min(1),
});

export async function firebasePhoneAuth(req: Request, res: Response) {
  try {
    const { idToken } = firebasePhoneSchema.parse(req.body);

    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    const phoneNumber = decodedToken.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number not verified' });
    }

    let user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phoneNumber,
          name: `User${Date.now().toString().slice(-6)}`,
          passwordHash: '',
        },
      });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    return res.json({
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        statusMessage: user.statusMessage,
        isOnline: user.isOnline,
        lastSeenAt: user.lastSeenAt,
      },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Invalid or expired OTP token' });
    }
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

const signupWithOtpSchema = z.object({
  idToken: z.string().min(1),
  name: z.string().min(1),
  password: z.string().min(6),
});

export async function signupWithOtp(req: Request, res: Response) {
  try {
    const { idToken, name, password } = signupWithOtpSchema.parse(req.body);

    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    const phoneNumber = decodedToken.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number not verified' });
    }

    const existingUser = await prisma.user.findUnique({ where: { phoneNumber } });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this phone number already exists' });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        phoneNumber,
        name,
        passwordHash,
      },
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    return res.status(201).json({
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        statusMessage: user.statusMessage,
        isOnline: user.isOnline,
        lastSeenAt: user.lastSeenAt,
      },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Invalid or expired OTP token' });
    }
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
