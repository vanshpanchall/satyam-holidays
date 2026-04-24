const express = require("express");
const router = express.Router();
const enquiryService = require("../services/enquiryService");
const generateExcel = require("../utils/excel");
const auth = require("../middleware/auth");
const Joi = require("joi");
const logger = require("../utils/logger");
const { ApiErrors, successResponse, errorResponse } = require("../utils/apiResponse");
const { logAudit } = require("../utils/auditLogger");

// Validation schema
const enquirySchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  email: Joi.string().email().required(),
  phone: Joi.string()
    .required()
    .custom((value, helpers) => {
      const digits = String(value || "").replace(/\D/g, "");
      if (digits.length < 10) {
        return helpers.error("any.invalid", { message: "Phone must have at least 10 digits" });
      }
      return value;
    }, "phone digits validation"),
  destination: Joi.string().valid(
    "domestic",
    "international",
    "chardham",
    "kashmir",
    "dubai",
    "singapore",
    "thailand",
    "vietnam",
    "nepal",
    "andaman",
    "custom"
  ),
  travelDate: Joi.date().optional(),
  travelers: Joi.string().valid("1", "2", "3", "4", "5+"),
  budget: Joi.string().valid("under-20k", "20k-50k", "50k-1l", "above-1l"),
  message: Joi.string().max(1000).optional(),
});

// Create new enquiry
router.post("/", async (req, res) => {
  try {
    // Verify CAPTCHA (must be enforced in production)
    const isProd = (process.env.NODE_ENV || "development") === "production";
    const provider = (process.env.CAPTCHA_PROVIDER || "recaptcha_v2").toLowerCase();
    const enforce = process.env.CAPTCHA_ENFORCE === "true";
    const isSupportedProvider = provider.startsWith("hcaptcha") || provider.startsWith("recaptcha");

    if (isProd && !enforce) {
      logger.error("CAPTCHA_ENFORCE is false in production. Blocking enquiry submission.");
      return res.status(503).json({
        success: false,
        message: "Server configuration error: CAPTCHA must be enforced in production",
      });
    }

    if (enforce && !isSupportedProvider) {
      logger.error("Unsupported CAPTCHA provider", { provider });
      return res.status(503).json({
        success: false,
        message: "Server configuration error: unsupported CAPTCHA provider",
      });
    }

    const secret = provider.startsWith("hcaptcha")
      ? process.env.HCAPTCHA_SECRET
      : process.env.RECAPTCHA_SECRET;

    if (enforce && !secret) {
      logger.error("CAPTCHA is enforced but provider secret is missing", { provider });
      return res.status(503).json({
        success: false,
        message: "Server configuration error: CAPTCHA secret is missing",
      });
    }

    const minScore = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5);
    const shouldVerifyCaptcha = enforce;

    if (shouldVerifyCaptcha) {
      const token = req.body?.captchaToken || req.body?.recaptchaToken || req.body?.hcaptchaToken;
      if (!token) {
        return res.status(400).json({
          success: false,
          message: "CAPTCHA verification failed: token missing",
        });
      }
      try {
        const params = new URLSearchParams();
        params.append("secret", secret);
        params.append("response", token);
        if (req.ip) params.append("remoteip", req.ip);
        const _fetch = global.fetch;
        if (typeof _fetch !== "function") {
          logger.error("Global fetch unavailable for CAPTCHA verification");
          return res.status(503).json({
            success: false,
            message: "Server configuration error: fetch API unavailable",
          });
        }
        const verifyUrl = provider.startsWith("hcaptcha")
          ? "https://hcaptcha.com/siteverify"
          : "https://www.google.com/recaptcha/api/siteverify";
        const resp = await _fetch(verifyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params,
        });
        const result = await resp.json();
        // For v2/hCaptcha, 'success' is enough; for v3 you may also check 'score' and 'action'
        if (!result.success) {
          return res.status(400).json({
            success: false,
            message: "CAPTCHA verification failed",
          });
        }
        if (provider === "recaptcha_v3" && typeof result.score === "number") {
          if (result.score < minScore) {
            return res.status(400).json({
              success: false,
              message: "CAPTCHA score too low",
            });
          }
        }
      } catch (captchaErr) {
        logger.error("CAPTCHA verify error:", captchaErr);
        return res.status(400).json({
          success: false,
          message: "CAPTCHA verification error",
        });
      }
    }

    // Validate input (coerce types, strip unknown, gather all issues)
    const { error, value } = enquirySchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      logger.warn(
        "[enquiry:validation]",
        error.details?.map((d) => d.message)
      );
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details.map((detail) => detail.message),
      });
    }

    // Create enquiry using service
    const enquiry = await enquiryService.createEnquiry(value, req.ip, req.get("User-Agent"));

    res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully! We will get back to you soon.",
      data: {
        id: enquiry._id,
        name: enquiry.name,
        email: enquiry.email,
      },
    });
  } catch (error) {
    logger.error("Enquiry creation error:", error);
    return errorResponse(
      res,
      ApiErrors.internal("Failed to submit enquiry. Please try again."),
      req.id
    );
  }
});

// Get all enquiries (admin only) with cursor-based pagination
router.get("/", auth, async (req, res) => {
  try {
    const {
      cursor,
      limit = 10,
      status,
      destination,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (destination) filter.destination = destination;

    // Validate and coerce query params
    const { value: parsed } = Joi.object({
      cursor: Joi.string().optional(),
      limit: Joi.number().integer().min(1).max(100).default(10),
      status: Joi.string().valid("pending", "contacted", "confirmed", "cancelled").optional(),
      destination: Joi.string().optional(),
      sortBy: Joi.string().valid("createdAt", "status", "destination").default("createdAt"),
      sortOrder: Joi.string().valid("asc", "desc").default("desc"),
    })
      .prefs({ convert: true })
      .validate({ cursor, limit, status, destination, sortBy, sortOrder });

    const result = await enquiryService.getEnquiries(filter, parsed);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error("Get enquiries error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to fetch enquiries"), req.id);
  }
});

// IMPORTANT: Static routes must be defined BEFORE dynamic /:id routes
// Export enquiries to Excel
router.get("/export/excel", auth, async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    // Build filter
    const filter = {};
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    if (status) filter.status = status;

    const enquiries = await enquiryService.getEnquiriesForExport(filter);

    if (enquiries.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No enquiries found for the specified criteria",
      });
    }

    const excelBuffer = await generateExcel(enquiries);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=enquiries-${new Date().toISOString().split("T")[0]}.xlsx`
    );

    res.send(excelBuffer);
  } catch (error) {
    logger.error("Export error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to export enquiries"), req.id);
  }
});

// Get enquiry statistics
router.get("/stats/overview", auth, async (req, res) => {
  try {
    const stats = await enquiryService.getEnquiryStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("Stats error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to fetch statistics"), req.id);
  }
});

// Get enquiry analytics
router.get("/analytics/conversion", auth, async (req, res) => {
  try {
    const analytics = await enquiryService.getConversionRates();

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error("Analytics error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to fetch analytics"), req.id);
  }
});

// Get popular destinations
router.get("/analytics/destinations", auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const destinations = await enquiryService.getPopularDestinations(parseInt(limit));

    res.json({
      success: true,
      data: destinations,
    });
  } catch (error) {
    logger.error("Destinations analytics error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to fetch destination analytics"), req.id);
  }
});

// Get enquiry by ID (must be after all static routes to avoid matching "export", "stats", "analytics" as IDs)
router.get("/:id", auth, async (req, res) => {
  try {
    const enquiry = await enquiryService.getEnquiryById(req.params.id);

    if (!enquiry) {
      return errorResponse(res, ApiErrors.notFound("Enquiry"), req.id);
    }

    return successResponse(res, enquiry);
  } catch (error) {
    logger.error("Get enquiry error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to fetch enquiry"), req.id);
  }
});

// Update enquiry status
router.patch("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["pending", "contacted", "confirmed", "cancelled"].includes(status)) {
      return errorResponse(res, ApiErrors.badRequest("Invalid status"), req.id);
    }

    const enquiry = await enquiryService.updateEnquiryStatus(req.params.id, status);

    if (!enquiry) {
      return errorResponse(res, ApiErrors.notFound("Enquiry"), req.id);
    }

    logAudit(req, "UPDATE_STATUS", "enquiry", req.params.id, { status });
    return successResponse(res, enquiry, 200, { message: "Status updated successfully" });
  } catch (error) {
    logger.error("Update status error:", error);
    return errorResponse(res, ApiErrors.internal("Failed to update status"), req.id);
  }
});

module.exports = router;
