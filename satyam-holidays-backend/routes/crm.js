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
