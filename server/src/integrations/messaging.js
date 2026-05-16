const https = require('https');
const nodemailer = require('nodemailer');

// ── SMS via Twilio ─────────────────────────────────────────────────────────────
async function sendSMS(to, body) {
  const sid  = process.env.TWILIO_SID;
  const token= process.env.TWILIO_TOKEN;
  const from = process.env.TWILIO_FROM;

  if (!sid || !token || !from) {
    throw new Error('SMS not configured. Add TWILIO_SID, TWILIO_TOKEN, and TWILIO_FROM to .env');
  }

  const twilio = require('twilio')(sid, token);
  const msg = await twilio.messages.create({ to, from, body });
  return { providerRef: msg.sid };
}

// ── Email via SendGrid HTTP API (no SMTP ports needed) ─────────────────────────
async function sendEmailSendGrid(to, subject, html, text) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from   = process.env.SMTP_FROM || process.env.SENDGRID_FROM || 'noreply@celltechpos.com';

  const payload = JSON.stringify({
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from, name: process.env.STORE_NAME || 'CellTechPOS' },
    subject,
    content: [
      { type: 'text/plain', value: text || subject },
      { type: 'text/html',  value: html },
    ],
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.sendgrid.com',
      path: '/v3/mail/send',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ providerRef: res.headers['x-message-id'] || 'sendgrid-ok' });
        } else {
          reject(new Error(`SendGrid ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── Email via SMTP fallback (nodemailer) ───────────────────────────────────────
async function sendEmailSMTP(to, subject, html, text) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const from = process.env.SMTP_FROM || user;

  const transporter = nodemailer.createTransport({
    host, port, secure: port === 465,
    auth: { user, pass },
  });

  const info = await transporter.sendMail({
    from: `"${process.env.STORE_NAME || 'CellTechPOS'}" <${from}>`,
    to, subject, html, text,
  });

  return { providerRef: info.messageId };
}

// ── Unified sendEmail: prefers SendGrid, falls back to SMTP ───────────────────
async function sendEmail(to, subject, html, text) {
  if (process.env.SENDGRID_API_KEY) {
    return sendEmailSendGrid(to, subject, html, text);
  }
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error('Email not configured. Set SENDGRID_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS in .env');
  }
  return sendEmailSMTP(to, subject, html, text);
}

// ── Template engine ────────────────────────────────────────────────────────────
function applyTemplate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}

// ── Email HTML wrapper ─────────────────────────────────────────────────────────
function emailHtml(body, storeName, storePhone) {
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#1f2937">
<div style="border-bottom:2px solid #166534;padding-bottom:12px;margin-bottom:20px">
  <h2 style="margin:0;color:#166534">${storeName || 'CellTechPOS'}</h2>
  ${storePhone ? `<p style="margin:4px 0;font-size:13px;color:#6b7280">${storePhone}</p>` : ''}
</div>
<div style="font-size:15px;line-height:1.6">${body.replace(/\n/g, '<br>')}</div>
<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af">
  This message was sent from ${storeName || 'CellTechPOS'}.
</div></body></html>`;
}

module.exports = { sendSMS, sendEmail, applyTemplate, emailHtml };
