const Enquiry = require("../models/Enquiry");
const sendEmail = require("../utils/email");
const { sendEnquiryThankYou } = require("../utils/whatsapp");
const cacheService = require("../utils/cache");
const socketManager = require("../utils/socketManager");
const logger = require("../utils/logger");

class EnquiryService {
  async createEnquiry(enquiryData, ipAddress, userAgent) {
    // Create enquiry
    const enquiry = new Enquiry({
      ...enquiryData,
      ipAddress,
      userAgent,
    });

    await enquiry.save();

    // Invalidate cache
    await cacheService.invalidateEnquiries();

    // Emit real-time event to admin dashboard
    socketManager.emitNewEnquiry(enquiry);

    // Send email notification
    try {
      await sendEmail.sendAdminNotification(enquiry);
      await sendEmail.sendCustomerConfirmation(enquiry);
    } catch (emailError) {
      logger.error("Email sending failed", { error: emailError.message, enquiryId: enquiry._id });
      // Don't fail the request if email fails
    }

    // Send WhatsApp thank you (if enabled via env)
    try {
      if (process.env.WHATSAPP_ENABLE === "true") {
        await sendEnquiryThankYou(enquiry);
      } else {
        logger.info("[whatsapp] Disabled; not sending thank-you message");
      }
    } catch (whatsappError) {
      logger.error("WhatsApp sending failed", {
        error: whatsappError.message,
        enquiryId: enquiry._id,
      });
      // Don't fail the request if WhatsApp fails
    }

    return enquiry;
  }

  async getEnquiries(filter = {}, options = {}) {
    const { cursor, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = options;

    // Check cache first
    const cacheKey = { filter, cursor, limit, sortBy, sortOrder };
    const cached = await cacheService.getEnquiries(cacheKey);
    if (cached) {
      return cached;
    }

    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    // Add cursor condition for pagination
    const queryFilter = { ...filter };
    if (cursor) {
      const cursorDoc = await Enquiry.findById(cursor);
      if (cursorDoc) {
        const cursorValue = cursorDoc[sortBy];
        const operator = sortOrder === "desc" ? "$lt" : "$gt";
        queryFilter[sortBy] = { [operator]: cursorValue };
      }
    }

    const enquiries = await Enquiry.find(queryFilter)
      .sort(sort)
      .limit(limit + 1) // Get one extra to check if there are more
      .select("-__v")
      .lean();

    const hasNextPage = enquiries.length > limit;
    const data = hasNextPage ? enquiries.slice(0, -1) : enquiries;
    const nextCursor = hasNextPage ? data[data.length - 1]._id.toString() : null;

    const total = await Enquiry.countDocuments(filter);

    const result = {
      data,
      pagination: {
        hasNextPage,
        nextCursor,
        limit,
        totalItems: total,
      },
    };

    // Cache the result
    await cacheService.setEnquiries(cacheKey, result);

    return result;
  }

  async getEnquiryById(id) {
    return await Enquiry.findById(id);
  }

  async updateEnquiryStatus(id, status) {
    const enquiry = await Enquiry.findByIdAndUpdate(id, { status }, { new: true });

    if (enquiry) {
      // Invalidate cache
      await cacheService.invalidateEnquiries();
      // Emit real-time update
      socketManager.emitEnquiryUpdate(enquiry);
    }

    return enquiry;
  }

  async getEnquiryStats() {
    const stats = await Enquiry.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          contacted: {
            $sum: { $cond: [{ $eq: ["$status", "contacted"] }, 1, 0] },
          },
          confirmed: {
            $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
        },
      },
    ]);

    const destinationStats = await Enquiry.aggregate([
      {
        $group: {
          _id: "$destination",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const monthlyStats = await Enquiry.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
    ]);

    return {
      overview: stats[0] || {
        total: 0,
        pending: 0,
        contacted: 0,
        confirmed: 0,
        cancelled: 0,
      },
      destinations: destinationStats,
      monthly: monthlyStats,
    };
  }

  async getEnquiriesForExport(filter = {}) {
    return await Enquiry.find(filter).sort({ createdAt: -1 }).lean();
  }

  // Analytics methods
  async getConversionRates() {
    const total = await Enquiry.countDocuments();
    const confirmed = await Enquiry.countDocuments({ status: "confirmed" });
    const contacted = await Enquiry.countDocuments({ status: "contacted" });

    return {
      total,
      confirmed,
      contacted,
      conversionRate: total > 0 ? ((confirmed / total) * 100).toFixed(2) : 0,
      contactRate: total > 0 ? ((contacted / total) * 100).toFixed(2) : 0,
    };
  }

  async getPopularDestinations(limit = 10) {
    return await Enquiry.aggregate([
      {
        $group: {
          _id: "$destination",
          count: { $sum: 1 },
          confirmed: {
            $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
          },
        },
      },
      {
        $addFields: {
          conversionRate: {
            $cond: {
              if: { $gt: ["$count", 0] },
              then: { $multiply: [{ $divide: ["$confirmed", "$count"] }, 100] },
              else: 0,
            },
          },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
  }
}

module.exports = new EnquiryService();
