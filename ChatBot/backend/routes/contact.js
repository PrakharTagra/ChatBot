import express from "express";
import nodemailer from "nodemailer";
import Lead from "../models/Lead.js";

const router = express.Router();

/**
 * Send an email notification to the site owner when a new lead is captured.
 * Requires SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and NOTIFY_EMAIL in .env
 * Falls back gracefully if email env vars are not configured.
 */
async function sendLeadEmail({ name, email, phone, message, websiteId }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !NOTIFY_EMAIL) {
    console.log("📧 Email notification skipped — SMTP env vars not configured.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || "587"),
    secure: SMTP_PORT === "465",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"ChatAgent" <${SMTP_USER}>`,
    to: NOTIFY_EMAIL,
    subject: `New lead from ${websiteId}: ${name}`,
    html: `
      <h2 style="font-family:sans-serif">New lead captured 📥</h2>
      <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
        <tr><td style="padding:6px 16px 6px 0;color:#666">Website</td><td><strong>${websiteId}</strong></td></tr>
        <tr><td style="padding:6px 16px 6px 0;color:#666">Name</td><td>${name}</td></tr>
        <tr><td style="padding:6px 16px 6px 0;color:#666">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
        <tr><td style="padding:6px 16px 6px 0;color:#666">Phone</td><td>${phone || "—"}</td></tr>
        <tr><td style="padding:6px 16px 6px 0;color:#666;vertical-align:top">Message</td><td>${message}</td></tr>
      </table>
    `,
    text: `New lead from ${websiteId}\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "—"}\nMessage: ${message}`,
  });

  console.log(`📧 Lead notification email sent to ${NOTIFY_EMAIL}`);
}

// POST /api/contact
router.post("/", async (req, res) => {
  const { name, email, phone, message, websiteId } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "name, email, and message are required." });
  }

  try {
    const lead = await Lead.create({
      websiteId: websiteId || "unknown",
      name,
      email,
      phone: phone || "",
      message,
    });

    // Fire email notification — non-blocking, won't fail the API response
    sendLeadEmail({ name, email, phone, message, websiteId: websiteId || "unknown" })
      .catch((err) => console.error("📧 Email send failed (non-fatal):", err.message));

    res.json({ success: true, leadId: lead._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
