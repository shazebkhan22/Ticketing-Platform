import { Response } from "express";

// In-memory only — fine for a single Node process (same assumption the
// session store's connect-pg-simple table doesn't need to worry about here,
// since this is transient live-broadcast, not anything that must survive a
// restart or scale across multiple instances).
interface SseClient {
  userId: number;
  res: Response;
}

const clients = new Set<SseClient>();

export function registerSseClient(userId: number, res: Response): () => void {
  const client: SseClient = { userId, res };
  clients.add(client);
  return () => {
    clients.delete(client);
  };
}

// excludeUserId lets the actor who triggered the event skip their own popup
// (they already know — they just submitted the form).
export function broadcastEvent(event: string, data: unknown, excludeUserId?: number) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    if (client.userId === excludeUserId) continue;
    client.res.write(payload);
  }
}
