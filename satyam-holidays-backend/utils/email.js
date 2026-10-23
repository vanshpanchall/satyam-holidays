const nodemailer = require("nodemailer");
const logger = require("./logger");
const settingService = require("../services/settingService");
const { createEmailTemplates } = require("./emailTemplates");
const NODE_ENV = process.env.NODE_ENV || "development";

function absoluteUrl(path, base) {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

// Gmail and Outlook don't render SVG, so only use a raster logo; otherwise the wordmark stands alone
function emailSafeLogo(settings, site) {
  const candidate = process.env.EMAIL_BRAND_LOGO_URL || absoluteUrl(settings["company.logo"], site);
  return /\.(png|jpe?g|gif|webp)(\?|$)/i.test(candidate) ? candidate : "";
}

function buildBrand(settings) {
  const phones = settings["company.phones"];
  const phone =
    Array.isArray(phones) && phones.length
      ? phones[0]
      : typeof phones === "string"
        ? phones
        : "+91 98247 37137";
  // Links in emails must point at the public site (admin deep links, packages, etc.)
  const site = (
    process.env.PUBLIC_SITE_URL ||
    process.env.FRONTEND_ORIGIN ||
    settings["company.website"] ||
    "https://satyamholidays.vercel.app"
  ).replace(/\/$/, "");
  const address = settings["company.address"] || {};

  return {
    NAME: settings["company.name"] || "Satyam Holidays",
    TAGLINE: settings["company.tagline"] || "",
    LOGO_URL: emailSafeLogo(settings, site),
    PHONE: phone,
    EMAIL: settings["company.email"] || "satyamholidays19@gmail.com",
    SITE: site,
    WHATSAPP: String(settings["company.whatsapp"] || phone).replace(/\D/g, "") || "919824737137",
    ADDRESS: [address.line1, address.line2, address.country].filter(Boolean).join(", "),
    HIGHLIGHTS: settings["home.highlights"],
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
      replyTo: brand.EMAIL,
      subject: emailContent.subject || subject,
      html: emailContent.html,
      text: emailContent.text,
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
