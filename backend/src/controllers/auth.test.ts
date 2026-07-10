import { describe, it, expect, vi, beforeAll } from "vitest";
import bcrypt from "bcrypt";
import type { Request, Response } from "express";

vi.mock("../db/pool", () => ({
  pool: { query: vi.fn() },
}));

import { pool } from "../db/pool";
import { login } from "./auth";

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function mockReq(body: unknown): Request {
  return {
    body,
    session: {
      regenerate: (cb: (err?: unknown) => void) => cb(),
    },
  } as unknown as Request;
}

describe("login", () => {
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash("correct-password", 4);
  });

  it("rejects a missing username/password with 400", async () => {
    const req = mockReq({ username: "", password: "" });
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects an unknown username with 401", async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as any);
    const req = mockReq({ username: "nobody", password: "whatever" });
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("rejects a wrong password with 401", async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({
      rows: [{ id: 1, username: "alice", password_hash: passwordHash, role: "employee" }],
    } as any);
    const req = mockReq({ username: "alice", password: "wrong-password" });
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("logs in successfully and populates the session", async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          username: "alice",
          password_hash: passwordHash,
          role: "employee",
          display_name: "Alice",
          email: "alice@example.com",
        },
      ],
    } as any);
    const req = mockReq({ username: "alice", password: "correct-password" });
    const res = mockRes();

    await login(req, res);

    expect(req.session.userId).toBe(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ username: "alice", role: "employee" })
    );
  });
});
