const mongoose = require("mongoose");

/**
 * Private credentials for third-party connections (e.g. the Instagram access token).
 * Deliberately separate from Setting, whose values are served publicly by GET /api/settings.
 */
const integrationSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    accessToken: { type: String, select: false },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Integration", integrationSchema);
