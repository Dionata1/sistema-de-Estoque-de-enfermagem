import { cert, getApps, initializeApp, getApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { initializeApp as initializeClientApp, getApps as getClientApps, getApp as getClientApp } from 'firebase/app';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import fs from 'fs';
import path from 'path';

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

function readConfig(): any {
  const candidates = [
    path.join(process.cwd(), 'firebase-applet-config.json'),
    path.join(process.cwd(), 'sistema-de-estoque-de-enfermagem-ceet (8)', 'firebase-applet-config.json'),
  ];
  const file = candidates.find(p => fs.existsSync(p));
  if (!file) throw new Error('firebase-applet-config.json não encontrado.');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (raw) {
    try { return JSON.parse(raw); } catch { throw new Error('FIREBASE_SERVICE_ACCOUNT não contém JSON válido.'); }
  }
  const filePath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (filePath && fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const candidates = [
    path.join(process.cwd(), 'firebase-service-account.json'),
    path.join(process.cwd(), 'service-account.json'),
    path.join(process.env.APPDATA || '', 'CEET-Estoque', 'firebase-service-account.json'),
  ];
  for (const candidate of candidates) if (candidate && fs.existsSync(candidate)) return JSON.parse(fs.readFileSync(candidate, 'utf8'));
  throw new Error('Credenciais do Firebase Admin não configuradas. Defina FIREBASE_SERVICE_ACCOUNT no Vercel ou GOOGLE_APPLICATION_CREDENTIALS localmente.');
}

let adminApp: App | null = null;
export function getFirebaseAdminApp(): App {
  if (adminApp) return adminApp;
  const existing = getApps();
  if (existing.length) { adminApp = getApp(); return adminApp; }
  const config = readConfig();
  const sa = readServiceAccount();
  if (sa.project_id !== config.projectId) throw new Error(`Service Account pertence ao projeto ${sa.project_id}, mas o sistema está configurado para ${config.projectId}.`);
  adminApp = initializeApp({
    credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key.replace(/\\n/g, '\n') }),
    projectId: sa.project_id,
    storageBucket: config.storageBucket,
  });
  return adminApp;
}

export const db = (): Firestore => {
  const config = readConfig();
  return getFirestore(getFirebaseAdminApp(), config.firestoreDatabaseId || '(default)');
};

// Mantém Storage pelo SDK Web existente para não alterar o fluxo de upload.
export const storage = (): FirebaseStorage => {
  const config = readConfig();
  const app = getClientApps().length ? getClientApp() : initializeClientApp(config);
  return getStorage(app);
};
