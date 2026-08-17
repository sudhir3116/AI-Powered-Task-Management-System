import request from "supertest";
import { app } from "./setup.js";
import Notification from "../src/models/notification.model.js";

describe("Module 5 — Notification Center Security Test Suite", () => {
  let tokenUserA;
  let tokenUserB;
  let userIdA;
  let userIdB;
  let notificationIdA;

  beforeAll(async () => {
    const resA = await request(app).post("/api/auth/register").send({
      name: "Notif User A",
      email: "notif.userA@test.com",
      password: "password123",
    });
    tokenUserA = resA.body.data.token;
    userIdA = resA.body.data.user.id;

    const resB = await request(app).post("/api/auth/register").send({
      name: "Notif User B",
      email: "notif.userB@test.com",
      password: "password123",
    });
    tokenUserB = resB.body.data.token;
    userIdB = resB.body.data.user.id;

    // Create Notification for User A
    const notif = await Notification.create({
      user: userIdA,
      type: "TASK_ASSIGNED",
      title: "New Task Assigned",
      message: "You have been assigned a task",
    });
    notificationIdA = notif._id.toString();
  });

  test("1. Unauthenticated notification fetch rejected -> 401 Unauthorized", async () => {
    const res = await request(app).get("/api/notifications");
    expect(res.statusCode).toEqual(401);
  });

  test("2. User A retrieves User A notifications only -> 200 OK", async () => {
    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${tokenUserA}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toEqual(1);
    expect(res.body.unreadCount).toEqual(1);
    expect(res.body.data[0].title).toEqual("New Task Assigned");
  });

  test("3. User B cannot see User A notifications", async () => {
    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${tokenUserB}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toEqual(0);
    expect(res.body.unreadCount).toEqual(0);
  });

  test("4. User B cannot mark User A notification as read -> 404 Not Found", async () => {
    const res = await request(app)
      .patch(`/api/notifications/${notificationIdA}/read`)
      .set("Authorization", `Bearer ${tokenUserB}`);

    expect(res.statusCode).toEqual(404);
  });

  test("5. User A marks notification as read -> 200 OK", async () => {
    const res = await request(app)
      .patch(`/api/notifications/${notificationIdA}/read`)
      .set("Authorization", `Bearer ${tokenUserA}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.read).toBe(true);
  });

  test("6. Mark all as read works", async () => {
    const res = await request(app)
      .patch("/api/notifications/read-all")
      .set("Authorization", `Bearer ${tokenUserA}`);

    expect(res.statusCode).toEqual(200);
  });
});
