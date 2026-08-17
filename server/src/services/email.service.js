import { Resend } from "resend";
import logger from "../utils/logger.js";

/**
 * Sends a welcome email to a newly registered user asynchronously.
 * Non-blocking: Errors are caught internally and logged without throwing.
 *
 * @param {Object} params
 * @param {string} params.email - Recipient email address
 * @param {string} [params.name] - Recipient user name
 */
export const sendWelcomeEmail = async ({ email, name = "User" }) => {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.EMAIL_FROM || "TaskFlow AI <onboarding@resend.dev>";
    const appUrl = process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || "http://localhost:5173";

    if (!email) {
      logger.warn("[Email Service] No recipient email provided for welcome email.");
      return { success: false, reason: "Missing recipient email" };
    }

    if (!apiKey) {
      logger.info(`[Email Service] RESEND_API_KEY not configured. Skipping welcome email to ${email}`);
      return { success: false, skipped: true, reason: "RESEND_API_KEY missing" };
    }

    if (process.env.NODE_ENV === "test" && !apiKey.startsWith("re_test_key")) {
      logger.info(`[Email Service Test Mode] Skipping network call to ${email}`);
      return { success: true, data: { id: "test-mock-id" } };
    }

    const resend = new Resend(apiKey);
    const subject = "Welcome to TaskFlow AI!";

    const textContent = [
      `Hello ${name},`,
      ``,
      `Welcome to TaskFlow AI! Your account has been successfully created.`,
      ``,
      `TaskFlow AI helps you organize, prioritize, and manage your tasks intelligently using state-of-the-art AI.`,
      ``,
      `You can access your workspace anytime at: ${appUrl}`,
      ``,
      `Best regards,`,
      `The TaskFlow AI Team`,
    ].join("\n");

    const htmlContent = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="margin-bottom: 20px;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800;">⚡ TaskFlow AI</h2>
        </div>
        <p style="font-size: 16px; color: #0f172a; margin-bottom: 16px;">Hello ${name},</p>
        <p style="font-size: 15px; color: #334155; margin-bottom: 20px;">Welcome to TaskFlow AI! Your account has been successfully created.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #475569;">
            TaskFlow AI is your AI-powered workspace to prioritize, break down, and execute your tasks faster.
          </p>
          <a href="${appUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 8px;">
            Open TaskFlow AI
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">This is an automated welcome email from TaskFlow AI.</p>
      </div>
    `;

    const response = await resend.emails.send({
      from: fromAddress,
      to: [email],
      subject,
      text: textContent,
      html: htmlContent,
    });

    if (response?.error) {
      logger.error(`[Email Service] Resend API error sending welcome email to ${email}: ${response.error.message}`, {
        error: response.error,
      });
      return { success: false, error: response.error };
    }

    logger.info(`[Email Service] Welcome email sent successfully to ${email}`);
    return { success: true, data: response?.data };
  } catch (error) {
    logger.error(`[Email Service] Failed to send welcome email to ${email}: ${error.message}`, {
      error: error.message,
    });
    return { success: false, error: error.message };
  }
};

/**
 * Sends a login notification email to the user asynchronously.
 * Non-blocking: Errors are caught internally and logged without throwing.
 *
 * @param {Object} params
 * @param {string} params.email - Recipient email address
 * @param {string} [params.name] - Recipient user name
 * @param {"Email & Password" | "Google OAuth"} [params.loginMethod] - Login method used
 * @param {Date|string} [params.loginTime] - Timestamp of login
 */
export const sendLoginNotificationEmail = async ({
  email,
  name = "User",
  loginMethod = "Email & Password",
  loginTime = new Date(),
}) => {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.EMAIL_FROM || "TaskFlow AI <onboarding@resend.dev>";

    if (!email) {
      logger.warn("[Email Service] No recipient email provided for login notification.");
      logger.info(`Email provider response: failure (${email})`);
      return { success: false, reason: "Missing recipient email" };
    }

    if (!apiKey) {
      logger.info(`[Email Service] RESEND_API_KEY not configured. Skipping email to ${email}`);
      logger.info(`Email provider response: failure (${email})`);
      return { success: false, skipped: true, reason: "RESEND_API_KEY missing" };
    }

    const resend = new Resend(apiKey);
    const dateFormatted = new Date(loginTime).toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "medium",
      timeZone: "UTC",
    }) + " UTC";

    const subject = "New Login to TaskFlow AI";

    const textContent = [
      `Hello ${name},`,
      ``,
      `A new login to your TaskFlow AI account was detected.`,
      ``,
      `Login method: ${loginMethod}`,
      `Date and time: ${dateFormatted}`,
      ``,
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
        <p style="font-size: 15px; color: #334155; margin-bottom: 20px;">A new login to your TaskFlow AI account was detected.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Login method:</strong> ${loginMethod}</p>
          <p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Date and time:</strong> ${dateFormatted}</p>
        </div>

        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #991b1b;">
            If you did not perform this login, please secure your account immediately.
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

    if (response?.error) {
      logger.error(`[Email Service] Resend API error sending email to ${email}: ${response.error.message}`, {
        error: response.error,
      });
      logger.info(`Email provider response: failure (${email})`);
      return { success: false, error: response.error };
    }

    logger.info(`[Email Service] Login notification email sent successfully to ${email}`);
    logger.info(`Email provider response: success (${email})`);
    return { success: true, data: response?.data };
  } catch (error) {
    logger.error(`[Email Service] Failed to send login notification email to ${email}: ${error.message}`, {
      error: error.message,
    });
    logger.info(`Email provider response: failure (${email})`);
    return { success: false, error: error.message };
  }
};

/**
 * Sends a workspace invitation email to a recipient.
 * In Resend sandbox/free mode (no verified domain), the API rejects emails
 * to addresses other than the account owner. In that case this function falls
 * back to logging the invitation URL to the server console so the developer
 * can copy and test the full acceptance flow without a verified domain.
 *
 * @param {Object} params
 * @param {string} params.email - Recipient email
 * @param {string} params.inviterName - Name of inviter
 * @param {string} params.workspaceName - Workspace name
 * @param {string} params.role - Invited role
 * @param {string} params.invitationUrl - Acceptance URL with raw token
 * @param {Date|string} params.expiresAt - Expiration timestamp
 */
export const sendWorkspaceInvitationEmail = async ({
  email,
  inviterName = "A team member",
  workspaceName = "a workspace",
  role = "MEMBER",
  invitationUrl,
  expiresAt,
}) => {
  // ── Helper: log invitation URL to console for fallback ─────────────
  const logDevFallback = () => {
    console.log("\nInvitation created successfully\n");
    console.log("Recipient:");
    console.log(email);
    console.log("\nAccept URL:");
    console.log(invitationUrl);
    console.log("\n");
  };

  try {
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.EMAIL_FROM || "TaskFlow AI <onboarding@resend.dev>";

    if (!email) {
      logger.warn("[Email Service] No recipient email provided for workspace invitation.");
      return { success: false, reason: "Missing recipient email" };
    }

    // No API key configured → dev fallback
    if (!apiKey) {
      logDevFallback();
      logger.info(`[Email Service] RESEND_API_KEY not configured. Invitation URL logged to console for ${email}.`);
      return { success: true, devMode: true, reason: "RESEND_API_KEY missing — URL logged to server console" };
    }

    // Test environment → skip network call
    if (process.env.NODE_ENV === "test" && !apiKey.startsWith("re_test_key")) {
      logger.info(`[Email Service Test Mode] Skipping invitation email to ${email}`);
      return { success: true, messageId: "test-mock-id", data: { id: "test-mock-id" } };
    }

    const resend = new Resend(apiKey);
    const subject = `You've been invited to join ${workspaceName} on TaskFlow AI`;
    const expiryFormatted = new Date(expiresAt).toLocaleDateString("en-US", { dateStyle: "full" });

    const textContent = [
      `Hello,`,
      ``,
      `${inviterName} has invited you to join "${workspaceName}" on TaskFlow AI as a ${role}.`,
      ``,
      `Click the link below to accept your invitation:`,
      `${invitationUrl}`,
      ``,
      `This invitation expires on ${expiryFormatted}.`,
      ``,
      `Best regards,`,
      `The TaskFlow AI Team`,
    ].join("\n");

    const htmlContent = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 28px 32px;">
          <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.3px;">⚡ TaskFlow AI</h2>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Workspace Invitation</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px;">
          <p style="font-size: 16px; color: #0f172a; margin: 0 0 16px; font-weight: 600;">You've been invited! 🎉</p>
          <p style="font-size: 14px; color: #475569; margin: 0 0 24px; line-height: 1.6;">
            <strong style="color: #0f172a;">${inviterName}</strong> has invited you to join the workspace
            <strong style="color: #4f46e5;">"${workspaceName}"</strong> as a <strong style="color: #0f172a;">${role}</strong>.
          </p>

          <!-- CTA -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${invitationUrl}"
               style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; letter-spacing: -0.2px; box-shadow: 0 4px 12px rgba(79,70,229,0.35);">
              Accept Invitation →
            </a>
          </div>

          <!-- Info row -->
          <div style="background: #f8fafc; border: 1px solid #e8ecf0; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
            <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">
              <strong>Workspace:</strong> ${workspaceName}
            </p>
            <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">
              <strong>Your role:</strong> ${role}
            </p>
            <p style="margin: 0; font-size: 13px; color: #64748b;">
              <strong>Expires:</strong> ${expiryFormatted}
            </p>
          </div>

          <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
            If the button doesn't work, copy and paste this link:<br/>
            <a href="${invitationUrl}" style="color: #4f46e5; word-break: break-all;">${invitationUrl}</a>
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; border-top: 1px solid #e8ecf0; padding: 16px 32px; text-align: center;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">
            This invitation was sent by TaskFlow AI on behalf of ${inviterName}.
            If you weren't expecting this, you can safely ignore it.
          </p>
        </div>
      </div>
    `;

    const response = await resend.emails.send({
      from: fromAddress,
      to: [email],
      subject,
      text: textContent,
      html: htmlContent,
    });

    // ── Resend returned a structured error ──────
    if (response?.error) {
      const errMsg = response.error.message || JSON.stringify(response.error);
      logDevFallback();
      logger.warn(`[Email Service] Resend API error sending email to ${email}: ${errMsg}`);
      return {
        success: true,
        devMode: true,
        reason: errMsg,
      };
    }

    const messageId = response?.data?.id || "unknown";
    logger.info(`[INVITATION_EMAIL_SENT] Invitation sent to ${email} (Message ID: ${messageId})`);
    return { success: true, messageId, data: response?.data };

  } catch (error) {
    logDevFallback();
    logger.error(`[INVITATION_EMAIL_FAILED] Exception sending invitation email to ${email}: ${error.message}`);
    return {
      success: true,
      devMode: true,
      reason: error.message,
    };
  }
};

/**
 * Sends a password reset email to a user asynchronously.
 * Non-blocking: Errors are caught internally and logged without throwing.
 */
export const sendPasswordResetEmail = async ({ email, resetUrl }) => {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.EMAIL_FROM || "TaskFlow AI <onboarding@resend.dev>";

    if (!email) {
      logger.warn("[Email Service] No recipient email provided for password reset.");
      return { success: false, reason: "Missing recipient email" };
    }

    if (!apiKey) {
      logger.info(`[Email Service] RESEND_API_KEY not configured. Skipping password reset email to ${email}`);
      return { success: false, skipped: true, reason: "RESEND_API_KEY missing" };
    }

    if (process.env.NODE_ENV === "test" && !apiKey.startsWith("re_test_key")) {
      logger.info(`[Email Service Test Mode] Skipping password reset email to ${email}`);
      return { success: true, data: { id: "test-mock-id" } };
    }

    const resend = new Resend(apiKey);
    const subject = "Reset your TaskFlow AI password";

    const textContent = [
      `Hello,`,
      ``,
      `We received a request to reset your password for TaskFlow AI.`,
      ``,
      `Click the link below to set a new password:`,
      `${resetUrl}`,
      ``,
      `This reset link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.`,
      ``,
      `— TaskFlow AI Security Team`,
    ].join("\n");

    const htmlContent = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="margin-bottom: 20px;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800;">⚡ TaskFlow AI</h2>
        </div>
        <p style="font-size: 16px; color: #0f172a; margin-bottom: 16px;">Hello,</p>
        <p style="font-size: 15px; color: #334155; margin-bottom: 20px;">
          We received a request to reset your TaskFlow AI account password.
        </p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 15px;">
            Reset Password
          </a>
        </div>

        <p style="font-size: 13px; color: #64748b; margin-bottom: 20px;">
          Link expires in 1 hour. If you didn't request this, ignore this email.
        </p>
      </div>
    `;

    const response = await resend.emails.send({
      from: fromAddress,
      to: [email],
      subject,
      text: textContent,
      html: htmlContent,
    });

    if (response?.error) {
      logger.error(`[PASSWORD_RESET_EMAIL_FAILED] Resend API error: ${response.error.message}`);
      return { success: false, error: response.error.message || response.error };
    }

    return { success: true, data: response?.data };
  } catch (error) {
    logger.error(`[PASSWORD_RESET_EMAIL_FAILED] Exception: ${error.message}`);
    return { success: false, error: error.message };
  }
};
