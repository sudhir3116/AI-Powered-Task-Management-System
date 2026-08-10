import { jest } from "@jest/globals";

const mockSend = jest.fn().mockResolvedValue({
  data: { id: "msg_123456" },
  error: null,
});

jest.unstable_mockModule("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

const { sendLoginNotificationEmail } = await import("../src/services/email.service.js");

describe("Email Service — Login Notifications", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    mockSend.mockClear();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("skips sending email gracefully when EMAIL_API_KEY is not configured", async () => {
    delete process.env.EMAIL_API_KEY;

    const result = await sendLoginNotificationEmail({
      email: "user@example.com",
      name: "Test User",
      loginMethod: "Email/Password",
      loginTime: new Date(),
    });

    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.reason).toContain("EMAIL_API_KEY missing");
  });

  it("handles missing email parameter gracefully", async () => {
    const result = await sendLoginNotificationEmail({
      email: "",
      name: "Test User",
      loginMethod: "Email/Password",
    });

    expect(result.success).toBe(false);
    expect(result.reason).toContain("Missing recipient email");
  });

  it("sends login notification email when EMAIL_API_KEY is provided", async () => {
    process.env.EMAIL_API_KEY = "re_test_key_12345";
    process.env.EMAIL_FROM = "TaskFlow AI <onboarding@resend.dev>";

    const result = await sendLoginNotificationEmail({
      email: "user@example.com",
      name: "Alex Smith",
      loginMethod: "Email/Password",
      loginTime: "2026-08-10T12:00:00Z",
    });

    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "TaskFlow AI <onboarding@resend.dev>",
        to: ["user@example.com"],
        subject: "New Login to TaskFlow AI",
        text: expect.stringContaining("A new login to your account was detected."),
        html: expect.stringContaining("If you did not perform this login, please secure your account immediately."),
      })
    );
  });

  it("sends Google OAuth login notification email correctly", async () => {
    process.env.EMAIL_API_KEY = "re_test_key_12345";

    const result = await sendLoginNotificationEmail({
      email: "googleuser@example.com",
      name: "Google User",
      loginMethod: "Google OAuth",
      loginTime: new Date(),
    });

    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["googleuser@example.com"],
        subject: "New Login to TaskFlow AI",
        text: expect.stringContaining("Login Method: Google OAuth"),
      })
    );
  });

  it("logs error and handles failure gracefully when Resend API throws error", async () => {
    process.env.EMAIL_API_KEY = "re_test_key_12345";
    mockSend.mockRejectedValueOnce(new Error("Resend rate limit exceeded"));

    const result = await sendLoginNotificationEmail({
      email: "erroruser@example.com",
      name: "Error User",
      loginMethod: "Email/Password",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Resend rate limit exceeded");
  });
});
