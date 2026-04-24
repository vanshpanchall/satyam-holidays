const Enquiry = require("../models/Enquiry");
const { sendEnquiryThankYou, sendAdminEnquiryAlert } = require("../utils/whatsapp");
const cacheService = require("../utils/cache");
const socketManager = require("../utils/socketManager");
const logger = require("../utils/logger");
const settingService = require("./settingService");

class EnquiryService {
  async createEnquiry(enquiryData, ipAddress, userAgent) {
    logger.info("Service: createEnquiry invoked", {
      name: enquiryData.name,
      email: enquiryData.email,
    });

    // Create enquiry
    const enquiry = new Enquiry({
      ...enquiryData,
      ipAddress,
      userAgent,
    });

    await enquiry.save();
    logger.info("Service: createEnquiry saved document to database", { id: enquiry._id });

    // Invalidate cache
    await cacheService.invalidateEnquiries();

    // Emit real-time event to admin dashboard
    socketManager.emitNewEnquiry(enquiry);
    logger.info("Service: createEnquiry broadcasted Socket.io real-time event");

    const settings = await settingService.getAll();
    const emailEnabled = settings["notifications.emailEnabled"] !== false;
    const whatsappEnabled =
      process.env.WHATSAPP_ENABLE === "true" && settings["notifications.whatsappEnabled"] !== false;

    if (emailEnabled) {
      try {
        logger.info("Service: createEnquiry queueing email notifications");
        const queueService = require("../utils/queue");
        const adminTo =
          process.env.ADMIN_EMAIL || settings["company.email"] || "satyamholidays19@gmail.com";

        // Queue admin notification
        await queueService.addJob("send-email", {
          to: adminTo,
          template: "enquiry-notification",
          subject: "New enquiry received",
          data: { enquiry },
        });

        // Queue customer confirmation
        if (enquiry.email) {
          await queueService.addJob("send-email", {
            to: enquiry.email,
            template: "enquiry-confirmation",
            subject: "Thank you for your enquiry",
            data: { name: enquiry.name, enquiryId: enquiry._id, enquiry },
          });
        }

        // Schedule automated follow-up in 24 hours if not closed
        await queueService.addJob(
          "send-followup",
          { enquiryId: enquiry._id },
          { nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }
        );
        logger.info("Service: createEnquiry email jobs queued successfully");
      } catch (emailError) {
        logger.error("Queueing emails failed", {
          error: emailError.message,
          enquiryId: enquiry._id,
        });
      }
    }

    if (whatsappEnabled) {
      try {
        logger.info("Service: createEnquiry triggering customer WhatsApp confirmation");
        await sendEnquiryThankYou(enquiry);
      } catch (whatsappError) {
        logger.error("WhatsApp customer msg failed", {
          error: whatsappError.message,
          enquiryId: enquiry._id,
        });
      }
      try {
        logger.info("Service: createEnquiry triggering admin WhatsApp alert");
        await sendAdminEnquiryAlert(enquiry);
      } catch (whatsappError) {
        logger.error("WhatsApp admin alert failed", {
          error: whatsappError.message,
          enquiryId: enquiry._id,
        });
      }
    }

    return enquiry;
  }

  async getEnquiries(filter = {}, options = {}) {
    const { cursor, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = options;
    logger.info("Service: getEnquiries invoked", { filter, cursor, limit, sortBy, sortOrder });

    // Check cache first
    const cacheKey = { filter, cursor, limit, sortBy, sortOrder };
    const cached = await cacheService.getEnquiries(cacheKey);
    if (cached) {
      logger.info("Service: getEnquiries cache HIT", { cacheKey });
      return cached;
    }

    logger.info("Service: getEnquiries cache MISS. Querying database...", { cacheKey });
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
    logger.info("Service: getEnquiries cached new result", { cacheKey });

    return result;
  }

  async getEnquiryById(id) {
    return await Enquiry.findById(id);
  }

  async updateEnquiryStatus(id, status) {
    logger.info("Service: updateEnquiryStatus invoked", { id, status });
    const enquiry = await Enquiry.findByIdAndUpdate(id, { status }, { new: true });

    if (enquiry) {
      // Invalidate cache
      await cacheService.invalidateEnquiries();
      // Emit real-time update
      socketManager.emitEnquiryUpdate(enquiry);
      logger.info(
        "Service: updateEnquiryStatus succeeded and broadcasted Socket.io real-time update",
        { id, status }
      );
    } else {
      logger.warn("Service: updateEnquiryStatus failed, enquiry not found", { id });
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
