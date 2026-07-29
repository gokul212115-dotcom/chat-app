import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as z from 'zod';

const prisma = new PrismaClient();

const userSelect = {
  id: true,
  name: true,
  phoneNumber: true,
  avatarUrl: true,
  isOnline: true,
  lastSeenAt: true,
  statusMessage: true,
};

const createConversationSchema = z.object({
  participantUserIds: z.array(z.number()),
  isGroup: z.boolean().optional(),
  groupName: z.string().optional(),
});

export async function createConversation(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { participantUserIds, isGroup, groupName } = createConversationSchema.parse(req.body);

    if (participantUserIds.length === 0) {
      return res.status(400).json({ message: 'At least one participant is required' });
    }

    if (!isGroup && participantUserIds.length !== 1) {
      return res.status(400).json({ message: 'For a 1:1 conversation, exactly one participant is required' });
    }

    if (!isGroup) {
      const otherUserId = participantUserIds[0];

      const existingConversation = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { participants: { some: { userId } } },
            { participants: { some: { userId: otherUserId } } },
          ],
        },
        include: {
          participants: {
            select: {
              id: true,
              conversationId: true,
              userId: true,
              role: true,
              joinedAt: true,
              isMuted: true,
              isArchived: true,
              user: { select: userSelect },
            },
          },
        },
      });

      if (existingConversation) {
        return res.json(existingConversation);
      }
    }

    const conversation = await prisma.conversation.create({
      data: {
        isGroup: isGroup ?? false,
        groupName,
        participants: {
          createMany: {
            data: [
              { userId, role: isGroup ? 'ADMIN' : 'MEMBER' },
              ...participantUserIds.map(participantUserId => ({
                userId: participantUserId,
                role: 'MEMBER' as const,
              })),
            ],
          },
        },
      },
      include: {
        participants: {
          select: {
            id: true,
            conversationId: true,
            userId: true,
            role: true,
            joinedAt: true,
            isMuted: true,
            isArchived: true,
            user: { select: userSelect },
          },
        },
      },
    });

    return res.json(conversation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listConversations(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { cursor, limit: limitQuery } = req.query as { cursor?: string; limit?: string };
    const limit = parseInt(limitQuery ?? '20', 10);

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          select: {
            id: true,
            conversationId: true,
            userId: true,
            role: true,
            joinedAt: true,
            isMuted: true,
            isArchived: true,
            user: { select: userSelect },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      cursor: cursor ? { id: parseInt(cursor, 10) } : undefined,
      skip: cursor ? 1 : 0,
      take: limit + 1,
      orderBy: { updatedAt: 'desc' },
    });

    const nextCursor = conversations.length > limit
      ? conversations[conversations.length - 1].id.toString()
      : null;

    const result = conversations.slice(0, limit).map(conversation => ({
      id: conversation.id,
      isGroup: conversation.isGroup,
      groupName: conversation.groupName,
      participants: conversation.participants.map(participant => ({
        id: participant.userId,
        name: participant.user.name,
        phoneNumber: participant.user.phoneNumber,
        avatarUrl: participant.user.avatarUrl,
        isOnline: participant.user.isOnline,
        lastSeenAt: participant.user.lastSeenAt,
      })),
      lastMessage: conversation.messages.length > 0 ? {
        id: conversation.messages[0].id,
        content: conversation.messages[0].content,
        senderId: conversation.messages[0].senderId,
        createdAt: conversation.messages[0].createdAt,
      } : null,
    }));

    return res.json({ conversations: result, nextCursor });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getConversationMessages(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { conversationId } = req.params as { conversationId: string };
    const conversationIdNum = parseInt(conversationId, 10);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationIdNum },
      include: {
        participants: true,
      },
    });

    if (!conversation || !conversation.participants.some(participant => participant.userId === userId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { cursor, limit: limitQuery } = req.query as { cursor?: string; limit?: string };
    const limit = parseInt(limitQuery ?? '30', 10);

    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversationIdNum,
      },
      include: {
        sender: { select: userSelect },
        replyToMessage: {
          select: {
            id: true,
            content: true,
            sender: { select: { name: true } },
          },
        },
        reactions: {
          select: { userId: true, emoji: true },
        },
      },
      cursor: cursor ? { id: parseInt(cursor, 10) } : undefined,
      skip: cursor ? 1 : 0,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
    });

    const nextCursor = messages.length > limit
      ? messages[messages.length - 1].id.toString()
      : null;

    const result = messages.slice(0, limit).map(message => ({
      id: message.id,
      conversationId: message.conversationId,
      content: message.content,
      messageType: message.messageType,
      senderId: message.senderId,
      senderName: message.sender.name,
      senderAvatarUrl: message.sender.avatarUrl,
      replyToMessageId: message.replyToMessageId,
      replyToMessage: message.replyToMessage
        ? {
            id: message.replyToMessage.id,
            content: message.replyToMessage.content,
            senderName: message.replyToMessage.sender.name,
          }
        : null,
      isEdited: message.isEdited,
      isDeletedForEveryone: message.isDeletedForEveryone,
      reactions: message.reactions,
      createdAt: message.createdAt,
    }));

    return res.json({ messages: result, nextCursor });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}


const addMembersSchema = z.object({
  userIds: z.array(z.number()),
});

export async function addMembers(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { conversationId } = req.params as { conversationId: string };
    const conversationIdNum = parseInt(conversationId, 10);

    const { userIds } = addMembersSchema.parse(req.body);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationIdNum },
      include: { participants: true },
    });

    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const requester = conversation.participants.find((p) => p.userId === userId);
    if (!requester) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const existingIds = new Set(conversation.participants.map((p) => p.userId));
    const newUserIds = userIds.filter((id) => !existingIds.has(id));

    if (newUserIds.length === 0) {
      return res.status(400).json({ message: 'All specified users are already members' });
    }

    await prisma.conversationParticipant.createMany({
      data: newUserIds.map((newUserId) => ({
        conversationId: conversationIdNum,
        userId: newUserId,
        role: 'MEMBER' as const,
      })),
    });

    const updated = await prisma.conversation.findUnique({
      where: { id: conversationIdNum },
      include: {
        participants: {
          include: { user: { select: userSelect } },
        },
      },
    });

    return res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function removeMember(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { conversationId, memberId } = req.params as { conversationId: string; memberId: string };
    const conversationIdNum = parseInt(conversationId, 10);
    const memberIdNum = parseInt(memberId, 10);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationIdNum },
      include: { participants: true },
    });

    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const requester = conversation.participants.find((p) => p.userId === userId);
    if (!requester || requester.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can remove members' });
    }

    await prisma.conversationParticipant.deleteMany({
      where: { conversationId: conversationIdNum, userId: memberIdNum },
    });

    return res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function leaveGroup(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { conversationId } = req.params as { conversationId: string };
    const conversationIdNum = parseInt(conversationId, 10);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationIdNum },
      include: { participants: true },
    });

    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }

    await prisma.conversationParticipant.deleteMany({
      where: { conversationId: conversationIdNum, userId },
    });

    return res.json({ message: 'Left group successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

const updateGroupSchema = z.object({
  groupName: z.string().min(1).optional(),
  groupAvatarUrl: z.string().optional(),
});

export async function updateGroup(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { conversationId } = req.params as { conversationId: string };
    const conversationIdNum = parseInt(conversationId, 10);

    const { groupName, groupAvatarUrl } = updateGroupSchema.parse(req.body);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationIdNum },
      include: { participants: true },
    });

    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const requester = conversation.participants.find((p) => p.userId === userId);
    if (!requester) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationIdNum },
      data: { groupName, groupAvatarUrl },
    });

    return res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
