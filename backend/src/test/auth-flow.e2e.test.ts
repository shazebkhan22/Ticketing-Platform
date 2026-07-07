import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../app";
import { TEST_ADMIN } from "./testUsers";

// Exercises the core session-auth flow end to end against a real
// (disposable) database — the thing most likely to silently break when
// the session/cookie/middleware wiring changes, since nothing else in the
// app works if this doesn't.
describe("login -> create ticket -> logout", () => {
  it("logs in, creates a ticket while authenticated, then logs out and loses access", async () => {
    const agent = request.agent(app);

    const loginRes = await agent
      .post("/api/auth/login")
      .send({ username: TEST_ADMIN.username, password: TEST_ADMIN.password });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.username).toBe(TEST_ADMIN.username);

    const meRes = await agent.get("/api/auth/me");
    expect(meRes.status).toBe(200);
    const adminId = meRes.body.id;

    const createRes = await agent.post("/api/tickets").send({
      ticketDate: "2026-01-01",
      mode: "Call",
      companyName: "Acme Corp",
      contactName: "Jane Doe",
      contactNo: "555-1234",
      emailId: "jane@acme.test",
      address: "123 Main St",
      problem: "Printer not turning on",
      accountManager: "Alice",
      assignedBy: "Bob",
      callType: "Call",
      assigneeUserIds: [adminId],
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body.companyName).toBe("Acme Corp");

    const detailRes = await agent.get(`/api/tickets/${createRes.body.srNo}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.ticket.problem).toBe("Printer not turning on");

    const logoutRes = await agent.post("/api/auth/logout");
    expect(logoutRes.status).toBe(200);

    const meAfterLogout = await agent.get("/api/auth/me");
    expect(meAfterLogout.status).toBe(401);

    const ticketsAfterLogout = await agent.get("/api/tickets");
    expect(ticketsAfterLogout.status).toBe(401);
  });

  it("rejects an invalid password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: TEST_ADMIN.username, password: "wrong-password" });
    expect(res.status).toBe(401);
  });
});
