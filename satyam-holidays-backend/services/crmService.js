const Enquiry = require("../models/Enquiry");
const logger = require("../utils/logger");

class CrmService {
  /**
   * Calculate estimated monetary value for an enquiry
   */
  getEstimatedValue(enquiry) {
    const budgetMap = {
      "under-20k": 15000,
      "20k-50k": 35000,
      "50k-1l": 75000,
      "above-1l": 150000,
    };
    const travelersMap = {
      1: 1,
      2: 2,
      3: 3,
      4: 4,
      "5+": 5,
    };

    const multiplier = travelersMap[enquiry.travelers] || 2;
    const baseValue = budgetMap[enquiry.budget] || 35000;
    return baseValue * multiplier;
  }

  /**
   * Get aggregated pipeline analytics and statistics
   */
  async getAnalytics() {
    try {
      const enquiries = await Enquiry.find({}).lean();
      const total = enquiries.length;

      if (total === 0) {
        return {
          totalEnquiries: 0,
          statusBreakdown: { pending: 0, contacted: 0, confirmed: 0, cancelled: 0 },
          conversionRate: 0,
          activePipelineValue: 0,
          wonPipelineValue: 0,
          lostPipelineValue: 0,
          slaStats: { withinSla: 0, warning: 0, breached: 0, averageResponseMinutes: 0 },
          destinationBreakdown: {},
        };
      }

      const statusBreakdown = { pending: 0, contacted: 0, confirmed: 0, cancelled: 0 };
      const destinationBreakdown = {};

      let activePipelineValue = 0; // pending + contacted
      let wonPipelineValue = 0; // confirmed
      let lostPipelineValue = 0; // cancelled

      let slaWithin = 0;
      let slaWarning = 0;
      let slaBreached = 0;

      let totalResponseTimeMs = 0;
      let responseCount = 0;

      for (const enq of enquiries) {
        // Status count
        const status = enq.status || "pending";
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;

        // Destination count
        const dest = enq.destination || "custom";
        destinationBreakdown[dest] = (destinationBreakdown[dest] || 0) + 1;

        // Value calculation
        const estValue = this.getEstimatedValue(enq);
        if (status === "pending" || status === "contacted") {
          activePipelineValue += estValue;
        } else if (status === "confirmed") {
          wonPipelineValue += estValue;
        } else if (status === "cancelled") {
          lostPipelineValue += estValue;
        }

        // SLA calculation
        if (enq.respondedAt && enq.createdAt) {
          totalResponseTimeMs += new Date(enq.respondedAt) - new Date(enq.createdAt);
          responseCount++;
        }

        if (enq.slaStatus === "sla_breached") {
          slaBreached++;
        } else if (enq.slaStatus === "sla_warning") {
          slaWarning++;
        } else {
          slaWithin++;
        }
      }

      const conversionRate = total > 0 ? ((statusBreakdown.confirmed / total) * 100).toFixed(1) : 0;
      const averageResponseMinutes =
        responseCount > 0 ? Math.round(totalResponseTimeMs / responseCount / (1000 * 60)) : 0;

      return {
        totalEnquiries: total,
        statusBreakdown,
        conversionRate: parseFloat(conversionRate),
        activePipelineValue,
        wonPipelineValue,
        lostPipelineValue,
        slaStats: {
          withinSla: slaWithin,
          warning: slaWarning,
          breached: slaBreached,
          averageResponseMinutes,
        },
        destinationBreakdown,
      };
    } catch (error) {
      logger.error(`[crmService] Failed to calculate CRM analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export enquiries in CSV format based on search filters
   */
  async exportCsv(filters = {}) {
    try {
      const query = {};
      if (filters.status) query.status = filters.status;
      if (filters.destination) query.destination = filters.destination;
      if (filters.leadScoreMin) query.leadScore = { $gte: parseInt(filters.leadScoreMin) };

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      const enquiries = await Enquiry.find(query).sort({ createdAt: -1 }).lean();

      const headers = [
        "Enquiry ID",
        "Created Date",
        "Name",
        "Email",
        "Phone",
        "Destination",
        "Travel Date",
        "Travelers",
        "Budget",
        "Status",
        "Lead Score",
        "SLA Status",
        "Responded Date",
        "Visa Requested",
        "Travel Insurance",
        "Estimated Value (INR)",
        "Referral Used",
      ];

      const rows = enquiries.map((enq) => {
        const value = this.getEstimatedValue(enq);
        return [
          enq._id.toString(),
          enq.createdAt ? new Date(enq.createdAt).toISOString() : "",
          enq.name || "",
          enq.email || "",
          enq.phone || "",
          enq.destination || "",
          enq.travelDate ? new Date(enq.travelDate).toISOString().split("T")[0] : "",
          enq.travelers || "",
          enq.budget || "",
          enq.status || "",
          enq.leadScore || 0,
          enq.slaStatus || "within_sla",
          enq.respondedAt ? new Date(enq.respondedAt).toISOString() : "",
          enq.visaRequired ? "Yes" : "No",
          enq.travelInsurance ? "Yes" : "No",
          value,
          enq.referralCodeUsed || "",
        ];
      });

      // Helper to escape values for CSV
      const escapeCsv = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvContent = [
        headers.map(escapeCsv).join(","),
        ...rows.map((row) => row.map(escapeCsv).join(",")),
      ].join("\n");

      return csvContent;
    } catch (error) {
      logger.error(`[crmService] Failed to export CRM CSV: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new CrmService();
