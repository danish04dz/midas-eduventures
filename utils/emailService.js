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

const { getRealTimeWeekInfo } = require('./dateHelper');

/**
 * Generates clean, professional HTML body for email dispatch.
 */
function buildProfessionalHtmlEmail({ title, period, scope, logCount, detailsText }) {
  const realTimeInfo = getRealTimeWeekInfo();
  const currentPeriodStr = period || `${realTimeInfo.monthName} (${realTimeInfo.weekTitle})`;
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 24px; text-align: center; }
      .header h1 { font-size: 20px; font-weight: 900; margin: 0; letter-spacing: 0.5px; }
      .header p { font-size: 12px; color: #f59e0b; font-weight: 700; margin: 4px 0 0 0; text-transform: uppercase; }
      .content { padding: 28px 24px; }
      .meta-box { background: #f8fafc; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 13px; }
      .meta-row { margin-bottom: 8px; }
      .meta-row:last-child { margin-bottom: 0; }
      .badge { display: inline-block; background: #dcfce7; color: #166534; font-weight: 800; font-size: 11px; padding: 2px 8px; rounded: 6px; }
      .footer { background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>MIDAS CONCEPT SCHOOL</h1>
        <p>Official Academic Curriculum & Activity Report</p>
      </div>
      <div class="content">
        <h2 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 0;">${title || 'Academic Weekly Report Notification'}</h2>
        <p style="font-size: 13px; line-height: 1.6; color: #475569;">
          Respected Principal & Academic Directorate,<br><br>
          Please find attached the official PDF report for Midas Concept School, Sausar. The report contains verified curriculum logs, session topics, present student counts, and house schedule data.
        </p>

        <div class="meta-box">
          <div class="meta-row"><strong>📌 Document Scope:</strong> ${scope || 'Weekly Curriculum Tracking Report'}</div>
          <div class="meta-row"><strong>📅 Academic Period:</strong> ${currentPeriodStr}</div>
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

  const realTimeInfo = getRealTimeWeekInfo();
  const currentPeriodStr = periodStr || `${realTimeInfo.monthName} (${realTimeInfo.weekTitle})`;
  const professionalSubject = subject || `Official Academic Weekly Curriculum Report - Midas Concept School, Sausar (${currentPeriodStr})`;

  const htmlBody = buildProfessionalHtmlEmail({
    title: professionalSubject,
    period: currentPeriodStr,
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

/**
 * Sends a welcome email to newly registered Morning Faculty with their secret pin and credentials.
 */
async function sendFacultyWelcomeEmail({ facultyName, email, password, secretCode }) {
  const transporter = await getTransporter();
  const senderEmail = process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@midas-eduventures.com';
  const targetRecipient = email;
  const professionalSubject = `Welcome to Midas Concept School - Your Faculty Login Credentials`;

  const htmlBody = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 24px; text-align: center; }
      .header img { max-width: 120px; margin-bottom: 12px; }
      .header h1 { font-size: 20px; font-weight: 900; margin: 0; letter-spacing: 0.5px; }
      .content { padding: 28px 24px; }
      .meta-box { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 14px; line-height: 1.8; }
      .code-highlight { font-size: 24px; font-weight: bold; color: #1d4ed8; letter-spacing: 4px; display: block; margin-top: 10px; }
      .footer { background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>MIDAS CONCEPT SCHOOL</h1>
        <p style="font-size: 12px; color: #60a5fa; font-weight: 700; margin: 4px 0 0 0; text-transform: uppercase;">Faculty Access Credentials</p>
      </div>
      <div class="content">
        <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 0;">Welcome, ${facultyName}!</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          You have been registered as a Morning Faculty member at Midas Concept School. Below are your official login credentials and your unique <strong>Classroom Smart Panel Secret Code</strong> used for Punch-In / Punch-Out.
        </p>

        <div class="meta-box">
          <div><strong>Email Login:</strong> ${email}</div>
          <div><strong>Password:</strong> ${password}</div>
          <div style="margin-top: 15px;">
            <strong>Classroom Panel Secret Code:</strong>
            <span class="code-highlight">${secretCode}</span>
          </div>
        </div>

        <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin-top: 16px;">
          Please do not share this secret code with anyone. You will use it on the classroom smart panels to record your lecture attendance.
        </p>
      </div>
      <div class="footer">
        © 2026 Midas Eduventures • Midas Concept School, Sausar<br>
        This is an automated system email. Please do not reply.
      </div>
    </div>
  </body>
  </html>
  `;

  const mailOptions = {
    from: `"Midas Faculty Portal" <${senderEmail}>`,
    to: targetRecipient,
    subject: professionalSubject,
    html: htmlBody,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[Nodemailer] Welcome Email Sent to ${email}! MessageID: ${info.messageId}`);
}

/**
 * Sends a welcome email to newly registered Evening Faculty with their credentials.
 */
async function sendEveningFacultyWelcomeEmail({ facultyName, email, password }) {
  const transporter = await getTransporter();
  const senderEmail = process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@midas-eduventures.com';
  const professionalSubject = `Welcome to Midas Concept School - Evening Faculty Credentials`;

  const htmlBody = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 24px; text-align: center; }
      .header img { max-width: 120px; margin-bottom: 12px; }
      .header h1 { font-size: 20px; font-weight: 900; margin: 0; letter-spacing: 0.5px; }
      .content { padding: 28px 24px; }
      .meta-box { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 14px; line-height: 1.8; }
      .footer { background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="https://ui-avatars.com/api/?name=Midas+School&background=0D8ABC&color=fff&size=120" alt="Midas Logo" />
        <h1>MIDAS CONCEPT SCHOOL</h1>
        <p style="font-size: 12px; color: #60a5fa; font-weight: 700; margin: 4px 0 0 0; text-transform: uppercase;">Evening Faculty Access Credentials</p>
      </div>
      <div class="content">
        <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 0;">Welcome, ${facultyName}!</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          You have been registered as an Evening Faculty member at Midas Concept School. Below are your official login credentials.
        </p>

        <div class="meta-box">
          <div><strong>Email Login:</strong> ${email}</div>
          <div><strong>Password:</strong> ${password}</div>
        </div>

        <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin-top: 16px;">
          You can use these credentials to log into the Faculty Dashboard to submit your daily reports and manage your attendance.
        </p>
      </div>
      <div class="footer">
        © 2026 Midas Eduventures • Midas Concept School, Sausar<br>
        This is an automated system email. Please do not reply.
      </div>
    </div>
  </body>
  </html>
  `;

  const mailOptions = {
    from: `"Midas Faculty Portal" <${senderEmail}>`,
    to: email,
    subject: professionalSubject,
    html: htmlBody,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[Nodemailer] Evening Welcome Email Sent to ${email}! MessageID: ${info.messageId}`);
}

/**
 * Sends a feature announcement email to existing Evening Faculty.
 */
async function sendEveningFeatureAnnouncementEmail({ facultyName, email }) {
  const transporter = await getTransporter();
  const senderEmail = process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@midas-eduventures.com';
  const professionalSubject = `Exciting New Update! Location-Based Attendance at Midas Concept School`;

  const htmlBody = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 24px; text-align: center; }
      .header img { max-width: 120px; margin-bottom: 12px; }
      .header h1 { font-size: 20px; font-weight: 900; margin: 0; letter-spacing: 0.5px; }
      .content { padding: 28px 24px; }
      .highlight-box { background: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 12px; margin: 24px 0; text-align: center; }
      .footer { background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="https://ui-avatars.com/api/?name=Midas+School&background=0D8ABC&color=fff&size=120" alt="Midas Logo" />
        <h1>MIDAS CONCEPT SCHOOL</h1>
        <p style="font-size: 12px; color: #60a5fa; font-weight: 700; margin: 4px 0 0 0; text-transform: uppercase;">Faculty Portal Update</p>
      </div>
      <div class="content">
        <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 0;">Hello, ${facultyName}!</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          After the successful rollout of our Daily Reports system, we are thrilled to announce a brand new feature to make our Evening Batch attendance completely transparent and professional.
        </p>

        <div class="highlight-box">
          <h3 style="margin-top:0; color: #1d4ed8; font-size: 16px;">📍 New Location-Based Punch-In/Out</h3>
          <p style="font-size: 14px; line-height: 1.5; color: #1e3a8a; margin-bottom: 0;">
            When you log into your Faculty Dashboard, you will now see a GPS Location-Based Attendance widget. 
            You must be physically present on the school campus to Punch In. If you leave the campus radius, the system will automatically Punch you out!
          </p>
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          This ensures seamless and accurate attendance tracking for all our dedicated evening faculty. 
          Log into your dashboard today to see the new professional UI!
        </p>

        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 14px; line-height: 1.6; color: #334155; font-style: italic;">
            Thank you for your continuous support and dedication. Because of your incredible support, advancements like this are possible, and we are successfully growing together.
          </p>
        </div>
      </div>
      <div class="footer">
        © 2026 Midas Eduventures • Midas Concept School, Sausar<br>
        This is an automated system email. Please do not reply.
      </div>
    </div>
  </body>
  </html>
  `;

  const mailOptions = {
    from: `"Midas Faculty Portal" <${senderEmail}>`,
    to: email,
    subject: professionalSubject,
    html: htmlBody,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[Nodemailer] Feature Announcement Email Sent to ${email}! MessageID: ${info.messageId}`);
}

module.exports = { 
  sendWeeklyReportEmail, 
  sendFacultyWelcomeEmail,
  sendEveningFacultyWelcomeEmail,
  sendEveningFeatureAnnouncementEmail
};
