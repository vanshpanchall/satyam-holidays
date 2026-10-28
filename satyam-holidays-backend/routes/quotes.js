const express = require("express");
const mongoose = require("mongoose");
const Joi = require("joi");
const router = express.Router();
const auth = require("../middleware/auth");
const Quote = require("../models/Quote");
const quoteService = require("../services/quoteService");
const { buildQuotePdf } = require("../utils/pdf");
const logger = require("../utils/logger");
const { ApiErrors, successResponse, errorResponse } = require("../utils/apiResponse");
const { logAudit } = require("../utils/auditLogger");

const objectId = Joi.string().custom((v, h) =>
  mongoose.isValidObjectId(v) ? v : h.error("any.invalid")
);
const text = (max) => Joi.string().trim().max(max).allow("");

const quoteSchema = Joi.object({
  enquiry: objectId.allow(null, ""),
  package: objectId.allow(null, ""),
  customer: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    phone: text(30),
    email: Joi.string().trim().email().allow(""),
  }).required(),
  title: Joi.string().trim().min(1).max(200).required(),
  destination: text(200),
  image: text(500),
  intro: text(2000),
  startDate: Joi.date().allow(null, ""),
  nights: Joi.number().integer().min(0).max(60),
  adults: Joi.number().integer().min(0).max(100),
  children: Joi.number().integer().min(0).max(100),
  items: Joi.array()
    .max(80)
    .items(
      Joi.object({
        category: Joi.string()
          .valid(...Quote.ITEM_CATEGORIES)
          .default("other"),
        title: Joi.string().trim().min(1).max(200).required(),
        details: text(300),
        rooms: Joi.number().integer().min(0).max(500).allow(null),
        nights: Joi.number().integer().min(0).max(60).allow(null),
        quantity: Joi.number().min(0).max(10000).default(1),
        unitPrice: Joi.number().min(0).max(100000000).default(0),
      })
    ),
  itinerary: Joi.array()
    .max(60)
    .items(
      Joi.object({
        day: Joi.number().integer().min(1).max(60),
        title: text(200),
        description: text(2000),
        meals: Joi.array().items(Joi.string().max(40)).max(5),
      })
    ),
  inclusions: Joi.array().items(Joi.string().trim().max(300)).max(40),
  exclusions: Joi.array().items(Joi.string().trim().max(300)).max(40),
  markupPercent: Joi.number().min(0).max(200),
  discount: Joi.number().min(0).max(100000000),
  taxPercent: Joi.number().min(0).max(28),
  showItemPrices: Joi.boolean(),
  notes: text(3000),
  terms: text(5000),
  validUntil: Joi.date().allow(null, ""),
});

const clean = (value) => {
  const out = { ...value };
  ["enquiry", "package", "startDate", "validUntil"].forEach((k) => {
    if (out[k] === "") out[k] = null;
  });
  return out;
};

const validateBody = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details.map((d) => d.message),
    });
  }
  req.body = clean(value);
  return next();
};

const author = (req) => req.user?.user?.email || "admin";
const validId = (req, res, next) =>
  mongoose.isValidObjectId(req.params.id)
    ? next()
    : errorResponse(res, ApiErrors.badRequest("Invalid ID format"), req.id);

const sendPdf = async (res, quote, inline) => {
  const { company, site } = await quoteService.getCompany();
  const pdf = await buildQuotePdf(quote, company, {
    publicUrl: quoteService.publicUrl(quote, site),
  });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `${inline ? "inline" : "attachment"}; filename="${quote.number}.pdf"`
  );
  res.setHeader("Cache-Control", "private, no-store");
  return res.send(pdf);
};

/* ── Public (customer link) — defined before /:id ─────────────── */

// GET /api/v1/quotes/public/:token   (?preview=1 from admin skips view tracking)
router.get("/public/:token", async (req, res) => {
  try {
    const quote = await quoteService.getByToken(req.params.token, {
      track: req.query.preview !== "1",
    });
    if (!quote) return errorResponse(res, ApiErrors.notFound("Quote"), req.id);
    const { company } = await quoteService.getCompany();
    res.set("Cache-Control", "private, no-store");
    res.set("X-Robots-Tag", "noindex");
    return successResponse(res, { ...quoteService.toPublic(quote), company });
  } catch (error) {
    logger.error("Public quote error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to load quote"), req.id);
  }
});

router.get("/public/:token/pdf", async (req, res) => {
  try {
    const quote = await quoteService.getByToken(req.params.token);
    if (!quote) return errorResponse(res, ApiErrors.notFound("Quote"), req.id);
    return sendPdf(res, quote, req.query.inline === "1");
  } catch (error) {
    logger.error("Public quote PDF error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to create PDF"), req.id);
  }
});

const respondSchema = Joi.object({
  action: Joi.string().valid("accept", "decline").required(),
  note: Joi.string().trim().max(1000).allow(""),
});

router.post("/public/:token/respond", validateBody(respondSchema), async (req, res) => {
  try {
    const result = await quoteService.respond(req.params.token, req.body);
    if (result.error === "not_found")
      return errorResponse(res, ApiErrors.notFound("Quote"), req.id);
    if (result.error === "already_answered") {
      return errorResponse(res, ApiErrors.conflict("This quote has already been answered"), req.id);
    }
    if (result.error === "expired") {
      return errorResponse(
        res,
        ApiErrors.badRequest("This quote has expired — please ask us for an updated one"),
        req.id
      );
    }
    return successResponse(res, quoteService.toPublic(result.quote));
  } catch (error) {
    logger.error("Quote respond error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to record your response"), req.id);
  }
});

/* ── Admin ───────────────────────────────────────────────────── */

// GET /api/v1/quotes?enquiry=<id>&status=sent
router.get("/", auth, async (req, res) => {
  try {
    const enquiry = mongoose.isValidObjectId(req.query.enquiry) ? req.query.enquiry : undefined;
    const status = Quote.QUOTE_STATUSES.includes(req.query.status) ? req.query.status : undefined;
    const result = await quoteService.list({ enquiry, status });
    res.set("Cache-Control", "private, no-store");
    return successResponse(res, result);
  } catch (error) {
    logger.error("List quotes error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to load quotes"), req.id);
  }
});

// GET /api/v1/quotes/draft?enquiry=<id>&package=<id> — prefilled values for the builder
router.get("/draft", auth, async (req, res) => {
  try {
    const draft = await quoteService.draftFrom({
      enquiryId: mongoose.isValidObjectId(req.query.enquiry) ? req.query.enquiry : null,
      packageId: mongoose.isValidObjectId(req.query.package) ? req.query.package : null,
    });
    return successResponse(res, draft);
  } catch (error) {
    logger.error("Quote draft error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to prepare quote"), req.id);
  }
});

router.get("/:id", auth, validId, async (req, res) => {
  try {
    const quote = await quoteService.get(req.params.id);
    if (!quote) return errorResponse(res, ApiErrors.notFound("Quote"), req.id);
    const { site } = await quoteService.getCompany();
    return successResponse(res, { ...quote, publicUrl: quoteService.publicUrl(quote, site) });
  } catch (error) {
    logger.error("Get quote error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to load quote"), req.id);
  }
});

router.get("/:id/pdf", auth, validId, async (req, res) => {
  try {
    const quote = await quoteService.get(req.params.id);
    if (!quote) return errorResponse(res, ApiErrors.notFound("Quote"), req.id);
    return sendPdf(res, quote, req.query.inline === "1");
  } catch (error) {
    logger.error("Quote PDF error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to create PDF"), req.id);
  }
});

router.post("/", auth, validateBody(quoteSchema), async (req, res) => {
  try {
    const quote = await quoteService.create(req.body, author(req));
    logAudit(req, "CREATE", "quote", quote._id, { number: quote.number });
    return successResponse(res, quote, 201, { message: "Quote saved" });
  } catch (error) {
    logger.error("Create quote error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to save quote"), req.id);
  }
});

router.put("/:id", auth, validId, validateBody(quoteSchema), async (req, res) => {
  try {
    const quote = await quoteService.update(req.params.id, req.body);
    if (!quote) return errorResponse(res, ApiErrors.notFound("Quote"), req.id);
    logAudit(req, "UPDATE", "quote", req.params.id, { number: quote.number });
    return successResponse(res, quote, 200, { message: "Quote saved" });
  } catch (error) {
    logger.error("Update quote error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to save quote"), req.id);
  }
});

router.post("/:id/send", auth, validId, async (req, res) => {
  try {
    const quote = await quoteService.markSent(req.params.id, author(req));
    if (!quote) return errorResponse(res, ApiErrors.notFound("Quote"), req.id);
    const { site } = await quoteService.getCompany();
    logAudit(req, "SEND", "quote", req.params.id, { number: quote.number });
    return successResponse(res, { ...quote, publicUrl: quoteService.publicUrl(quote, site) });
  } catch (error) {
    logger.error("Send quote error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to mark quote as sent"), req.id);
  }
});

router.post("/:id/duplicate", auth, validId, async (req, res) => {
  try {
    const quote = await quoteService.duplicate(req.params.id, author(req));
    if (!quote) return errorResponse(res, ApiErrors.notFound("Quote"), req.id);
    return successResponse(res, quote, 201, { message: "Quote duplicated" });
  } catch (error) {
    logger.error("Duplicate quote error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to duplicate quote"), req.id);
  }
});

router.delete("/:id", auth, validId, async (req, res) => {
  try {
    const removed = await quoteService.remove(req.params.id);
    if (!removed) return errorResponse(res, ApiErrors.notFound("Quote"), req.id);
    logAudit(req, "DELETE", "quote", req.params.id);
    return successResponse(res, null, 200, { message: "Quote deleted" });
  } catch (error) {
    logger.error("Delete quote error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to delete quote"), req.id);
  }
});

module.exports = router;
