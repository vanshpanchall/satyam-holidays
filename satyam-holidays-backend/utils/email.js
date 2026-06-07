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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0 !important; }
      .wrapper { padding: 16px 8px !important; }
      .content-padding { padding: 24px 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;color:#334155;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;width:100%;margin:0;padding:0;" class="wrapper">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 15px -3px rgba(0,0,0,0.05),0 4px 6px -2px rgba(0,0,0,0.025);" class="container">
          ${content}
        </table>
        <!-- Footer -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin-top:24px;">
          <tr>
            <td align="center" style="padding:0 16px;text-align:center;">
              <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.5;">
                © ${new Date().getFullYear()} <strong>${brand.NAME}</strong>. All rights reserved.
              </p>
              <p style="font-size:12px;color:#94a3b8;margin:6px 0 0;line-height:1.5;">
                ${brand.EMAIL} &nbsp;•&nbsp; ${brand.PHONE}
              </p>
              <p style="font-size:11px;color:#cbd5e1;margin:12px 0 0;line-height:1.5;">
                You received this transactional email in relation to your request on ${brand.WEBSITE}.
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
      subject: `[New Enquiry] ${safe(data.enquiry.name)} - ${safe(data.enquiry.destination || "General Opportunity")}`,
      html: baseTemplate(
        `
      <!-- Header Banner -->
      <tr>
        <td style="background:linear-gradient(135deg, ${brand.PRIMARY}, ${brand.SECONDARY});padding:36px 24px;text-align:center;color:#ffffff;">
          <img src="${brand.LOGO_URL}" alt="${safe(brand.NAME)}" style="height:54px;width:auto;margin-bottom:16px;display:inline-block;" />
          <h1 style="font-size:24px;font-weight:800;margin:0;letter-spacing:-0.5px;line-height:1.3;">New Enquiry Received</h1>
          <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:8px 0 0;font-weight:500;">Lead detail capture notification</p>
        </td>
      </tr>
      <!-- Main Content -->
      <tr>
        <td style="padding:40px 32px;" class="content-padding">
          <p style="font-size:15px;line-height:1.6;color:#475569;margin-bottom:24px;">
            Hello Admin, <br/>A new travel interest enquiry has been submitted on the website. Here are the captured customer requirements:
          </p>

          <!-- Customer Details Card -->
          <h2 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin:0 0 12px;">Customer Contact Info</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px;">
            <tr>
              <td style="padding:16px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:4px 0;font-size:14px;color:#64748b;" width="35%"><strong>Client Name:</strong></td>
                    <td style="padding:4px 0;font-size:14px;color:${brand.DARK};font-weight:600;">${safe(data.enquiry.name)}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:14px;color:#64748b;"><strong>Email Address:</strong></td>
                    <td style="padding:4px 0;font-size:14px;color:${brand.DARK};font-weight:600;"><a href="mailto:${safe(data.enquiry.email)}" style="color:${brand.PRIMARY_DARK};text-decoration:none;">${safe(data.enquiry.email)}</a></td>
                  </tr>
                  ${
                    data.enquiry.phone
                      ? `
                  <tr>
                    <td style="padding:4px 0;font-size:14px;color:#64748b;"><strong>Phone Number:</strong></td>
                    <td style="padding:4px 0;font-size:14px;color:${brand.DARK};font-weight:600;"><a href="tel:${safe(data.enquiry.phone)}" style="color:${brand.PRIMARY_DARK};text-decoration:none;">${safe(data.enquiry.phone)}</a></td>
                  </tr>`
                      : ""
                  }
                </table>
              </td>
            </tr>
          </table>

          <!-- Travel Preferences Card -->
          <h2 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin:0 0 12px;">Travel Preferences</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px;">
            <tr>
              <td style="padding:16px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;" width="35%"><strong>Destination:</strong></td>
                    <td style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:${brand.DARK};font-weight:600;text-transform:capitalize;">${safe(data.enquiry.destination || "Not Specified")}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;"><strong>Travel Date:</strong></td>
                    <td style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:${brand.DARK};font-weight:600;">
                      ${data.enquiry.travelDate ? new Date(data.enquiry.travelDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "Flexible / Not set"}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;"><strong>No. of Travelers:</strong></td>
                    <td style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:${brand.DARK};font-weight:600;">${safe(data.enquiry.travelers || "1")} traveler(s)</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#64748b;"><strong>Expected Budget:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:${brand.DARK};font-weight:600;">${safe(data.enquiry.budget || "Flexible")}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          ${
            data.enquiry.message
              ? `
          <!-- Customer Message -->
          <h2 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin:0 0 12px;">Customer Special Instructions</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid ${brand.PRIMARY};background-color:#fffbeb;border-radius:0 12px 12px 0;margin-bottom:28px;">
            <tr>
              <td style="padding:16px 20px;">
                <p style="font-size:14px;color:#78350f;line-height:1.6;margin:0;white-space:pre-line;font-style:italic;">"${safe(data.enquiry.message)}"</p>
              </td>
            </tr>
          </table>`
              : ""
          }

          <!-- Metadata info -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;border-radius:8px;margin-bottom:32px;">
            <tr>
              <td style="padding:12px 16px;font-size:11px;color:#64748b;line-height:1.5;">
                <strong>System ID:</strong> ${safe(data.enquiry._id)}<br/>
                <strong>Source IP:</strong> ${safe(data.enquiry.ipAddress || "Unknown")} &nbsp;•&nbsp; <strong>Date:</strong> ${new Date(data.enquiry.createdAt).toLocaleString("en-IN")}
              </td>
            </tr>
          </table>

          <!-- Actions -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="text-align:center;">
                <a href="mailto:${safe(data.enquiry.email)}" style="display:inline-block;background:linear-gradient(135deg, ${brand.PRIMARY}, ${brand.SECONDARY});color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:8px;font-weight:700;font-size:14px;box-shadow:0 4px 6px -1px rgba(245,158,11,0.3);">Reply to Client</a>
                ${
                  data.enquiry.phone
                    ? `
                <a href="https://wa.me/${String(data.enquiry.phone).replace(/\D/g, "")}" style="display:inline-block;background-color:#ffffff;color:${brand.PRIMARY_DARK};text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;border:2px solid ${brand.PRIMARY};margin-left:12px;">WhatsApp</a>`
                    : ""
                }
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `,
        `New Travel Enquiry - ${safe(brand.NAME)}`,
        brand
      ),
    }),

    "enquiry-confirmation": (data) => ({
      subject: `Thank you for your enquiry! - Reference #${safe(data.enquiryId).slice(-6).toUpperCase()}`,
      html: baseTemplate(
        `
      <!-- Header Banner -->
      <tr>
        <td style="background:linear-gradient(135deg, ${brand.PRIMARY}, ${brand.SECONDARY});padding:48px 24px;text-align:center;color:#ffffff;">
          <img src="${brand.LOGO_URL}" alt="${safe(brand.NAME)}" style="height:60px;width:auto;margin-bottom:20px;display:inline-block;" />
          <h1 style="font-size:28px;font-weight:800;margin:0;letter-spacing:-0.5px;line-height:1.2;">We've Received Your Request!</h1>
          <p style="color:rgba(255,255,255,0.9);font-size:15px;margin:10px 0 0;font-weight:500;">Let the journey begin</p>
        </td>
      </tr>
      <!-- Main Content -->
      <tr>
        <td style="padding:40px 32px;" class="content-padding">
          <p style="font-size:16px;line-height:1.6;color:${brand.DARK};margin-bottom:20px;">
            Dear <strong>${safe(data.name)}</strong>,
          </p>
          <p style="font-size:15px;line-height:1.6;color:#475569;margin-bottom:28px;">
            Thank you for reaching out to <strong>${safe(brand.NAME)}</strong>! We are absolutely thrilled to help you design your next memorable holiday. Our dedicated travel experts are already reviewing your details.
          </p>

          <!-- Reference Code Card -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg, #fef3c7, #fde68a);border-radius:12px;margin-bottom:32px;">
            <tr>
              <td style="padding:24px;text-align:center;">
                <p style="font-size:12px;color:${brand.PRIMARY_DARK};text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin:0 0 8px;">Your Booking Reference</p>
                <p style="font-size:24px;font-weight:800;color:${brand.DARK};font-family:monospace;margin:0;letter-spacing:2px;">
                  #${safe(data.enquiryId).toUpperCase()}
                </p>
              </td>
            </tr>
          </table>

          <!-- Process Timeline -->
          <h3 style="font-size:14px;font-weight:700;color:${brand.DARK};margin:0 0 20px;text-transform:uppercase;letter-spacing:0.5px;">What Happens Next?</h3>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            ${[
              {
                title: "Detail Analysis",
                desc: "Our destinations expert reviews your budget, traveler count, and location preferences.",
              },
              {
                title: "Customized Itinerary Draft",
                desc: "We build a tailored day-by-day plan with options for flights, transfers, and hotels.",
              },
              {
                title: "Collaborative Adjustments",
                desc: "We hop on a call or WhatsApp with you to fine-tune the details to your satisfaction.",
              },
              {
                title: "Secure Booking & Travel Guides",
                desc: "Once finalized, you receive confirmed vouchers, tickets, and your custom travel kit.",
              },
            ]
              .map(
                (step, idx) => `
            <tr>
              <td width="36" valign="top" style="padding:12px 0;">
                <div style="width:26px;height:26px;background-color:${brand.PRIMARY};border-radius:50%;text-align:center;line-height:26px;color:#ffffff;font-size:13px;font-weight:700;">${idx + 1}</div>
              </td>
              <td style="padding:10px 0 16px 16px;border-bottom:${idx < 3 ? "1px solid #f1f5f9" : "none"};">
                <h4 style="font-size:15px;font-weight:600;color:${brand.DARK};margin:0 0 4px;">${step.title}</h4>
                <p style="font-size:13px;color:#64748b;line-height:1.5;margin:0;">${step.desc}</p>
              </td>
            </tr>
            `
              )
              .join("")}
          </table>

          <!-- Direct Communication Options -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;padding-top:28px;">
            <tr>
              <td align="center" style="text-align:center;">
                <p style="font-size:14px;color:#64748b;margin:0 0 16px;">Have urgent questions or custom changes?</p>
                <a href="https://wa.me/${brand.WHATSAPP}?text=Hi%20Satyam%20Holidays,%20I%20have%20submitted%20an%20enquiry%20reference%20%23${safe(data.enquiryId)}" style="display:inline-block;background-color:#25D366;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;box-shadow:0 4px 6px -1px rgba(37,211,102,0.3);margin-bottom:8px;">Chat on WhatsApp</a>
                <a href="tel:${brand.PHONE.replace(/\s/g, "")}" style="display:inline-block;background-color:#ffffff;color:${brand.DARK};text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:14px;border:2px solid #cbd5e1;margin-left:8px;margin-bottom:8px;">Call Hotline</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `,
        `Thank You for your enquiry - ${safe(brand.NAME)}`,
        brand
      ),
    }),

    "mfa-otp": (data) => ({
      subject: `[Verification Code] ${safe(data.code)} - ${safe(brand.NAME)} Admin Access`,
      html: baseTemplate(
        `
      <!-- Header Banner -->
      <tr>
        <td style="background:linear-gradient(135deg, ${brand.PRIMARY}, ${brand.SECONDARY});padding:36px 24px;text-align:center;color:#ffffff;">
          <img src="${brand.LOGO_URL}" alt="${safe(brand.NAME)}" style="height:48px;width:auto;margin-bottom:16px;display:inline-block;" />
          <h1 style="font-size:22px;font-weight:800;margin:0;letter-spacing:-0.5px;line-height:1.3;">Security Verification</h1>
          <p style="color:rgba(255,255,255,0.9);font-size:13px;margin:6px 0 0;font-weight:500;">Admin session authorization request</p>
        </td>
      </tr>
      <!-- Main Content -->
      <tr>
        <td style="padding:40px 32px;text-align:center;" class="content-padding">
          <p style="font-size:15px;line-height:1.6;color:#475569;margin-bottom:24px;text-align:left;">
            Hello, <br/>A request has been made to log in to the <strong>${safe(brand.NAME)}</strong> Administrator dashboard. Please use the verification code below to authorize your session:
          </p>

          <!-- OTP Code Box -->
          <div style="background-color:#f8fafc;border:2px dashed ${brand.PRIMARY};border-radius:12px;padding:24px;margin-bottom:24px;display:inline-block;min-width:240px;">
            <p style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin:0 0 10px;">One-Time Password (OTP)</p>
            <span style="font-size:36px;font-weight:800;color:${brand.DARK};letter-spacing:8px;font-family:monospace;display:inline-block;padding-left:8px;">${safe(data.code)}</span>
          </div>

          <p style="font-size:13px;color:#ef4444;font-weight:600;margin:0 0 28px;line-height:1.5;">
            ⏰ This code will expire in 5 minutes.
          </p>

          <!-- Security disclaimer -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f1f5f9;padding-top:20px;">
            <tr>
              <td style="font-size:12px;color:#94a3b8;line-height:1.5;text-align:left;">
                <strong>Security Notice:</strong> If you did not initiate this login request, your account credentials might be compromised. Please change your admin password immediately and inform your security officer.
              </td>
            </tr>
          </table>
        </td>
      </tr>
        `,
        `Verification Code - ${safe(brand.NAME)}`,
        brand
      ),
    }),

    "enquiry-nudge": (data) => ({
      subject: `Ready for your dream trip to ${safe(data.destination?.toUpperCase())}? ✈️`,
      html: baseTemplate(
        `
      <!-- Header Banner -->
      <tr>
        <td style="background:linear-gradient(135deg, ${brand.PRIMARY}, ${brand.SECONDARY});padding:48px 24px;text-align:center;color:#ffffff;">
          <img src="${brand.LOGO_URL}" alt="${safe(brand.NAME)}" style="height:60px;width:auto;margin-bottom:20px;display:inline-block;" />
          <h1 style="font-size:26px;font-weight:800;margin:0;letter-spacing:-0.5px;line-height:1.3;">Your Next Adventure Awaits!</h1>
        </td>
      </tr>
      <!-- Main Content -->
      <tr>
        <td style="padding:40px 32px;" class="content-padding">
          <p style="font-size:16px;line-height:1.6;color:${brand.DARK};margin-bottom:16px;">
            Dear <strong>${safe(data.name)}</strong>,
          </p>
          <p style="font-size:15px;line-height:1.6;color:#475569;margin-bottom:24px;">
            We noticed you recently enquired about planning a vacation to the beautiful destination of <strong style="color:${brand.PRIMARY_DARK};">${safe(data.destination?.toUpperCase())}</strong>. 
          </p>
          <p style="font-size:15px;line-height:1.6;color:#475569;margin-bottom:28px;">
            We would love to help you customize the perfect itinerary! Our travel planners can tweak hotel categories, reschedule activities, and secure special dynamic discounts that fit your preferences perfectly.
          </p>

          <!-- Why Choose Us Grid -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:32px;">
            <tr>
              <td>
                <h4 style="font-size:14px;font-weight:700;color:${brand.DARK};margin:0 0 16px;text-transform:uppercase;letter-spacing:0.5px;">Why Plan with ${safe(brand.NAME)}?</h4>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${[
                    {
                      title: "100% Customized Itineraries",
                      desc: "Every day of your tour is crafted to match your speed and preferences.",
                    },
                    {
                      title: "Best Price Guaranteed",
                      desc: "Direct partnerships with local DMC suppliers give you unmatched value.",
                    },
                    {
                      title: "24/7 On-Trip Emergency Support",
                      desc: "We remain connected with you throughout your travels for absolute peace of mind.",
                    },
                  ]
                    .map(
                      (benefit) => `
                  <tr>
                    <td valign="top" style="padding:8px 0;" width="24">
                      <span style="color:${brand.PRIMARY_DARK};font-size:16px;font-weight:bold;">✔</span>
                    </td>
                    <td style="padding:6px 0 6px 10px;">
                      <p style="font-size:14px;color:${brand.DARK};margin:0;"><strong>${benefit.title}</strong>: ${benefit.desc}</p>
                    </td>
                  </tr>
                  `
                    )
                    .join("")}
                </table>
              </td>
            </tr>
          </table>

          <!-- Actions -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="text-align:center;">
            <tr>
              <td align="center" style="text-align:center;">
                <a href="https://wa.me/${brand.WHATSAPP}?text=Hi%20Satyam%20Holidays,%20I'm%20ready%20to%20finalize%20my%20trip%20to%20${safe(data.destination)}" style="display:inline-block;background-color:#25D366;color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:8px;font-weight:700;font-size:14px;box-shadow:0 4px 6px -1px rgba(37,211,102,0.3);">Chat with a Destination Expert</a>
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
      subject: `🎉 Your Referral Reward Discount Code is Ready!`,
      html: baseTemplate(
        `
      <!-- Header Banner -->
      <tr>
        <td style="background:linear-gradient(135deg, ${brand.PRIMARY}, ${brand.SECONDARY});padding:48px 24px;text-align:center;color:#ffffff;">
          <img src="${brand.LOGO_URL}" alt="${safe(brand.NAME)}" style="height:60px;width:auto;margin-bottom:20px;display:inline-block;" />
          <h1 style="font-size:28px;font-weight:800;margin:0;letter-spacing:-0.5px;line-height:1.3;">Referral Reward Earned!</h1>
        </td>
      </tr>
      <!-- Main Content -->
      <tr>
        <td style="padding:40px 32px;" class="content-padding">
          <p style="font-size:16px;line-height:1.6;color:${brand.DARK};margin-bottom:16px;">
            Hi traveler,
          </p>
          <p style="font-size:15px;line-height:1.6;color:#475569;margin-bottom:28px;">
            Thank you so much for referring your friends to <strong>${safe(brand.NAME)}</strong>! Your referred friend has successfully completed a booking with us, which qualifies you for our exclusive Referral Reward.
          </p>

          <!-- Reward Voucher Box -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border:2px dashed ${brand.PRIMARY};border-radius:16px;margin-bottom:32px;">
            <tr>
              <td style="padding:32px 24px;text-align:center;">
                <p style="font-size:11px;color:${brand.PRIMARY_DARK};text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin:0 0 12px;">Your Discount Code</p>
                <div style="font-size:32px;font-weight:800;color:${brand.SECONDARY};letter-spacing:2px;font-family:monospace;margin:0 0 12px;display:inline-block;padding:8px 20px;background-color:#ffffff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                  ${safe(data.code)}
                </div>
                <p style="font-size:13px;color:#64748b;margin:0;">
                  Apply this code during your next travel planning session to unlock exclusive cash discounts!
                </p>
              </td>
            </tr>
          </table>

          <p style="font-size:14px;color:#64748b;line-height:1.6;margin-bottom:28px;text-align:center;">
            Keep sharing the joy of travel. There is no limit to the number of referral rewards you can earn!
          </p>

          <!-- CTA -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="text-align:center;">
            <tr>
              <td align="center" style="text-align:center;">
                <a href="${brand.WEBSITE}" style="display:inline-block;background:linear-gradient(135deg, ${brand.PRIMARY}, ${brand.SECONDARY});color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:8px;font-weight:700;font-size:14px;box-shadow:0 4px 6px -1px rgba(245,158,11,0.3);">Explore New Destinations</a>
              </td>
            </tr>
          </table>
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
