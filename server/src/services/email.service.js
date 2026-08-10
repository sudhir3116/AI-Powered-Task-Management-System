import { Resend } from "resend";
import logger from "../utils/logger.js";

/**
 * Sends a login notification email to the user asynchronously.
 * Non-blocking: Errors are caught internally and logged without throwing.
 *
 * @param {Object} params
 * @param {string} params.email - Recipient email address
 * @param {string} [params.name] - Recipient user name
 * @param {"Email/Password" | "Google OAuth"} [params.loginMethod] - Login method used
 * @param {Date|string} [params.loginTime] - Timestamp of login
 */
export const sendLoginNotificationEmail = async ({
  email,
  name = "User",
  loginMethod = "Email/Password",
  loginTime = new Date(),
}) => {
  try {
    const apiKey = process.env.EMAIL_API_KEY;
    const fromAddress = process.env.EMAIL_FROM || "TaskFlow AI <onboarding@resend.dev>";

    if (!email) {
      logger.warn("[Email Service] No recipient email provided for login notification.");
      return { success: false, reason: "Missing recipient email" };
    }

    if (!apiKey) {
      logger.info(`[Email Service] EMAIL_API_KEY not configured. Skipping login notification email to ${email}`);
      return { success: false, skipped: true, reason: "EMAIL_API_KEY missing" };
    }

    const resend = new Resend(apiKey);
    const dateFormatted = new Date(loginTime).toUTCString();

    const subject = "New Login to TaskFlow AI";

    const textContent = [
      `TaskFlow AI - Login Notification`,
      ``,
      `Hello ${name},`,
      ``,
      `A new login to your account was detected.`,
      ``,
      `Details:`,
      `- Service: TaskFlow AI`,
      `- Login Method: ${loginMethod}`,
      `- Date and Time: ${dateFormatted}`,
      ``,
      `Security Notice:`,
      `If you did not perform this login, please secure your account immediately.`,
      ``,
      `— TaskFlow AI Security Team`,
    ].join("\n");

    const htmlContent = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="margin-bottom: 20px;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800;">⚡ TaskFlow AI</h2>
        </div>
        <p style="font-size: 16px; color: #0f172a; margin-bottom: 16px;">Hello ${name},</p>
        <p style="font-size: 15px; color: #334155; margin-bottom: 20px;">A new login to your account was detected.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>App:</strong> TaskFlow AI</p>
          <p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Login Method:</strong> ${loginMethod}</p>
          <p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Date and Time:</strong> ${dateFormatted}</p>
        </div>

        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #991b1b;">
            <strong>Security Notice:</strong> If you did not perform this login, please secure your account immediately.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">This is an automated notification from TaskFlow AI.</p>
      </div>
    `;

    const response = await resend.emails.send({
      from: fromAddress,
      to: [email],
      subject,
      text: textContent,
      html: htmlContent,
    });

    if (response.error) {
      logger.error(`[Email Service] Resend API error sending email to ${email}: ${response.error.message}`, {
        error: response.error,
      });
      return { success: false, error: response.error };
    }

    logger.info(`[Email Service] Login notification email sent successfully to ${email}`);
    return { success: true, data: response.data };
  } catch (error) {
    logger.error(`[Email Service] Failed to send login notification email to ${email}: ${error.message}`, {
      error: error.message,
    });
    return { success: false, error: error.message };
  }
};
