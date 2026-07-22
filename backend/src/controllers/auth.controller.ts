import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
} from '../services/auth.service';

const prisma = new PrismaClient();

const userSchema = z.object({
  phoneNumber: z.string().min(10),
  name: z.string(),
  password: z.string().min(6),
});

export const signup = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, name, password } = userSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { phoneNumber } });
    if (existingUser) {
      return res.status(409).json({ message: 'Phone number already taken' });
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: { phoneNumber, name, password: hashedPassword },
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.json({ accessToken, refreshToken });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, password } = userSchema.pick({ phoneNumber: true, password: true }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.json({ accessToken, refreshToken });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'default_refresh_secret');
    const userId = decoded.userId as number;

    const newAccessToken = generateAccessToken(userId);
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
