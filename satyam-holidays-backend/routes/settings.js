const express = require("express");
const router = express.Router();
const settingService = require("../services/settingService");
const auth = require("../middleware/auth");
const logger = require("../utils/logger");

// GET /api/settings — public (frontend reads on load)
router.get("/", async (_req, res) => {
  try {
    const settings = await settingService.getAll();
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error("Get settings error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch settings" });
  }
});

// PUT /api/settings — admin only (bulk upsert)
router.put("/", auth, async (req, res) => {
  try {
    const settings = req.body;
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return res.status(400).json({ success: false, message: "Invalid settings payload" });
    }

    const updated = await settingService.bulkUpsert(settings);
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error("Update settings error:", error);
    res.status(500).json({ success: false, message: "Failed to update settings" });
  }
});

module.exports = router;
