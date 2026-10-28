const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const auth = require("../middleware/auth");
const instagram = require("../services/instagramService");
const InstagramImport = require("../models/InstagramImport");
const logger = require("../utils/logger");
const { ApiErrors, ApiError, successResponse, errorResponse } = require("../utils/apiResponse");
const { logAudit } = require("../utils/auditLogger");

// Everything here is admin-only
router.use(auth);

const fail = (res, req, err, fallback) => {
  if (err instanceof instagram.InstagramError) {
    return errorResponse(res, new ApiError(err.message, err.status, "INSTAGRAM_ERROR"), req.id);
  }
  logger.error(`[instagram] ${fallback}`, { error: err.message });
  return errorResponse(res, ApiErrors.internal(fallback), req.id);
};

const validId = (req, res, next) =>
  mongoose.isValidObjectId(req.params.id)
    ? next()
    : errorResponse(res, ApiErrors.badRequest("Invalid ID format"), req.id);

router.get("/status", async (req, res) => {
  try {
    res.set("Cache-Control", "private, no-store");
    return successResponse(res, await instagram.status());
  } catch (err) {
    return fail(res, req, err, "Failed to load Instagram status");
  }
});

router.post("/connect", async (req, res) => {
  try {
    const account = await instagram.connect(req.body?.accessToken);
    logAudit(req, "CONNECT", "instagram", account.igUserId, { username: account.username });
    return successResponse(res, account, 200, { message: `Connected @${account.username}` });
  } catch (err) {
    return fail(res, req, err, "Failed to connect Instagram");
  }
});

router.delete("/connect", async (req, res) => {
  try {
    await instagram.disconnect();
    logAudit(req, "DISCONNECT", "instagram", null);
    return successResponse(res, null, 200, { message: "Instagram disconnected" });
  } catch (err) {
    return fail(res, req, err, "Failed to disconnect Instagram");
  }
});

// POST /sync { limit } — list recent posts and queue new ones (processing is a separate call)
router.post("/sync", async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.body?.limit, 10) || 25, 1), 100);
    const result = await instagram.sync({ limit });
    return successResponse(res, result);
  } catch (err) {
    return fail(res, req, err, "Failed to sync Instagram");
  }
});

router.get("/imports", async (req, res) => {
  try {
    const status = InstagramImport.IMPORT_STATUSES.includes(req.query.status)
      ? req.query.status
      : undefined;
    res.set("Cache-Control", "private, no-store");
    return successResponse(res, await instagram.listImports({ status }));
  } catch (err) {
    return fail(res, req, err, "Failed to load imports");
  }
});

// POST /imports/:id/process — read one post with AI and create a draft package
router.post("/imports/:id/process", validId, async (req, res) => {
  try {
    const result = await instagram.processImport(req.params.id);
    if (result.status === "imported") {
      logAudit(req, "IMPORT", "package", result.package, {
        from: "instagram",
        mediaId: result.mediaId,
      });
    }
    return successResponse(res, result);
  } catch (err) {
    return fail(res, req, err, "Failed to import post");
  }
});

// PATCH /imports/:id { status: "skipped" | "pending" } — ignore a post, or put it back in the queue
router.patch("/imports/:id", validId, async (req, res) => {
  try {
    const status = req.body?.status;
    if (!["skipped", "pending"].includes(status)) {
      return errorResponse(res, ApiErrors.badRequest("Status must be skipped or pending"), req.id);
    }
    const updated = await instagram.setStatus(req.params.id, status);
    if (!updated) return errorResponse(res, ApiErrors.notFound("Import"), req.id);
    return successResponse(res, updated);
  } catch (err) {
    return fail(res, req, err, "Failed to update import");
  }
});

module.exports = router;
