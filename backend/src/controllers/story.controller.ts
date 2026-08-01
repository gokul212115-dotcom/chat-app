import { Request, Response } from 'express';
import { PrismaClient, StoryMediaType } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createStorySchema = z.object({
  caption: z.string().optional(),
  mediaUrl: z.string().optional(),
  mediaType: z.nativeEnum(StoryMediaType).default(StoryMediaType.TEXT),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().positive().optional(),
  durationSeconds: z.number().positive().optional(),
});

export async function createStory(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const data = createStorySchema.parse(req.body);

    const story = await prisma.story.create({
      data: {
        userId,
        caption: data.caption,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        durationSeconds: data.durationSeconds,
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    return res.status(201).json(story);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.message });
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getFeed(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Get contacts of this user
    const contacts = await prisma.contact.findMany({
      where: { ownerId: userId },
      select: { contactUserId: true },
    });
    const contactIds = contacts.map((c) => c.contactUserId);
    // Include self to see own stories
    const allRelevantIds = [...contactIds, userId];

    const now = new Date();

    // Fetch all non-expired stories from relevant users, ordered by creation
    const stories = await prisma.story.findMany({
      where: {
        userId: { in: allRelevantIds },
        expiresAt: { gt: now },
      },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by user
    const grouped: Record<number, { user: any; stories: any[] }> = {};
    for (const story of stories) {
      const uid = story.userId;
      if (!grouped[uid]) {
        grouped[uid] = { user: story.user, stories: [] };
      }
      grouped[uid].stories.push(story);
    }

    // Sort users: own stories first, then others (newest first by latest story)
    const result = Object.values(grouped).sort((a, b) => {
      if (a.user.id === userId) return -1;
      if (b.user.id === userId) return 1;
      const aLatest = a.stories[a.stories.length - 1].createdAt;
      const bLatest = b.stories[b.stories.length - 1].createdAt;
      return bLatest.getTime() - aLatest.getTime();
    });

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deleteStory(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const storyId = parseInt(req.params.storyId, 10);
    if (isNaN(storyId)) return res.status(400).json({ message: 'Invalid story ID' });

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return res.status(404).json({ message: 'Story not found' });
    if (story.userId !== userId) return res.status(403).json({ message: 'Not your story' });

    await prisma.story.delete({ where: { id: storyId } });
    return res.json({ message: 'Story deleted' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
