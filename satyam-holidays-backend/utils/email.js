const nodemailer = require("nodemailer");
const logger = require("./logger");
const settingService = require("../services/settingService");
const { escapeHtml } = require("./validators");
const NODE_ENV = process.env.NODE_ENV || "development";

function absoluteLogoUrl(logo, websiteBase) {
  const fallback = process.env.EMAIL_BRAND_LOGO_URL || "https://satyamholidays.com/satyam-logo.svg";
  if (!logo) return fallback;
  if (String(logo).startsWith("http")) return logo;
  const base = (websiteBase || process.env.PUBLIC_SITE_URL || "https://satyamholidays.com").replace(
    /\/$/,
    ""
  );
  const p = logo.startsWith("/") ? logo : `/${logo}`;
  return `${base}${p}`;
}

function buildBrand(settings) {
  const phones = settings["company.phones"];
  const phoneDisplay =
    Array.isArray(phones) && phones.length
      ? phones[0]
      : typeof phones === "string"
        ? phones
        : "+91 98247 37137";
  const website = settings["company.website"] || "https://satyamholidays.com";
  const waRaw = settings["company.whatsapp"] || "";
  const whatsappDigits = String(waRaw).replace(/\D/g, "") || "919824737137";

  return {
    NAME: settings["company.name"] || "Satyam Holidays",
    PRIMARY: settings["brand.primaryColor"] || process.env.EMAIL_BRAND_PRIMARY || "#f59e0b",
    PRIMARY_DARK: process.env.EMAIL_BRAND_PRIMARY_DARK || "#d97706",
    SECONDARY: process.env.EMAIL_BRAND_SECONDARY || "#ea580c",
    DARK: "#1e293b",
    LIGHT: "#f8fafc",
    TEXT: "#334155",
    TEXT_LIGHT: "#64748b",
    BORDER: "#e2e8f0",
    LOGO_URL: absoluteLogoUrl(settings["company.logo"], website),
    PHONE: phoneDisplay,
    EMAIL: settings["company.email"] || "satyamholidays19@gmail.com",
    WEBSITE: website,
    WHATSAPP: whatsappDigits,
  };
}

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

function baseTemplate(content, title, brand) {
  return `
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
                © ${new Date().getFullYear()} ${brand.NAME}. All rights reserved.
              </p>
              <p style="font-size:12px;color:#94a3b8;margin:8px 0 0;">
                ${brand.EMAIL} • ${brand.PHONE}
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
}

function createEmailTemplates(brand) {
  // Helper to safely escape user data
  const safe = (val) => escapeHtml(String(val || ""));

  return {
    "enquiry-notification": (data) => ({
      subject: `New Enquiry from ${safe(data.enquiry.name)}${data.enquiry.destination ? ` - ${safe(data.enquiry.destination)}` : ""}`,
      html: baseTemplate(
        `
      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,${brand.PRIMARY},${brand.SECONDARY});padding:32px 24px;text-align:center;">
          <img src="${brand.LOGO_URL}" alt="${safe(brand.NAME)}" style="height:48px;width:auto;margin-bottom:16px;" />
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
                      <div style="width:48px;height:48px;background:linear-gradient(135deg,${brand.PRIMARY},${brand.SECONDARY});border-radius:50%;text-align:center;line-height:48px;color:#fff;font-weight:700;font-size:20px;">
                        ${safe((data.enquiry.name || "?").charAt(0).toUpperCase())}
                      </div>
                    </td>
                    <td style="padding-left:12px;">
                      <p style="font-size:18px;font-weight:600;color:${brand.DARK};margin:0;">${safe(data.enquiry.name)}</p>
                      <p style="font-size:14px;color:${brand.TEXT_LIGHT};margin:4px 0 0;">${safe(data.enquiry.email)}</p>
                      ${data.enquiry.phone ? `<p style="font-size:14px;color:${brand.TEXT_LIGHT};margin:4px 0 0;">${safe(data.enquiry.phone)}</p>` : ""}
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
              <td style="padding:12px 0;border-bottom:1px solid ${brand.BORDER};">
                <p style="font-size:12px;color:${brand.TEXT_LIGHT};text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Destination</p>
                <p style="font-size:15px;color:${brand.DARK};font-weight:500;margin:0;text-transform:capitalize;">${safe(data.enquiry.destination)}</p>
              </td>
            </tr>`
                : ""
            }
            ${
              data.enquiry.travelers
                ? `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid ${brand.BORDER};">
                <p style="font-size:12px;color:${brand.TEXT_LIGHT};text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Travelers</p>
                <p style="font-size:15px;color:${brand.DARK};font-weight:500;margin:0;">${safe(data.enquiry.travelers)} person(s)</p>
              </td>
            </tr>`
                : ""
            }
            ${
              data.enquiry.travelDate
                ? `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid ${brand.BORDER};">
                <p style="font-size:12px;color:${brand.TEXT_LIGHT};text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Travel Date</p>
                <p style="font-size:15px;color:${brand.DARK};font-weight:500;margin:0;">${new Date(data.enquiry.travelDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
              </td>
            </tr>`
                : ""
            }
            ${
              data.enquiry.budget
                ? `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid ${brand.BORDER};">
                <p style="font-size:12px;color:${brand.TEXT_LIGHT};text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Budget</p>
                <p style="font-size:15px;color:${brand.DARK};font-weight:500;margin:0;">${safe(data.enquiry.budget)}</p>
              </td>
            </tr>`
                : ""
            }
          </table>

          ${
            data.enquiry.message
              ? `
          <!-- Message -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border-left:4px solid ${brand.PRIMARY};border-radius:0 8px 8px 0;margin-bottom:24px;">
            <tr>
              <td style="padding:16px;">
                <p style="font-size:12px;color:${brand.PRIMARY_DARK};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin:0 0 8px;">Customer Message</p>
                <p style="font-size:14px;color:${brand.TEXT};line-height:1.6;margin:0;white-space:pre-line;">${safe(data.enquiry.message)}</p>
              </td>
            </tr>
          </table>`
              : ""
          }

          <!-- Meta Info -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;margin-bottom:24px;">
            <tr>
              <td style="padding:12px 16px;">
                <p style="font-size:12px;color:${brand.TEXT_LIGHT};margin:0;">
                  <strong>ID:</strong> ${safe(data.enquiry._id)} &nbsp;•&nbsp;
                  <strong>Received:</strong> ${new Date(data.enquiry.createdAt).toLocaleString("en-IN")}
                </p>
              </td>
            </tr>
          </table>

          <!-- CTA -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center">
                <a href="mailto:${safe(data.enquiry.email)}" style="display:inline-block;background:linear-gradient(135deg,${brand.PRIMARY},${brand.SECONDARY});color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:14px;">Reply to Customer</a>
                ${data.enquiry.phone ? `<a href="tel:${String(data.enquiry.phone).replace(/[^0-9+]/g, "")}" style="display:inline-block;background:#ffffff;color:${brand.PRIMARY};text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:14px;border:2px solid ${brand.PRIMARY};margin-left:12px;">Call</a>` : ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `,
        `New Enquiry - ${safe(brand.NAME)}`,
        brand
      ),
    }),

    "enquiry-confirmation": (data) => ({
      subject: `Thank you for your enquiry - ${safe(brand.NAME)}`,
      html: baseTemplate(
        `
      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,${brand.PRIMARY},${brand.SECONDARY});padding:40px 24px;text-align:center;">
          <img src="${brand.LOGO_URL}" alt="${safe(brand.NAME)}" style="height:56px;width:auto;margin-bottom:16px;" />
          <h1 style="color:#ffffff;font-size:28px;font-weight:700;margin:0;">Thank You!</h1>
          <p style="color:rgba(255,255,255,0.9);font-size:15px;margin:12px 0 0;">We've received your travel enquiry</p>
        </td>
      </tr>
      <!-- Content -->
      <tr>
        <td style="padding:32px 24px;">
          <p style="font-size:16px;color:${brand.TEXT};line-height:1.7;margin:0 0 24px;">
            Hi <strong>${safe(data.name)}</strong>,
          </p>
          <p style="font-size:15px;color:${brand.TEXT};line-height:1.7;margin:0 0 24px;">
            Thank you for choosing ${safe(brand.NAME)}! Our travel experts are reviewing your request and will contact you within 24 hours with personalized options.
          </p>

          <!-- Reference Card -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;margin-bottom:24px;">
            <tr>
              <td style="padding:20px;text-align:center;">
                <p style="font-size:12px;color:${brand.PRIMARY_DARK};text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Your Reference Number</p>
                <p style="font-size:20px;font-weight:700;color:${brand.DARK};font-family:monospace;margin:0;">${safe(data.enquiryId)}</p>
              </td>
            </tr>
          </table>

          <!-- What's Next -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;margin-bottom:24px;">
            <tr>
              <td style="padding:24px;">
                <p style="font-size:14px;font-weight:600;color:${brand.DARK};margin:0 0 16px;">What happens next?</p>
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
                      <div style="width:24px;height:24px;background:${brand.PRIMARY};border-radius:50%;text-align:center;line-height:24px;color:#fff;font-size:12px;font-weight:600;">${i + 1}</div>
                    </td>
                    <td style="padding:8px 0 8px 12px;">
                      <p style="font-size:14px;color:${brand.TEXT};margin:0;">${step}</p>
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
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${brand.BORDER};padding-top:24px;">
            <tr>
              <td align="center">
                <p style="font-size:14px;color:${brand.TEXT_LIGHT};margin:0 0 16px;">Need immediate assistance?</p>
                <a href="https://wa.me/${brand.WHATSAPP}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Chat on WhatsApp</a>
                <a href="tel:${brand.PHONE.replace(/\s/g, "")}" style="display:inline-block;background:#ffffff;color:${brand.DARK};text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;border:2px solid ${brand.BORDER};margin-left:8px;">Call Us</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `,
        `Thank You - ${safe(brand.NAME)}`,
        brand
      ),
    }),
    "mfa-otp": (data) => ({
      subject: `Your Verification Code - ${safe(brand.NAME)}`,
      html: baseTemplate(
        `
      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,${brand.PRIMARY},${brand.SECONDARY});padding:32px 24px;text-align:center;">
          <img src="${brand.LOGO_URL}" alt="${safe(brand.NAME)}" style="height:48px;width:auto;margin-bottom:16px;" />
          <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0;">Verification Code</h1>
          <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:8px 0 0;">Use this code to complete verification</p>
        </td>
      </tr>
      <!-- Content -->
      <tr>
        <td style="padding:32px 24px;text-align:center;">
          <p style="font-size:15px;color:${brand.TEXT};line-height:1.7;margin:0 0 24px;">
            Here is your 6-digit verification code:
          </p>
          <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:24px;display:inline-block;letter-spacing:6px;font-size:32px;font-weight:bold;color:${brand.DARK};font-family:monospace;">
            ${safe(data.code)}
          </div>
          <p style="font-size:13px;color:${brand.TEXT_LIGHT};margin:0;">
            This code will expire in 5 minutes. If you did not request this code, please ignore this email.
          </p>
        </td>
      </tr>
        `,
        `Verification Code - ${safe(brand.NAME)}`,
        brand
      ),
    }),
    "enquiry-nudge": (data) => ({
      subject: `Still planning your trip to ${safe(data.destination?.toUpperCase())}? - ${safe(brand.NAME)}`,
      html: baseTemplate(
        `
      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,${brand.PRIMARY},${brand.SECONDARY});padding:32px 24px;text-align:center;">
          <img src="${brand.LOGO_URL}" alt="${safe(brand.NAME)}" style="height:48px;width:auto;margin-bottom:16px;" />
          <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0;">Let's plan your dream holiday!</h1>
        </td>
      </tr>
      <!-- Content -->
      <tr>
        <td style="padding:32px 24px;">
          <p style="font-size:16px;color:${brand.TEXT};line-height:1.7;margin:0 0 16px;">
            Hi <strong>${safe(data.name)}</strong>,
          </p>
          <p style="font-size:15px;color:${brand.TEXT};line-height:1.7;margin:0 0 24px;">
            We noticed you recently enquired about a trip to <strong>${safe(data.destination?.toUpperCase())}</strong>.
            We would love to help you customize the itinerary, choose the best hotels, and finalize details to make it a memorable journey!
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background:#f8fafc;border-radius:12px;padding:20px;">
            <tr>
              <td>
                <p style="font-size:14px;color:${brand.TEXT};margin:0 0 12px;"><strong>What we offer:</strong></p>
                <ul style="font-size:14px;color:${brand.TEXT_LIGHT};margin:0;padding-left:20px;line-height:1.6;">
                  <li>100% Customized Day-by-Day Itineraries</li>
                  <li>Exclusive dynamic pricing and deals</li>
                  <li>24/7 Support during your travel</li>
                  <li>Visa assistance & insurance processing</li>
                </ul>
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center">
                <a href="https://wa.me/${brand.WHATSAPP}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Connect on WhatsApp</a>
                <a href="${brand.WEBSITE}" style="display:inline-block;background:#ffffff;color:${brand.DARK};text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;border:2px solid ${brand.BORDER};margin-left:8px;">Visit Website</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
        `,
        `Special Offer - ${safe(brand.NAME)}`,
        brand
      ),
    }),
    "referral-code": (data) => ({
      subject: `Your Referral Reward Discount Code! - ${safe(brand.NAME)}`,
      html: baseTemplate(
        `
      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,${brand.PRIMARY},${brand.SECONDARY});padding:32px 24px;text-align:center;">
          <img src="${brand.LOGO_URL}" alt="${safe(brand.NAME)}" style="height:48px;width:auto;margin-bottom:16px;" />
          <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0;">Referral Reward Earned!</h1>
        </td>
      </tr>
      <!-- Content -->
      <tr>
        <td style="padding:32px 24px;text-align:center;">
          <p style="font-size:16px;color:${brand.TEXT};line-height:1.7;margin:0 0 16px;">
            Thank you for referring your friends to ${safe(brand.NAME)}!
          </p>
          <p style="font-size:15px;color:${brand.TEXT};line-height:1.7;margin:0 0 24px;">
            Your friend has successfully booked their holiday with us. As a token of our appreciation, here is your exclusive referral reward discount code:
          </p>
          <div style="background:#fef3c7;border:2px dashed ${brand.PRIMARY};border-radius:12px;padding:20px;margin-bottom:24px;display:inline-block;font-size:28px;font-weight:bold;color:${brand.PRIMARY_DARK};letter-spacing:2px;font-family:monospace;">
            ${safe(data.code)}
          </div>
          <p style="font-size:14px;color:${brand.TEXT_LIGHT};line-height:1.7;margin:0;">
            Use this code on your next booking with us to claim your discount!
          </p>
        </td>
      </tr>
        `,
        `Referral Reward - ${safe(brand.NAME)}`,
        brand
      ),
    }),
  };
}

const sendEmail = async ({ to, subject, template, data }) => {
  try {
    const settings = await settingService.getAll();
    const brand = buildBrand(settings);
    const emailTemplates = createEmailTemplates(brand);

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
      from: `"${brand.NAME}" <${process.env.SMTP_USER || process.env.EMAIL_USER || "no-reply@satyamholidays.com"}>`,
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

async function sendMfaOtp(email, code) {
  return sendEmail({
    to: email,
    template: "mfa-otp",
    subject: "Your Verification Code",
    data: { code },
  });
}

module.exports = {
  send: sendEmail,
  sendAdminNotification,
  sendCustomerConfirmation,
  sendMfaOtp,
};
