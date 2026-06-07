import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  FaDownload,
  FaEnvelope,
  FaPhoneAlt,
  FaClock,
  FaExclamationTriangle,
  FaDollarSign,
  FaUsers,
  FaChartBar,
  FaChartPie,
  FaMapMarkerAlt,
  FaTimes,
  FaCalendarAlt,
} from "react-icons/fa";
import { apiUrl, fetchWithAuth, safeJson, toastApiError } from "../../config/siteConfig";

const CrmAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [exportFilters, setExportFilters] = useState({
    status: "",
    destination: "",
    leadScoreMin: "",
    startDate: "",
    endDate: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCrmData();
  }, []);

  // Lock body scroll when enquiry detail modal is open
  useEffect(() => {
    if (selectedEnquiry) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [selectedEnquiry]);

  // Parse structured information out of enquiry messages
  const parseMessage = (msg = "") => {
    if (!msg) return { comment: "", metadata: null };
    const metaIndex = msg.indexOf("[Inquired via");
    if (metaIndex === -1) return { comment: msg, metadata: null };

    const comment = msg.substring(0, metaIndex).trim();
    const metaRaw = msg.substring(metaIndex);

    // Parse metadata lines
    const lines = metaRaw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const metaObj = {};

    lines.forEach((line) => {
      if (line.startsWith("[Inquired via")) {
        metaObj.page = line.replace("[Inquired via Page:", "").replace("]", "").trim();
      } else if (line.startsWith("- ")) {
        const parts = line.replace("- ", "").split(":");
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join(":").trim();
          metaObj[key] = val;
        }
      }
    });

    return { comment, metadata: metaObj };
  };

  const parsedMsg = selectedEnquiry
    ? parseMessage(selectedEnquiry.message)
    : { comment: "", metadata: null };

  const fetchCrmData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, enquiriesRes] = await Promise.all([
        fetchWithAuth(apiUrl("/api/v1/crm/analytics")),
        fetchWithAuth(apiUrl("/api/v1/enquiries?limit=200")),
      ]);

      if (analyticsRes.status === 401 || enquiriesRes.status === 401) {
        navigate("/admin/login", { replace: true });
        return;
      }

      const analyticsJson = await safeJson(analyticsRes);
      const enquiriesJson = await safeJson(enquiriesRes);

      if (analyticsJson.success) {
        setAnalytics(analyticsJson.data);
      }
      if (enquiriesJson.success) {
        setEnquiries(enquiriesJson.data || []);
      }
    } catch (err) {
      console.error("Failed to load CRM data", err);
      toastApiError(err, "Failed to load CRM Analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (e) => {
    e.preventDefault();
    try {
      const queryParams = new URLSearchParams();
      Object.entries(exportFilters).forEach(([key, val]) => {
        if (val) queryParams.append(key, val);
      });

      const res = await fetchWithAuth(apiUrl(`/api/v1/crm/export?${queryParams.toString()}`));
      if (!res.ok) throw new Error("CSV Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `crm_enquiries_export_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("CSV Export downloaded successfully");
    } catch (err) {
      toastApiError(err, "Export failed");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await fetchWithAuth(apiUrl(`/api/v1/enquiries/${id}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await safeJson(res);
      if (res.ok && json.success) {
        toast.success(`Status updated to ${newStatus}`);
        setEnquiries((prev) =>
          prev.map((enq) => (enq._id === id || enq.id === id ? { ...enq, status: newStatus } : enq))
        );
        if (selectedEnquiry && (selectedEnquiry._id === id || selectedEnquiry.id === id)) {
          setSelectedEnquiry({ ...selectedEnquiry, status: newStatus });
        }
        // Refetch analytics as stats changed
        const analyticsRes = await fetchWithAuth(apiUrl("/api/v1/crm/analytics"));
        const analyticsJson = await safeJson(analyticsRes);
        if (analyticsJson.success) {
          setAnalytics(analyticsJson.data);
        }
      } else {
        toastApiError(json, "Failed to update status");
      }
    } catch (err) {
      toastApiError(err, "Failed to update status");
    }
  };

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Get active SLA warnings & breaches
  const slaAlerts = enquiries.filter(
    (e) =>
      (e.status === "pending" || e.status === "contacted") &&
      (e.slaStatus === "sla_breached" || e.slaStatus === "sla_warning")
  );

  const totalPipeline =
    analytics.activePipelineValue + analytics.wonPipelineValue + analytics.lostPipelineValue;
  const activePercentage =
    totalPipeline > 0 ? (analytics.activePipelineValue / totalPipeline) * 100 : 0;
  const wonPercentage = totalPipeline > 0 ? (analytics.wonPipelineValue / totalPipeline) * 100 : 0;
  const lostPercentage =
    totalPipeline > 0 ? (analytics.lostPipelineValue / totalPipeline) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            CRM & Pipeline Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Real-time pipeline value, SLA performance, and CSV exports
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium opacity-80 font-semibold uppercase tracking-wider">
              Active Pipeline
            </span>
            <FaDollarSign className="text-xl opacity-80" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(analytics.activePipelineValue)}</p>
          <p className="text-xs mt-2 opacity-80">Pending & Contacted leads</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium opacity-80 font-semibold uppercase tracking-wider">
              Won Pipeline
            </span>
            <FaDollarSign className="text-xl opacity-80" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(analytics.wonPipelineValue)}</p>
          <p className="text-xs mt-2 opacity-80">
            Confirmed conversions ({analytics.conversionRate}%)
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium opacity-80 font-semibold uppercase tracking-wider">
              Avg Response Time
            </span>
            <FaClock className="text-xl opacity-80" />
          </div>
          <p className="text-2xl font-bold">{analytics.slaStats.averageResponseMinutes} min</p>
          <p className="text-xs mt-2 opacity-80">First response average SLA</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium opacity-80 font-semibold uppercase tracking-wider">
              SLA Breaches
            </span>
            <FaExclamationTriangle className="text-xl opacity-80" />
          </div>
          <p className="text-2xl font-bold">{analytics.slaStats.breached}</p>
          <p className="text-xs mt-2 opacity-80">
            {analytics.slaStats.warning} warning alerts active
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Distribution & Destination Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pipeline Progress bar */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">
              Pipeline Distribution
            </h3>
            <div className="w-full h-6 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${wonPercentage}%` }}
                className="bg-emerald-500 h-full flex items-center justify-center text-[10px] text-white font-bold transition-all"
                title={`Won: ${formatCurrency(analytics.wonPipelineValue)}`}
              >
                {wonPercentage > 10 && `${wonPercentage.toFixed(0)}% Won`}
              </div>
              <div
                style={{ width: `${activePercentage}%` }}
                className="bg-blue-500 h-full flex items-center justify-center text-[10px] text-white font-bold transition-all"
                title={`Active: ${formatCurrency(analytics.activePipelineValue)}`}
              >
                {activePercentage > 10 && `${activePercentage.toFixed(0)}% Active`}
              </div>
              <div
                style={{ width: `${lostPercentage}%` }}
                className="bg-red-500 h-full flex items-center justify-center text-[10px] text-white font-bold transition-all"
                title={`Lost: ${formatCurrency(analytics.lostPipelineValue)}`}
              >
                {lostPercentage > 10 && `${lostPercentage.toFixed(0)}% Lost`}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 text-center text-xs">
              <div>
                <span className="inline-block w-3 h-3 bg-emerald-500 rounded-full mr-2" />
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Won: {formatCurrency(analytics.wonPipelineValue)}
                </span>
              </div>
              <div>
                <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2" />
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Active: {formatCurrency(analytics.activePipelineValue)}
                </span>
              </div>
              <div>
                <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2" />
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Lost: {formatCurrency(analytics.lostPipelineValue)}
                </span>
              </div>
            </div>
          </div>

          {/* Popular Destination chart */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">
              Destination Popularity
            </h3>
            <div className="space-y-4">
              {Object.entries(analytics.destinationBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([dest, count]) => {
                  const maxCount = Math.max(...Object.values(analytics.destinationBreakdown), 1);
                  const percentage = (count / maxCount) * 100;
                  return (
                    <div key={dest} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                          <FaMapMarkerAlt className="text-slate-400" />
                          {dest}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 font-semibold">
                          {count} {count === 1 ? "lead" : "leads"}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percentage}%` }}
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              {Object.keys(analytics.destinationBreakdown).length === 0 && (
                <p className="text-center py-8 text-slate-400">No destination data available</p>
              )}
            </div>
          </div>
        </div>

        {/* CSV Export Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col h-full justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
              <FaDownload className="text-amber-500" /> Export CRM Data
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-4">
              Export filtered enquiry records including lead scores, value estimations, and referral
              markers.
            </p>
            <form onSubmit={handleExport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Status
                </label>
                <select
                  value={exportFilters.status}
                  onChange={(e) => setExportFilters({ ...exportFilters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="contacted">Contacted</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Destination Group
                </label>
                <input
                  type="text"
                  placeholder="e.g. domestic, chardham"
                  value={exportFilters.destination}
                  onChange={(e) =>
                    setExportFilters({ ...exportFilters, destination: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Min Lead Score
                </label>
                <input
                  type="number"
                  placeholder="0 to 100"
                  min="0"
                  max="100"
                  value={exportFilters.leadScoreMin}
                  onChange={(e) =>
                    setExportFilters({ ...exportFilters, leadScoreMin: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={exportFilters.startDate}
                    onChange={(e) =>
                      setExportFilters({ ...exportFilters, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={exportFilters.endDate}
                    onChange={(e) =>
                      setExportFilters({ ...exportFilters, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 mt-4 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm shadow-sm transition-colors cursor-pointer"
              >
                <FaDownload /> Export Pipeline CSV
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* SLA Alert Logs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
          <FaExclamationTriangle className="text-rose-500" /> SLA Warning & Breach Log
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <th className="p-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="p-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="p-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  SLA Status
                </th>
                <th className="p-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Lead Score
                </th>
                <th className="p-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {slaAlerts.length > 0 ? (
                slaAlerts.map((enq) => {
                  const hoursElapsed = Math.floor(
                    (new Date() - new Date(enq.createdAt)) / (1000 * 60 * 60)
                  );
                  return (
                    <tr
                      key={enq._id || enq.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-slate-800 dark:text-white">{enq.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{enq.email}</p>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-slate-600 dark:text-slate-400">
                        {new Date(enq.createdAt).toLocaleString()}
                        <span className="block text-xs text-rose-500 font-medium">
                          ({hoursElapsed} hours unanswered)
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            enq.slaStatus === "sla_breached"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
                          }`}
                        >
                          {enq.slaStatus === "sla_breached" ? "Breached" : "Warning"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800 dark:text-white">
                          {enq.leadScore || 0}/100
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedEnquiry(enq)}
                          className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium text-sm"
                        >
                          Review Lead
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No active SLA warnings or breaches found. Keep it up!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedEnquiry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedEnquiry(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-150 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Lead & SLA Specification
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    ID: {selectedEnquiry._id || selectedEnquiry.id} &nbsp;•&nbsp; Submitted:{" "}
                    {new Date(selectedEnquiry.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEnquiry(null)}
                  className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-lg transition-colors text-slate-500 dark:text-slate-400"
                >
                  <FaTimes className="text-lg" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Customer Header card */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white font-bold text-xl shadow-sm">
                    {selectedEnquiry.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                      {selectedEnquiry.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-450 truncate mt-0.5">
                      {selectedEnquiry.email}
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 text-lg flex-shrink-0">
                      <FaPhoneAlt />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest block mb-0.5">
                        Phone Number
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-white text-sm block">
                        {selectedEnquiry.phone || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 text-lg flex-shrink-0">
                      <FaMapMarkerAlt />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-widest block mb-0.5">
                        Destination
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-white capitalize text-sm block">
                        {selectedEnquiry.destination || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Travel Date */}
                  <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 text-lg flex-shrink-0">
                      <FaCalendarAlt />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-widest block mb-0.5">
                        Travel Date
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-white text-sm block">
                        {selectedEnquiry.travelDate
                          ? new Date(selectedEnquiry.travelDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          : "Flexible / Anytime"}
                      </span>
                    </div>
                  </div>

                  {/* Travelers */}
                  <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 text-lg flex-shrink-0">
                      <FaUsers />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-widest block mb-0.5">
                        Travelers Count
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-white text-sm block">
                        {selectedEnquiry.travelers ? `${selectedEnquiry.travelers} Person(s)` : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Lead Score */}
                  <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 text-lg flex-shrink-0">
                      <FaDollarSign />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-widest block mb-0.5">
                        Lead Score
                      </span>
                      <span className="font-bold text-amber-600 dark:text-amber-400 text-sm block">
                        {selectedEnquiry.leadScore || 0} / 100
                      </span>
                    </div>
                  </div>

                  {/* SLA Status */}
                  <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 text-lg flex-shrink-0">
                      <FaClock />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-widest block mb-0.5">
                        SLA Response Status
                      </span>
                      <span
                        className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          selectedEnquiry.slaStatus === "sla_breached"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
                        }`}
                      >
                        {selectedEnquiry.slaStatus === "sla_breached" ? "Breached" : "Warning"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Structured Metadata (if inquired via package page) */}
                {parsedMsg.metadata && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                      Context Info (Inquired via Page)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-xs">
                          Package Source
                        </span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {parsedMsg.metadata.page}
                        </strong>
                      </div>
                      {Object.keys(parsedMsg.metadata)
                        .filter((k) => k !== "page")
                        .map((key) => (
                          <div key={key}>
                            <span className="text-slate-500 dark:text-slate-400 block text-xs capitalize">
                              {key}
                            </span>
                            <strong className="text-slate-800 dark:text-slate-200">
                              {parsedMsg.metadata[key]}
                            </strong>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Message comments */}
                {parsedMsg.comment && (
                  <div className="p-5 bg-amber-50/50 dark:bg-amber-500/5 rounded-xl border-l-4 border-amber-500">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-550 uppercase tracking-wider block mb-2">
                      Customer Personal Message
                    </span>
                    <p className="text-slate-800 dark:text-slate-300 leading-relaxed whitespace-pre-line text-sm font-medium">
                      "{parsedMsg.comment}"
                    </p>
                  </div>
                )}

                {/* Status Update section */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Update Enquiry Status
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {["pending", "contacted", "confirmed", "cancelled"].map((status) => {
                      const isActive = selectedEnquiry.status === status;
                      return (
                        <button
                          key={status}
                          onClick={() =>
                            updateStatus(selectedEnquiry._id || selectedEnquiry.id, status)
                          }
                          className={`px-4 py-2.5 rounded-lg text-sm font-semibold capitalize transition-all duration-200 ${
                            isActive
                              ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                          }`}
                        >
                          {status}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Email / Call buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-150 dark:border-slate-700">
                  <a
                    href={`mailto:${selectedEnquiry.email}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm shadow-sm transition-colors"
                  >
                    <FaEnvelope /> Send Email Reply
                  </a>
                  <a
                    href={`tel:${selectedEnquiry.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <FaPhoneAlt /> Call Client
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CrmAnalytics;
