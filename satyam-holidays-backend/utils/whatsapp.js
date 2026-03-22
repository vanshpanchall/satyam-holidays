const https = require("https");
const logger = require("./logger");

function buildPayload({ to, text, template }) {
  if (template) {
    return {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template,
    };
  }
  return {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  };
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length >= 12) return digits; // e.g., India
  if (digits.startsWith("+")) return digits.slice(1);
  // default to India country code if not provided
  return `91${digits}`;
}

async function sendWhatsApp({ to, text, template }) {
  try {
    const enabled = process.env.WHATSAPP_ENABLE === "true";
    if (!enabled) {
      logger.info("[whatsapp] Disabled; skip send to", to);
      return { skipped: true };
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneId) throw new Error("WhatsApp token/phone number id missing");

    const payload = buildPayload({ to: normalizePhone(to), text, template });

    const data = JSON.stringify(payload);
    const options = {
      method: "POST",
      hostname: "graph.facebook.com",
      path: `/v18.0/${phoneId}/messages`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          const json = (() => {
            try {
              return JSON.parse(body);
            } catch (_) {
              return { raw: body };
            }
          })();
          if (res.statusCode >= 200 && res.statusCode < 300) return resolve(json);
          const err = new Error(`WhatsApp API ${res.statusCode}`);
          err.response = json;
          reject(err);
        });
      });
      req.on("error", reject);
      req.write(data);
      req.end();
    });

    logger.info("[whatsapp] Sent successfully:", response);
    return response;
  } catch (err) {
    logger.error("[whatsapp] Send failed:", err.message, err.response || "");
    // swallow errors - don't block the main flow
    return { error: true, message: err.message };
  }
}

function thankYouTemplate(name) {
  // Free text fallback – avoids template approval requirement
  const line1 = `Hi ${name || "there"} 👋`;
  const line2 = `Thanks for contacting Satyam Holidays!`;
  const line3 = `Our travel experts will get back to you within 24 hours with personalized options.`;
  const line4 = `Meanwhile, feel free to reply with your preferred destination or travel dates.`;
  return [line1, "", line2, line3, line4, "", "– Team Satyam Holidays"].join("\n");
}

async function sendEnquiryThankYou({ name, phone }) {
  if (!phone) return { skipped: true };
  const text = thankYouTemplate(name);
  return sendWhatsApp({ to: phone, text });
}

module.exports = { sendWhatsApp, sendEnquiryThankYou };
