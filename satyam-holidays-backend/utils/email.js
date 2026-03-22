const nodemailer = require("nodemailer");
const logger = require("./logger");
const NODE_ENV = process.env.NODE_ENV || "development";

// Brand Configuration
const BRAND = {
  NAME: "Satyam Holidays",
  PRIMARY: "#f59e0b",
  PRIMARY_DARK: "#d97706",
  SECONDARY: "#ea580c",
  DARK: "#1e293b",
  LIGHT: "#f8fafc",
  TEXT: "#334155",
  TEXT_LIGHT: "#64748b",
  BORDER: "#e2e8f0",
  LOGO_URL: process.env.EMAIL_BRAND_LOGO_URL || "https://satyamholidays.com/satyam-logo.svg",
  PHONE: "+91 98247 37137",
  EMAIL: "satyamholidays19@gmail.com",
  WEBSITE: "https://satyamholidays.com",
  WHATSAPP: "919824737137",
};

let transporter = null;

async function ensureTransporter() {
  if (transporter) return transporter;
  const allowDevSend = process.env.EMAIL_SEND_IN_DEV === "true";

  if (NODE_ENV === "production" || allowDevSend) {
    if (process.env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      return transporter;
    }
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    return transporter;
  }

  if (process.env.ETHEREAL_ENABLE === "true") {
    logger.warn("[email] Using Ethereal test account");
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    return transporter;
  }

  logger.warn("[email] Dev mode - emails logged only");
  return null;
}

// Modern Email Base Template
const baseTemplate = (content, title) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
          ${content}
        </table>
        <!-- Footer -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin-top:24px;">
          <tr>
            <td align="center" style="padding:0 16px;">
              <p style="font-size:12px;color:#94a3b8;margin:0;">
                © ${new Date().getFullYear()} ${BRAND.NAME}. All rights reserved.
              </p>
              <p style="font-size:12px;color:#94a3b8;margin:8px 0 0;">
                ${BRAND.EMAIL} • ${BRAND.PHONE}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Email Templates
const emailTemplates = {
  "enquiry-notification": (data) => ({
    subject: `New Enquiry from ${data.enquiry.name}${data.enquiry.destination ? ` - ${data.enquiry.destination}` : ""}`,
    html: baseTemplate(
      `
      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,${BRAND.PRIMARY},${BRAND.SECONDARY});padding:32px 24px;text-align:center;">
          <img src="${BRAND.LOGO_URL}" alt="${BRAND.NAME}" style="height:48px;width:auto;margin-bottom:16px;" />
          <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0;">New Enquiry Received</h1>
          <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:8px 0 0;">A customer is interested in your services</p>
        </td>
      </tr>
      <!-- Content -->
      <tr>
        <td style="padding:32px 24px;">
          <!-- Customer Card -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;margin-bottom:24px;">
            <tr>
              <td style="padding:20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="56" valign="top">
                      <div style="width:48px;height:48px;background:linear-gradient(135deg,${BRAND.PRIMARY},${BRAND.SECONDARY});border-radius:50%;text-align:center;line-height:48px;color:#fff;font-weight:700;font-size:20px;">
                        ${(data.enquiry.name || "?").charAt(0).toUpperCase()}
                      </div>
                    </td>
                    <td style="padding-left:12px;">
                      <p style="font-size:18px;font-weight:600;color:${BRAND.DARK};margin:0;">${data.enquiry.name}</p>
                      <p style="font-size:14px;color:${BRAND.TEXT_LIGHT};margin:4px 0 0;">${data.enquiry.email}</p>
                      ${data.enquiry.phone ? `<p style="font-size:14px;color:${BRAND.TEXT_LIGHT};margin:4px 0 0;">${data.enquiry.phone}</p>` : ""}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Details -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${
              data.enquiry.destination
                ? `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid ${BRAND.BORDER};">
                <p style="font-size:12px;color:${BRAND.TEXT_LIGHT};text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Destination</p>
                <p style="font-size:15px;color:${BRAND.DARK};font-weight:500;margin:0;text-transform:capitalize;">${data.enquiry.destination}</p>
              </td>
            </tr>`
                : ""
            }
            ${
              data.enquiry.travelers
                ? `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid ${BRAND.BORDER};">
                <p style="font-size:12px;color:${BRAND.TEXT_LIGHT};text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Travelers</p>
                <p style="font-size:15px;color:${BRAND.DARK};font-weight:500;margin:0;">${data.enquiry.travelers} person(s)</p>
              </td>
            </tr>`
                : ""
            }
            ${
              data.enquiry.travelDate
                ? `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid ${BRAND.BORDER};">
                <p style="font-size:12px;color:${BRAND.TEXT_LIGHT};text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Travel Date</p>
                <p style="font-size:15px;color:${BRAND.DARK};font-weight:500;margin:0;">${new Date(data.enquiry.travelDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
              </td>
            </tr>`
                : ""
            }
            ${
              data.enquiry.budget
                ? `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid ${BRAND.BORDER};">
                <p style="font-size:12px;color:${BRAND.TEXT_LIGHT};text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Budget</p>
                <p style="font-size:15px;color:${BRAND.DARK};font-weight:500;margin:0;">${data.enquiry.budget}</p>
              </td>
            </tr>`
                : ""
            }
          </table>

          ${
            data.enquiry.message
              ? `
          <!-- Message -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border-left:4px solid ${BRAND.PRIMARY};border-radius:0 8px 8px 0;margin-bottom:24px;">
            <tr>
              <td style="padding:16px;">
                <p style="font-size:12px;color:${BRAND.PRIMARY_DARK};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin:0 0 8px;">Customer Message</p>
                <p style="font-size:14px;color:${BRAND.TEXT};line-height:1.6;margin:0;white-space:pre-line;">${data.enquiry.message}</p>
              </td>
            </tr>
          </table>`
              : ""
          }

          <!-- Meta Info -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;margin-bottom:24px;">
            <tr>
              <td style="padding:12px 16px;">
                <p style="font-size:12px;color:${BRAND.TEXT_LIGHT};margin:0;">
                  <strong>ID:</strong> ${data.enquiry._id} &nbsp;•&nbsp;
                  <strong>Received:</strong> ${new Date(data.enquiry.createdAt).toLocaleString("en-IN")}
                </p>
              </td>
            </tr>
          </table>

          <!-- CTA -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center">
                <a href="mailto:${data.enquiry.email}" style="display:inline-block;background:linear-gradient(135deg,${BRAND.PRIMARY},${BRAND.SECONDARY});color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:14px;">Reply to Customer</a>
                ${data.enquiry.phone ? `<a href="tel:${data.enquiry.phone.replace(/[^0-9+]/g, "")}" style="display:inline-block;background:#ffffff;color:${BRAND.PRIMARY};text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:14px;border:2px solid ${BRAND.PRIMARY};margin-left:12px;">Call</a>` : ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `,
      "New Enquiry - Satyam Holidays"
    ),
  }),

  "enquiry-confirmation": (data) => ({
    subject: "Thank you for your enquiry - Satyam Holidays",
    html: baseTemplate(
      `
      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,${BRAND.PRIMARY},${BRAND.SECONDARY});padding:40px 24px;text-align:center;">
          <img src="${BRAND.LOGO_URL}" alt="${BRAND.NAME}" style="height:56px;width:auto;margin-bottom:16px;" />
          <h1 style="color:#ffffff;font-size:28px;font-weight:700;margin:0;">Thank You!</h1>
          <p style="color:rgba(255,255,255,0.9);font-size:15px;margin:12px 0 0;">We've received your travel enquiry</p>
        </td>
      </tr>
      <!-- Content -->
      <tr>
        <td style="padding:32px 24px;">
          <p style="font-size:16px;color:${BRAND.TEXT};line-height:1.7;margin:0 0 24px;">
            Hi <strong>${data.name}</strong>,
          </p>
          <p style="font-size:15px;color:${BRAND.TEXT};line-height:1.7;margin:0 0 24px;">
            Thank you for choosing Satyam Holidays! Our travel experts are reviewing your request and will contact you within 24 hours with personalized options.
          </p>

          <!-- Reference Card -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;margin-bottom:24px;">
            <tr>
              <td style="padding:20px;text-align:center;">
                <p style="font-size:12px;color:${BRAND.PRIMARY_DARK};text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Your Reference Number</p>
                <p style="font-size:20px;font-weight:700;color:${BRAND.DARK};font-family:monospace;margin:0;">${data.enquiryId}</p>
              </td>
            </tr>
          </table>

          <!-- What's Next -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;margin-bottom:24px;">
            <tr>
              <td style="padding:24px;">
                <p style="font-size:14px;font-weight:600;color:${BRAND.DARK};margin:0 0 16px;">What happens next?</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${[
                    "Our team reviews your travel requirements",
                    "We prepare customized package options",
                    "You receive detailed quotes via email/phone",
                    "We help plan your perfect trip",
                  ]
                    .map(
                      (step, i) => `
                  <tr>
                    <td width="32" valign="top" style="padding:8px 0;">
                      <div style="width:24px;height:24px;background:${BRAND.PRIMARY};border-radius:50%;text-align:center;line-height:24px;color:#fff;font-size:12px;font-weight:600;">${i + 1}</div>
                    </td>
                    <td style="padding:8px 0 8px 12px;">
                      <p style="font-size:14px;color:${BRAND.TEXT};margin:0;">${step}</p>
                    </td>
                  </tr>
                  `
                    )
                    .join("")}
                </table>
              </td>
            </tr>
          </table>

          <!-- Contact -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BRAND.BORDER};padding-top:24px;">
            <tr>
              <td align="center">
                <p style="font-size:14px;color:${BRAND.TEXT_LIGHT};margin:0 0 16px;">Need immediate assistance?</p>
                <a href="https://wa.me/${BRAND.WHATSAPP}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Chat on WhatsApp</a>
                <a href="tel:${BRAND.PHONE.replace(/\s/g, "")}" style="display:inline-block;background:#ffffff;color:${BRAND.DARK};text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;border:2px solid ${BRAND.BORDER};margin-left:8px;">Call Us</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `,
      "Thank You - Satyam Holidays"
    ),
  }),
};

// Send email function
const sendEmail = async ({ to, subject, template, data }) => {
  try {
    if (NODE_ENV === "test") {
      const templateFn = emailTemplates[template];
      if (!templateFn) throw new Error(`Template '${template}' not found`);
      logger.info("[email:test] Mock send", { to, template });
      return { mocked: true };
    }

    const templateFn = emailTemplates[template];
    if (!templateFn) throw new Error(`Template '${template}' not found`);

    const emailContent = templateFn(data);

    const mailOptions = {
      from: `"${BRAND.NAME}" <${process.env.SMTP_USER || process.env.EMAIL_USER || "no-reply@satyamholidays.com"}>`,
      to,
      subject: emailContent.subject || subject,
      html: emailContent.html,
    };

    await ensureTransporter();

    if (transporter) {
      const info = await transporter.sendMail(mailOptions);
      logger.info("Email sent", { messageId: info.messageId });
      return info;
    }

    logger.info("[email:dev] Email logged", { to, subject: emailContent.subject });
    return { mocked: true };
  } catch (error) {
    logger.error("Email failed", { error: error.message });
    throw error;
  }
};

// Convenience helpers
async function sendAdminNotification(enquiry) {
  const adminTo = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  if (!adminTo) {
    logger.warn("[email] ADMIN_EMAIL not set");
    return { skipped: true };
  }
  return sendEmail({
    to: adminTo,
    template: "enquiry-notification",
    subject: "New enquiry received",
    data: { enquiry },
  });
}

async function sendCustomerConfirmation(enquiry) {
  if (!enquiry?.email) {
    logger.warn("[email] No customer email");
    return { skipped: true };
  }
  return sendEmail({
    to: enquiry.email,
    template: "enquiry-confirmation",
    subject: "Thank you for your enquiry",
    data: { name: enquiry.name, enquiryId: enquiry._id, enquiry },
  });
}

module.exports = {
  send: sendEmail,
  sendAdminNotification,
  sendCustomerConfirmation,
};
