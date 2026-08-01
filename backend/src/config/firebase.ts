import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';

const serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json');

const app = initializeApp({
  credential: cert(serviceAccountPath),
});

export const firebaseAuth = getAuth(app);
