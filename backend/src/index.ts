import express from 'express';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import contactRoutes from './routes/contact.routes';
import conversationRoutes from './routes/conversation.routes';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/conversations', conversationRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
