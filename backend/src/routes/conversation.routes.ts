import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as conversationController from '../controllers/conversation.controller';

const router = express.Router();

router.use(authMiddleware);

router.post('/create', conversationController.createConversation);
router.get('/', conversationController.listConversations);
router.get('/:conversationId/messages', conversationController.getConversationMessages);

export default router;
