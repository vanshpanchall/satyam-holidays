const Enquiry = require("../models/Enquiry");
const logger = require("../utils/logger");

const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN_STATUSES = ["pending", "contacted"];
// leadScore ranges ~10-170 (see models/Enquiry.js)
const HOT_SCORE = 90;
const WARM_SCORE = 60;

const round1 = (n) => Math.round(n * 10) / 10;
const oldestDate = (list) =>
  list.reduce(
    (min, e) => (e.createdAt && new Date(e.createdAt) < min ? new Date(e.createdAt) : min),
    new Date()
  );

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/**
 * Bucket enquiries into a continuous time series (empty buckets included so charts don't skip days).
 * Granularity adapts to the range: daily up to ~5 weeks, weekly up to ~4 months, monthly beyond.
 */
function buildSeries(list, from, to, forced) {
  const rangeDays = Math.max(1, Math.ceil((to - from) / DAY_MS));
  const unit = forced || (rangeDays <= 35 ? "day" : rangeDays <= 120 ? "week" : "month");

  const bucketStart = (date) => {
    const d = startOfDay(date);
    if (unit === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
    if (unit === "month") d.setDate(1);
    return d;
  };
  const next = (d) => {
    const n = new Date(d);
    if (unit === "day") n.setDate(n.getDate() + 1);
    else if (unit === "week") n.setDate(n.getDate() + 7);
    else n.setMonth(n.getMonth() + 1);
    return n;
  };

  const buckets = new Map();
  for (let d = bucketStart(from); d <= to; d = next(d)) {
    buckets.set(d.getTime(), { start: d.toISOString(), received: 0, confirmed: 0 });
  }
  for (const e of list) {
    if (!e.createdAt) continue;
    const bucket = buckets.get(bucketStart(e.createdAt).getTime());
    if (!bucket) continue;
    bucket.received += 1;
    if (e.status === "confirmed") bucket.confirmed += 1;
  }
  return { unit, points: [...buckets.values()] };
}

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
   * Period report for the CRM screen. `days` = 0 means all time.
   * KPIs come with the same-length previous period for comparison.
   */
  async getReport({ days = 30 } = {}) {
    const now = new Date();
    const span = Math.max(0, Number(days) || 0);
    const since = span ? new Date(now.getTime() - span * DAY_MS) : null;
    const prevSince = span ? new Date(since.getTime() - span * DAY_MS) : null;

    const fields =
      "name phone email destination budget travelers status leadScore slaStatus respondedAt createdAt followUpDate source";
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const [current, previous, openLeads, followUpsDue] = await Promise.all([
      Enquiry.find(since ? { createdAt: { $gte: since } } : {})
        .select(fields)
        .lean(),
      span
        ? Enquiry.find({ createdAt: { $gte: prevSince, $lt: since } })
            .select(fields)
            .lean()
        : Promise.resolve([]),
      Enquiry.find({ status: { $in: OPEN_STATUSES } })
        .sort({ leadScore: -1, createdAt: -1 })
        .limit(8)
        .select(fields)
        .lean(),
      Enquiry.countDocuments({
        status: { $in: OPEN_STATUSES },
        followUpDate: { $lte: endOfToday },
      }),
    ]);

    const summarise = (list) => {
      const confirmed = list.filter((e) => e.status === "confirmed");
      const responded = list.filter((e) => e.respondedAt && e.createdAt);
      const responseMs = responded.reduce(
        (sum, e) => sum + (new Date(e.respondedAt) - new Date(e.createdAt)),
        0
      );
      return {
        enquiries: list.length,
        confirmed: confirmed.length,
        conversionRate: list.length ? round1((confirmed.length / list.length) * 100) : 0,
        wonValue: confirmed.reduce((sum, e) => sum + this.getEstimatedValue(e), 0),
        pipelineValue: list
          .filter((e) => OPEN_STATUSES.includes(e.status))
          .reduce((sum, e) => sum + this.getEstimatedValue(e), 0),
        avgResponseMinutes: responded.length
          ? Math.round(responseMs / responded.length / 60000)
          : null,
        slaBreachRate: list.length
          ? round1((list.filter((e) => e.slaStatus === "sla_breached").length / list.length) * 100)
          : 0,
      };
    };

    const group = (list, keyFn) => {
      const map = new Map();
      for (const e of list) {
        const key = keyFn(e) || "unknown";
        const row = map.get(key) || { key, enquiries: 0, confirmed: 0, value: 0 };
        row.enquiries += 1;
        if (e.status === "confirmed") {
          row.confirmed += 1;
          row.value += this.getEstimatedValue(e);
        }
        map.set(key, row);
      }
      return [...map.values()]
        .map((r) => ({
          ...r,
          conversionRate: r.enquiries ? round1((r.confirmed / r.enquiries) * 100) : 0,
        }))
        .sort((a, b) => b.enquiries - a.enquiries);
    };

    const statusBreakdown = { pending: 0, contacted: 0, confirmed: 0, cancelled: 0 };
    current.forEach((e) => {
      const key = e.status || "pending";
      statusBreakdown[key] = (statusBreakdown[key] || 0) + 1;
    });

    const score = (e) => e.leadScore || 0;

    return {
      period: { days: span, since, until: now },
      kpis: summarise(current),
      previous: span ? summarise(previous) : null,
      series: buildSeries(current, since || oldestDate(current), now),
      statusBreakdown,
      funnel: [
        { stage: "Enquiries", count: current.length },
        { stage: "Contacted", count: statusBreakdown.contacted + statusBreakdown.confirmed },
        { stage: "Confirmed", count: statusBreakdown.confirmed },
      ],
      byDestination: group(current, (e) => e.destination),
      byBudget: group(current, (e) => e.budget),
      byTravellers: group(current, (e) => e.travelers),
      bySource: group(current, (e) => e.source || "website"),
      leadQuality: {
        hot: current.filter((e) => score(e) >= HOT_SCORE).length,
        warm: current.filter((e) => score(e) >= WARM_SCORE && score(e) < HOT_SCORE).length,
        cold: current.filter((e) => score(e) < WARM_SCORE).length,
      },
      hotLeads: openLeads.map((e) => ({ ...e, estimatedValue: this.getEstimatedValue(e) })),
      followUpsDue,
    };
  }

  /**
   * Everything the admin dashboard needs in one request.
   */
  async getDashboard() {
    const Package = require("../models/Package");
    const Review = require("../models/Review");
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * DAY_MS);
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
    const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS);
    const slaCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const listFields =
      "name phone email destination status leadScore createdAt followUpDate budget travelers";
    const [
      lastMonth,
      thisWeek,
      lastWeek,
      pending,
      waitingTooLong,
      followUps,
      recent,
      reviewsPending,
      packages,
    ] = await Promise.all([
      Enquiry.find({ createdAt: { $gte: monthAgo } })
        .select("status destination createdAt budget travelers")
        .lean(),
      Enquiry.countDocuments({ createdAt: { $gte: weekAgo } }),
      Enquiry.countDocuments({ createdAt: { $gte: twoWeeksAgo, $lt: weekAgo } }),
      Enquiry.countDocuments({ status: "pending" }),
      Enquiry.find({ status: "pending", createdAt: { $lt: slaCutoff } })
        .sort({ createdAt: 1 })
        .limit(5)
        .select(listFields)
        .lean(),
      Enquiry.find({ status: { $in: OPEN_STATUSES }, followUpDate: { $lte: endOfToday } })
        .sort({ followUpDate: 1 })
        .limit(5)
        .select(listFields)
        .lean(),
      Enquiry.find({}).sort({ createdAt: -1 }).limit(6).select(listFields).lean(),
      Review.countDocuments({ status: "pending" }),
      Package.find({}).select("isActive isFeatured availableDates").lean(),
    ]);

    const confirmed = lastMonth.filter((e) => e.status === "confirmed");
    const destinations = {};
    lastMonth.forEach((e) => {
      const key = e.destination || "custom";
      destinations[key] = (destinations[key] || 0) + 1;
    });

    const upcomingDepartures = packages.reduce(
      (sum, p) =>
        sum +
        (p.availableDates || []).filter(
          (d) => new Date(d.startDate) >= now && d.status !== "sold_out"
        ).length,
      0
    );

    return {
      kpis: {
        newThisWeek: thisWeek,
        newLastWeek: lastWeek,
        pending,
        conversionRate30d: lastMonth.length
          ? round1((confirmed.length / lastMonth.length) * 100)
          : 0,
        wonValue30d: confirmed.reduce((sum, e) => sum + this.getEstimatedValue(e), 0),
        reviewsPending,
      },
      packages: {
        total: packages.length,
        published: packages.filter((p) => p.isActive !== false).length,
        drafts: packages.filter((p) => p.isActive === false).length,
        featured: packages.filter((p) => p.isFeatured).length,
        upcomingDepartures,
      },
      series: buildSeries(lastMonth, monthAgo, now, "day"),
      topDestinations: Object.entries(destinations)
        .map(([destination, count]) => ({ destination, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
      attention: { waitingTooLong, followUps },
      recent,
    };
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
