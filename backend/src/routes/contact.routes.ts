import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as contactController from '../controllers/contact.controller';

const router = express.Router();

router.use(authMiddleware);

router.post('/add', contactController.addContact);
router.get('/', contactController.listContacts);
router.delete('/:contactUserId', contactController.removeContact);

export default router;
