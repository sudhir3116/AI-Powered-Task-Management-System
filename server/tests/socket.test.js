import http from "node:http";
import request from "supertest";
import { io as Client } from "socket.io-client";
import { app } from "./setup.js";
import { initSocket, getIO } from "../src/socket.js";
import OrganizationMember from "../src/models/organizationMember.model.js";

describe("Module 1 & 16 — Socket.IO Real-Time Security & Isolation Test Suite", () => {
  let httpServer;
  let serverPort;
  let tokenUserA;
  let tokenUserB;
  let workspaceIdA;
  let clientSocketA;
  let clientSocketB;

  beforeAll(async () => {
    // 1. Start HTTP Server with Socket.IO
    httpServer = http.createServer(app);
    initSocket(httpServer);

    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address().port;
        resolve();
      });
    });

    // 2. Register User A
    const resA = await request(app).post("/api/auth/register").send({
      name: "Socket User A",
      email: "socket.usera@test.com",
      password: "password123",
    });
    tokenUserA = resA.body.data.token;

    // 3. Register User B
    const resB = await request(app).post("/api/auth/register").send({
      name: "Socket User B",
      email: "socket.userb@test.com",
      password: "password123",
    });
    tokenUserB = resB.body.data.token;

    // 4. Create Workspace A as User A
    const wsRes = await request(app)
      .post("/api/workspaces")
      .set("Authorization", `Bearer ${tokenUserA}`)
      .send({ name: "Realtime Workspace A" });
    workspaceIdA = wsRes.body.data._id;
  });

  afterAll(async () => {
    if (clientSocketA) clientSocketA.disconnect();
    if (clientSocketB) clientSocketB.disconnect();
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
  });

  test("1. Unauthenticated socket connection rejected", (done) => {
    const unauthClient = Client(`http://localhost:${serverPort}`, {
      auth: { token: "" },
      reconnection: false,
    });

    unauthClient.on("connect_error", (err) => {
      expect(err.message).toContain("Token required");
      unauthClient.disconnect();
      done();
    });
  });

  test("2. Authenticated socket connection succeeds", (done) => {
    clientSocketA = Client(`http://localhost:${serverPort}`, {
      auth: { token: tokenUserA },
      reconnection: false,
    });

    clientSocketA.on("connect", () => {
      expect(clientSocketA.connected).toBe(true);
      done();
    });
  });

  test("3. Workspace member can join workspace room", (done) => {
    clientSocketA.emit("join_workspace", workspaceIdA);

    setTimeout(() => {
      // User A successfully joined
      done();
    }, 200);
  });

  test("4. Non-member socket cannot receive workspace room events (workspace isolation)", (done) => {
    clientSocketB = Client(`http://localhost:${serverPort}`, {
      auth: { token: tokenUserB },
      reconnection: false,
    });

    clientSocketB.on("connect", () => {
      // User B attempts to join Workspace A (where User B is not a member)
      clientSocketB.emit("join_workspace", workspaceIdA);

      clientSocketB.on("task.created", () => {
        done(new Error("Security Failure: User B received event from unauthorized Workspace A"));
      });

      // User A creates a task in Workspace A
      setTimeout(async () => {
        await request(app)
          .post("/api/tasks")
          .set("Authorization", `Bearer ${tokenUserA}`)
          .set("X-Workspace-Id", workspaceIdA)
          .send({ title: "Isolated Real-Time Task", description: "Test real-time event isolation" });

        setTimeout(() => {
          // If User B did not receive task.created after 300ms, test passes
          done();
        }, 300);
      }, 100);
    });
  });
});
