import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app, initializeServer } from '../server.ts';

let ready: Promise<void> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!ready) ready = initializeServer();
  await ready;
  return app(req, res);
}
