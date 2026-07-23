import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // Register listeners synchronously FIRST, so no early events are dropped
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

        const message = await prisma.message.create({
          data: {
            content,
            messageType: messageType ?? 'TEXT',
            replyToMessageId: replyToMessageId ?? null,
            senderId: userId,
            conversationId,
          },
          include: {
            sender: true,
          },
        });

        io.to(`conversation:${conversationId}`).emit('message:new', message);

        if (callback) callback({ message });
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

    // Now do the async initialization (marking online, joining rooms)
    initializeConnection(io, socket, userId);
  });
};
