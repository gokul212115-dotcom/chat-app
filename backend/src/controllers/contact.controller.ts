import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as z from 'zod';

const prisma = new PrismaClient();

const addContactSchema = z.object({
  contactUserId: z.number(),
});

export async function addContact(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { contactUserId } = addContactSchema.parse(req.body);

    if (contactUserId === userId) {
      return res.status(400).json({ message: 'Cannot add yourself as a contact' });
    }

    const existingContact = await prisma.contact.findFirst({
      where: {
        ownerId: userId,
        contactUserId: contactUserId,
      },
    });

    if (existingContact) {
      return res.status(409).json({ message: 'Contact already exists' });
    }

    const contact = await prisma.contact.create({
      data: {
        ownerId: userId,
        contactUserId: contactUserId,
      },
      include: {
        contactUser: true,
      },
    });

    return res.json(contact);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listContacts(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const contacts = await prisma.contact.findMany({
      where: { ownerId: userId },
      include: {
        contactUser: true,
      },
    });

    const result = contacts.map(contact => ({
      id: contact.contactUserId,
      name: contact.contactUser.name,
      phoneNumber: contact.contactUser.phoneNumber,
      avatarUrl: contact.contactUser.avatarUrl,
      isOnline: contact.contactUser.isOnline,
      lastSeenAt: contact.contactUser.lastSeenAt,
    }));

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function removeContact(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { contactUserId } = req.params as { contactUserId: string };
    const parsedContactUserId = parseInt(contactUserId, 10);

    if (isNaN(parsedContactUserId)) {
      return res.status(400).json({ message: 'Invalid contact user ID' });
    }

    await prisma.contact.deleteMany({
      where: {
        ownerId: userId,
        contactUserId: parsedContactUserId,
      },
    });

    return res.json({ message: 'Contact removed successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
