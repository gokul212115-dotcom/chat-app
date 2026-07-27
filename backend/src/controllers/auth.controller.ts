import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../services/auth.service';

const prisma = new PrismaClient();

const signupSchema = z.object({
  phoneNumber: z.string().min(8),
  name: z.string().min(1),
  password: z.string().min(6),
});

const loginSchema = z.object({
  phoneNumber: z.string().min(8),
  password: z.string().min(6),
});

export async function signup(req: Request, res: Response) {
  try {
    const { phoneNumber, name, password } = signupSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { phoneNumber } });
    if (existing) {
      return res.status(409).json({ message: 'Phone number already registered' });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { phoneNumber, name, passwordHash },
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.status(201).json({
      user: { id: user.id, phoneNumber: user.phoneNumber, name: user.name },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { phoneNumber, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user || !(await comparePassword(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid phone number or password' });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.status(200).json({
      user: { id: user.id, phoneNumber: user.phoneNumber, name: user.name },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(token) as { userId: number };
    const accessToken = generateAccessToken(decoded.userId);

    res.status(200).json({ accessToken });
  } catch (error: any) {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
}

export async function logout(_req: Request, res: Response) {
  res.status(200).json({ message: 'Logged out successfully' });
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export async function changePassword(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
