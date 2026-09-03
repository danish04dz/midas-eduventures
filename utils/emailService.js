const nodemailer = require('nodemailer');

let cachedTransporter = null;

async function getTransporter() {
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587;

  if (host && user && pass) {
    if (host.includes('gmail.com')) {
      cachedTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: user.trim(), pass: pass.trim() }
      });
    } else {
      cachedTransporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user: user.trim(), pass: pass.trim() }
      });
    }
    console.log(`[Nodemailer] Configured SMTP for ${user}`);
  } else {
    try {
      const testAccount = await nodemailer.createTestAccount();
      cachedTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log(`[Nodemailer] Using Ethereal Test Account: ${testAccount.user}`);
    } catch (err) {
      console.error('[Nodemailer] Failed to create test account:', err);
    }
  }

  return cachedTransporter;
}

/**
 * Generates high-deliverability HTML email body for Midas Eduventures.
 */
function buildProfessionalHtmlEmail({ title, period, scope, logCount, detailsText }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px; color: #ffffff; text-align: left; border-bottom: 4px solid #f59e0b; }
      .header-title { font-size: 20px; font-weight: 800; margin: 0; letter-spacing: 0.5px; color: #ffffff; }
      .header-sub { font-size: 12px; color: #94a3b8; margin-top: 4px; }
      .content { padding: 28px 24px; }
      .meta-box { background-color: #f1f5f9; border-radius: 12px; padding: 18px; margin: 20px 0; border-left: 4px solid #2563eb; }
      .meta-row { font-size: 13px; margin-bottom: 8px; color: #334155; }
      .meta-row strong { color: #0f172a; font-weight: 700; }
      .badge { display: inline-block; background-color: #dcfce7; color: #166534; font-size: 11px; font-weight: 800; padding: 3px 10px; rounded: 12px; border: 1px solid #86efac; border-radius: 99px; }
      .footer { background-color: #f8fafc; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="header-title">MIDAS CONCEPT SCHOOL, SAUSAR</div>
        <div class="header-sub">Official Academic Reporting & Master Schedule Portal</div>
      </div>
      <div class="content">
        <h2 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 0;">${title || 'Academic Weekly Report Notification'}</h2>
        <p style="font-size: 13px; line-height: 1.6; color: #475569;">
          Respected Principal & Academic Directorate,<br><br>
          Please find attached the official PDF report for Midas Concept School, Sausar. The report contains verified curriculum logs, session topics, present student counts, and house schedule data.
        </p>

        <div class="meta-box">
          <div class="meta-row"><strong>📌 Document Scope:</strong> ${scope || 'Weekly Curriculum Tracking Report'}</div>
          <div class="meta-row"><strong>📅 Academic Period:</strong> ${period || 'August 2026'}</div>
          ${logCount ? `<div class="meta-row"><strong>📊 Total Log Entries:</strong> ${logCount} Sessions</div>` : ''}
          <div class="meta-row"><strong>STATUS:</strong> <span class="badge">VERIFIED & ATTACHED</span></div>
        </div>

        <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin-top: 16px;">
          The attached PDF document contains complete session details including Gryffindor, Slytherin, Hufflepuff, and Ravenclaw House rotations, faculty attendance, and principal remarks.
        </p>
      </div>
      <div class="footer">
        © 2026 Midas Eduventures • Midas Concept School, Sausar<br>
        This is an official automated academic notification. Replies go directly to the Principal Directorate.
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Sends Weekly Report PDF to Principal Email with High Inbox Deliverability.
 */
async function sendWeeklyReportEmail({ recipientEmail, subject, text, pdfBuffer, filename, logCount, scopeTitle, periodStr }) {
  const transporter = await getTransporter();
  const senderEmail = process.env.EMAIL_USER || process.env.SMTP_USER || 'printyatri@gmail.com';
  const targetRecipient = recipientEmail || process.env.PRINCIPAL_EMAIL || 'mohd.692003@gmail.com';

  const professionalSubject = subject || `Official Academic Weekly Curriculum Report - Midas Concept School, Sausar (${periodStr || 'August 2026'})`;

  const htmlBody = buildProfessionalHtmlEmail({
    title: professionalSubject,
    period: periodStr || 'August 2026 (Week 1)',
    scope: scopeTitle || 'Evening House Activity & Extra-Curricular Weekly Report',
    logCount: logCount || null,
    detailsText: text
  });

  const mailOptions = {
    from: `"Midas Concept School Academic Desk" <${senderEmail}>`,
    to: targetRecipient,
    replyTo: targetRecipient,
    subject: professionalSubject,
    text: text || 'Please find attached the official weekly curriculum tracking report for Midas Concept School, Sausar.',
    html: htmlBody,
    headers: {
      'X-Mailer': 'MidasEduventuresAcademicSystem/1.0',
      'X-Priority': '3',
      'Importance': 'normal'
    },
    attachments: [
      {
        filename: filename || 'Midas_Weekly_Curriculum_Report.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);

  console.log(`[Nodemailer] Email Sent Successfully to ${targetRecipient}! MessageID: ${info.messageId}`);
  
  return {
    success: true,
    messageId: info.messageId,
    previewUrl: previewUrl || null,
    recipient: targetRecipient
  };
}

module.exports = { sendWeeklyReportEmail };
