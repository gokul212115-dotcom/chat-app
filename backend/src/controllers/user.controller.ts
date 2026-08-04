import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const userSelect = {
  id: true,
  phoneNumber: true,
  name: true,
  email: true,
  avatarUrl: true,
  statusMessage: true,
  isOnline: true,
  lastSeenAt: true,
};

export async function getMe(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().optional(),
  statusMessage: z.string().optional(),
});

export async function updateMe(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const data = updateMeSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: userSelect,
    });

    return res.json(user);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function searchUsers(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { phoneNumber } = req.query as { phoneNumber: string };

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Flexible search: if input starts with '+', exact match.
    // If it's all digits, search by ending (country-code agnostic).
    const isDigitsOnly = /^\d+$/.test(phoneNumber);
    let where: any;
    if (phoneNumber.startsWith('+')) {
      where = { phoneNumber };
    } else if (isDigitsOnly) {
      where = { phoneNumber: { endsWith: phoneNumber } };
    } else {
      where = { phoneNumber };
    }

    const user = await prisma.user.findFirst({
      where: {
        ...where,
        id: { not: userId },
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}


export async function blockUser(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const targetUserId = parseInt(req.params.userId, 10);
    if (isNaN(targetUserId)) return res.status(400).json({ message: 'Invalid user' });
    if (userId === targetUserId) return res.status(400).json({ message: 'Cannot block yourself' });

    await prisma.blockedUser.upsert({
      where: { blockerId_blockedUserId: { blockerId: userId, blockedUserId: targetUserId } },
      update: {},
      create: { blockerId: userId, blockedUserId: targetUserId },
    });
    return res.json({ message: 'User blocked' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function unblockUser(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const targetUserId = parseInt(req.params.userId, 10);
    if (isNaN(targetUserId)) return res.status(400).json({ message: 'Invalid user' });

    await prisma.blockedUser.deleteMany({
      where: { blockerId: userId, blockedUserId: targetUserId },
    });
    return res.json({ message: 'User unblocked' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function checkBlocked(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const targetUserId = parseInt(req.params.userId, 10);
    const [blockedByMe, blockedMe] = await Promise.all([
      prisma.blockedUser.findUnique({
        where: { blockerId_blockedUserId: { blockerId: userId, blockedUserId: targetUserId } },
      }),
      prisma.blockedUser.findUnique({
        where: { blockerId_blockedUserId: { blockerId: targetUserId, blockedUserId: userId } },
      }),
    ]);
    return res.json({ blockedByMe: !!blockedByMe, blockedMe: !!blockedMe });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
