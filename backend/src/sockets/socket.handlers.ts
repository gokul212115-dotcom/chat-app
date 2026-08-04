import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';

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

async function initializeConnection(io: Server, socket: Socket, userId: number) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true },
    });

    socket.join(`user:${userId}`);

    const conversations = await prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });

    conversations.forEach(({ conversationId }) => {
      socket.join(`conversation:${conversationId}`);
    });

    conversations.forEach(({ conversationId }) => {
      io.to(`conversation:${conversationId}`).emit('presence:update', {
        userId,
        isOnline: true,
        lastSeenAt: null,
      });
    });

    console.log(`User ${userId} connected`);
  } catch (error) {
    console.error(error);
    socket.emit('error', { message: 'Failed to initialize connection' });
    socket.disconnect(true);
  }
}

export const registerSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as number;

    socket.on('message:send', async (data, callback) => {
      try {
        const { conversationId, content, messageType, replyToMessageId } = data;

        const isParticipant = await prisma.conversationParticipant.findFirst({
          where: { conversationId, userId },
        });

        if (!isParticipant) {
          if (callback) callback({ error: 'Not authorized to send messages in this conversation' });
          return;
        }

                // Block check for 1-on-1 conversations
        const conv = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { participants: true },
        });
        if (conv && !conv.isGroup) {
          const other = conv.participants.find(p => p.userId !== userId);
          if (other) {
            const blocked = await prisma.blockedUser.findFirst({
              where: {
                OR: [
                  { blockerId: userId, blockedUserId: other.userId },
                  { blockerId: other.userId, blockedUserId: userId }
                ]
              }
            });
            if (blocked) {
              if (callback) callback({ error: 'You cannot message this user because of block settings.' });
              return;
            }
          }
        }

const message = await prisma.message.create({
          data: {
            content,
            messageType: messageType ?? 'TEXT',
            replyToMessageId: replyToMessageId ?? null,
            senderId: userId,
            conversationId,
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
          },
        });

        const payload = {
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
          reactions: [] as Array<{ userId: number; emoji: string }>,
          createdAt: message.createdAt,
        };

        io.to(`conversation:${conversationId}`).emit('message:new', payload);

        if (callback) callback({ message: payload });
      } catch (error) {
        console.error(error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing:start', (data) => {
      try {
        const { conversationId } = data;
        socket.to(`conversation:${conversationId}`).emit('typing:update', {
          conversationId,
          userId,
          isTyping: true,
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to start typing' });
      }
    });

    socket.on('typing:stop', (data) => {
      try {
        const { conversationId } = data;
        socket.to(`conversation:${conversationId}`).emit('typing:update', {
          conversationId,
          userId,
          isTyping: false,
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to stop typing' });
      }
    });

    socket.on('message:delivered', async (data) => {
      try {
        const { messageId } = data;

        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (!message) return;

        await prisma.messageStatus.upsert({
          where: { messageId_userId: { messageId, userId } },
          create: { messageId, userId, status: 'DELIVERED' },
          update: { status: 'DELIVERED' },
        });

        io.to(`conversation:${message.conversationId}`).emit('message:status', {
          messageId,
          userId,
          status: 'DELIVERED',
        });
      } catch (error) {
        console.error(error);
        socket.emit('error', { message: 'Failed to mark message as delivered' });
      }
    });

    socket.on('message:read', async (data) => {
      try {
        const { messageId } = data;

        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (!message) return;

        await prisma.messageStatus.upsert({
          where: { messageId_userId: { messageId, userId } },
          create: { messageId, userId, status: 'READ' },
          update: { status: 'READ' },
        });

        io.to(`conversation:${message.conversationId}`).emit('message:status', {
          messageId,
          userId,
          status: 'READ',
        });
      } catch (error) {
        console.error(error);
        socket.emit('error', { message: 'Failed to mark message as read' });
      }
    });

    socket.on('message:edit', async (data, callback) => {
      try {
        const { messageId, content } = data;

        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (!message) {
          if (callback) callback({ error: 'Message not found' });
          return;
        }

        if (message.senderId !== userId) {
          if (callback) callback({ error: 'Not authorized to edit this message' });
          return;
        }

        const updated = await prisma.message.update({
          where: { id: messageId },
          data: { content, isEdited: true },
          include: {
            sender: { select: userSelect },
          },
        });

        const payload = {
          id: updated.id,
          conversationId: updated.conversationId,
          content: updated.content,
          messageType: updated.messageType,
          senderId: updated.senderId,
          senderName: updated.sender.name,
          senderAvatarUrl: updated.sender.avatarUrl,
          replyToMessageId: updated.replyToMessageId,
          isEdited: updated.isEdited,
          isDeletedForEveryone: updated.isDeletedForEveryone,
          createdAt: updated.createdAt,
        };

        io.to(`conversation:${message.conversationId}`).emit('message:updated', payload);

        if (callback) callback({ message: payload });
      } catch (error) {
        console.error(error);
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    socket.on('message:delete', async (data, callback) => {
      try {
        const { messageId, forEveryone } = data;

        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (!message) {
          if (callback) callback({ error: 'Message not found' });
          return;
        }

        if (message.senderId !== userId) {
          if (callback) callback({ error: 'Not authorized to delete this message' });
          return;
        }

        if (!forEveryone) {
          if (callback) callback({ error: 'Delete for me is not supported yet' });
          return;
        }

        await prisma.message.update({
          where: { id: messageId },
          data: { isDeletedForEveryone: true, content: null },
        });

        io.to(`conversation:${message.conversationId}`).emit('message:deleted', {
          messageId,
          conversationId: message.conversationId,
        });

        if (callback) callback({ success: true });
      } catch (error) {
        console.error(error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    socket.on('reaction:add', async (data, callback) => {
      try {
        const { messageId, emoji } = data;

        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (!message) {
          if (callback) callback({ error: 'Message not found' });
          return;
        }

        const isParticipant = await prisma.conversationParticipant.findFirst({
          where: { conversationId: message.conversationId, userId },
        });

        if (!isParticipant) {
          if (callback) callback({ error: 'Not authorized' });
          return;
        }

        await prisma.messageReaction.upsert({
          where: {
            messageId_userId_emoji: { messageId, userId, emoji },
          },
          create: { messageId, userId, emoji },
          update: {},
        });

        io.to(`conversation:${message.conversationId}`).emit('reaction:added', {
          messageId,
          conversationId: message.conversationId,
          userId,
          emoji,
        });

        if (callback) callback({ success: true });
      } catch (error) {
        console.error(error);
        socket.emit('error', { message: 'Failed to add reaction' });
      }
    });

    socket.on('reaction:remove', async (data, callback) => {
      try {
        const { messageId, emoji } = data;

        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (!message) {
          if (callback) callback({ error: 'Message not found' });
          return;
        }

        await prisma.messageReaction.deleteMany({
          where: { messageId, userId, emoji },
        });

        io.to(`conversation:${message.conversationId}`).emit('reaction:removed', {
          messageId,
          conversationId: message.conversationId,
          userId,
          emoji,
        });

        if (callback) callback({ success: true });
      } catch (error) {
        console.error(error);
        socket.emit('error', { message: 'Failed to remove reaction' });
      }
    });

    socket.on('disconnect', async () => {
      try {
        const now = new Date();

        await prisma.user.update({
          where: { id: userId },
          data: { isOnline: false, lastSeenAt: now },
        });

        const conversations = await prisma.conversationParticipant.findMany({
          where: { userId },
          select: { conversationId: true },
        });

        conversations.forEach(({ conversationId }) => {
          io.to(`conversation:${conversationId}`).emit('presence:update', {
            userId,
            isOnline: false,
            lastSeenAt: now,
          });
        });

        console.log(`User ${userId} disconnected`);
      } catch (error) {
        console.error(error);
      }
    });

    socket.on('call:offer', (data) => {
      try {
        const { toUserId, conversationId, offer, callType } = data;
        io.to(`user:${toUserId}`).emit('call:incoming', {
          fromUserId: userId,
          conversationId,
          offer,
          callType,
        });
      } catch (error) {
        console.error(error);
        socket.emit('error', { message: 'Failed to send call offer' });
      }
    });

    socket.on('call:answer', (data) => {
      try {
        const { toUserId, answer } = data;
        io.to(`user:${toUserId}`).emit('call:answered', {
          fromUserId: userId,
          answer,
        });
      } catch (error) {
        console.error(error);
        socket.emit('error', { message: 'Failed to send call answer' });
      }
    });

    socket.on('call:ice-candidate', (data) => {
      try {
        const { toUserId, candidate } = data;
        io.to(`user:${toUserId}`).emit('call:ice-candidate', {
          fromUserId: userId,
          candidate,
        });
      } catch (error) {
        console.error(error);
      }
    });

    socket.on('call:reject', (data) => {
      try {
        const { toUserId } = data;
        io.to(`user:${toUserId}`).emit('call:rejected', {
          fromUserId: userId,
        });
      } catch (error) {
        console.error(error);
      }
    });

    socket.on('call:end', (data) => {
      try {
        const { toUserId } = data;
        io.to(`user:${toUserId}`).emit('call:ended', {
          fromUserId: userId,
        });
      } catch (error) {
        console.error(error);
      }
    });

    initializeConnection(io, socket, userId);
  });
};
