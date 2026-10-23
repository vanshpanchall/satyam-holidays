const express = require("express");
const router = express.Router();
const crmService = require("../services/crmService");
const auth = require("../middleware/auth");
const { successResponse, errorResponse } = require("../utils/apiResponse");

// GET /api/v1/crm/analytics - Admin only
router.get("/analytics", auth, async (req, res) => {
  try {
    const analytics = await crmService.getAnalytics();
    return successResponse(res, analytics);
  } catch (error) {
    return errorResponse(res, error, req.id);
  }
});

// GET /api/v1/crm/report?days=30 - period KPIs, trends and breakdowns (days=0 means all time)
router.get("/report", auth, async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 0, 0), 3650);
    const report = await crmService.getReport({ days });
    res.set("Cache-Control", "private, no-store");
    return successResponse(res, report);
  } catch (error) {
    return errorResponse(res, error, req.id);
  }
});

// GET /api/v1/crm/dashboard - one-call summary for the admin home screen
router.get("/dashboard", auth, async (req, res) => {
  try {
    const data = await crmService.getDashboard();
    res.set("Cache-Control", "private, no-store");
    return successResponse(res, data);
  } catch (error) {
    return errorResponse(res, error, req.id);
  }
});

// GET /api/v1/crm/export - Admin only
router.get("/export", auth, async (req, res) => {
  try {
    const csvContent = await crmService.exportCsv(req.query);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=enquiries-export.csv");
    return res.status(200).send(csvContent);
  } catch (error) {
    return errorResponse(res, error, req.id);
  }
});

module.exports = router;
