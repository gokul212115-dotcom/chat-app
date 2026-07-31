import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as conversationController from '../controllers/conversation.controller';

const router = express.Router();

router.use(authMiddleware);
router.post('/create', conversationController.createConversation);
router.get('/', conversationController.listConversations);
router.get('/:conversationId/messages', conversationController.getConversationMessages);
router.post('/:conversationId/members', conversationController.addMembers);
router.delete('/:conversationId/members/:memberId', conversationController.removeMember);
router.post('/:conversationId/leave', conversationController.leaveGroup);
router.patch('/:conversationId', conversationController.updateGroup);
router.post('/:conversationId/archive', conversationController.toggleArchive);

export default router;
