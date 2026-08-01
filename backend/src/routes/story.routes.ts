import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as storyController from '../controllers/story.controller';

const router = express.Router();

router.use(authMiddleware);

router.post('/', storyController.createStory);
router.get('/feed', storyController.getFeed);
router.delete('/:storyId', storyController.deleteStory);

export default router;
