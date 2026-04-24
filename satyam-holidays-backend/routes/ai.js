const express = require("express");
const router = express.Router();
const aiService = require("../services/aiService");
const rateLimit = require("express-rate-limit");
const rateLimiterStore = require("../middleware/rateLimiterStore");
const { successResponse, errorResponse } = require("../utils/apiResponse");

const aiGenerationLimiter = rateLimit({
  store: new rateLimiterStore.DistributedRateLimitStore("rl:ai:generate:"),
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many travel plans generated. Please try again in an hour.",
  },
});

router.post("/generate", aiGenerationLimiter, async (req, res) => {
  const { destination, duration, travelers, interests } = req.body;
  if (!destination) {
    return res.status(400).json({ success: false, message: "Destination is required" });
  }

  try {
    const itinerary = await aiService.generateItinerary({
      destination,
      duration,
      travelers,
      interests,
    });
    return successResponse(res, itinerary);
  } catch (error) {
    return errorResponse(res, error, req.id);
  }
});

module.exports = router;
