import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';

// Prefer FIREBASE_SERVICE_ACCOUNT env var (JSON string) for hosted environments
// like Render, where writing a physical file isn't practical. Fall back to the
// local firebase-service-account.json file for local development.
let credentialInput: string | object;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  credentialInput = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  credentialInput = path.resolve(__dirname, '../../firebase-service-account.json');
}

const app = initializeApp({
  credential: cert(credentialInput as any),
});
export const firebaseAuth = getAuth(app);
