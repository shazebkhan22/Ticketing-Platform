import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { registerSseClient } from "../utils/sse";

export const eventsRouter = Router();

// Server-Sent Events stream — one long-lived GET connection per logged-in
// tab, authenticated the same way as any other route (session cookie),
// since EventSource sends cookies automatically when withCredentials is set.
eventsRouter.get("/", requireAuth, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const unregister = registerSseClient(req.session.userId!, res);

  // Keeps intermediate proxies/load balancers from timing out the idle
  // connection — a comment line (":") is ignored by EventSource but resets
  // any inactivity timers along the way.
  const heartbeat = setInterval(() => res.write(":heartbeat\n\n"), 30_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unregister();
  });
});
