import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../services/auth.service';

export const socketAuthMiddleware = (io: Server) => {
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = verifyAccessToken(token) as { userId: number };
      socket.data.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });
};
