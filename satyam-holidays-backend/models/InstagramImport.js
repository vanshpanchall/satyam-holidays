const mongoose = require("mongoose");

const IMPORT_STATUSES = ["pending", "processing", "imported", "not_package", "skipped", "failed"];

/** One Instagram post/reel seen by the sync, and what became of it */
const instagramImportSchema = new mongoose.Schema(
  {
    mediaId: { type: String, required: true, unique: true },
    permalink: String,
    mediaType: String, // IMAGE | VIDEO | CAROUSEL_ALBUM
    caption: { type: String, maxlength: 5000 },
    postedAt: Date,
    // Instagram CDN links expire after a while; they are only used while importing
    mediaUrls: { type: [String], default: [] },
    thumbnailUrl: String,

    status: { type: String, enum: IMPORT_STATUSES, default: "pending", index: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
    extracted: { type: mongoose.Schema.Types.Mixed },
    notes: { type: String, maxlength: 2000 }, // what the AI wasn't sure about
    error: { type: String, maxlength: 1000 },
    attempts: { type: Number, default: 0 },
    processedAt: Date,
  },
  { timestamps: true }
);

instagramImportSchema.index({ postedAt: -1 });

const InstagramImport = mongoose.model("InstagramImport", instagramImportSchema);
InstagramImport.IMPORT_STATUSES = IMPORT_STATUSES;
module.exports = InstagramImport;
