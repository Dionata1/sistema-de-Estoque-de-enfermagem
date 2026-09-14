import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdminApp } from './admin';
import fs from 'fs';
import path from 'path';

export function adminAuth() { return getAuth(getFirebaseAdminApp()); }

export async function createFirebaseUser(input: { email: string; password: string; displayName: string; photoUrl?: string; disabled?: boolean }) {
  const user = await adminAuth().createUser({
    email: input.email,
    password: input.password,
    displayName: input.displayName,
    ...(input.photoUrl ? { photoURL: input.photoUrl } : {}),
    disabled: Boolean(input.disabled),
  });
  return { localId: user.uid, uid: user.uid, email: user.email, displayName: user.displayName };
}

export async function updateFirebaseUser(localId: string, input: { email?: string; password?: string; displayName?: string; photoUrl?: string; disableUser?: boolean }) {
  const user = await adminAuth().updateUser(localId, {
    ...(input.email ? { email: input.email } : {}),
    ...(input.password ? { password: input.password } : {}),
    ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
    ...(input.photoUrl !== undefined ? { photoURL: input.photoUrl } : {}),
    ...(input.disableUser !== undefined ? { disabled: input.disableUser } : {}),
  });
  return { uid: user.uid, email: user.email, disabled: user.disabled };
}

export async function disableFirebaseUser(localId: string, disabled: boolean) {
  return updateFirebaseUser(localId, { disableUser: disabled });
}

export async function deleteFirebaseUser(localId: string, _idToken?: string) {
  await adminAuth().deleteUser(localId);
  return { success: true };
}

export async function signInFirebaseUser(email: string, password: string) {
  const configPath = [
    path.join(process.cwd(), 'firebase-applet-config.json'),
    path.join(process.cwd(), 'sistema-de-estoque-de-enfermagem-ceet (8)', 'firebase-applet-config.json'),
  ].find(p => fs.existsSync(p));
  if (!configPath) throw new Error('firebase-applet-config.json não encontrado.');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(config.apiKey)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err: any = new Error(payload?.error?.message === 'INVALID_LOGIN_CREDENTIALS' ? 'E-mail ou senha incorretos.' : payload?.error?.message || 'Falha na autenticação Firebase.');
    err.code = payload?.error?.message;
    throw err;
  }
  return payload;
}

export async function changeFirebaseUserPassword(email: string, currentPassword: string, newPassword: string) {
  const session = await signInFirebaseUser(email, currentPassword);
  const configPath = [
    path.join(process.cwd(), 'firebase-applet-config.json'),
    path.join(process.cwd(), 'sistema-de-estoque-de-enfermagem-ceet (8)', 'firebase-applet-config.json'),
  ].find(p => fs.existsSync(p));
  if (!configPath) throw new Error('firebase-applet-config.json não encontrado.');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${encodeURIComponent(config.apiKey)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: session.idToken, password: newPassword, returnSecureToken: true }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || 'Não foi possível alterar a senha.');
  return payload;
}
