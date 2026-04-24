import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaSuitcase,
  FaInbox,
  FaChartLine,
  FaClock,
  FaDownload,
  FaArrowRight,
  FaCheckCircle,
  FaTimesCircle,
  FaPhoneAlt,
  FaExclamationCircle,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { apiUrl, fetchWithAuth, safeJson } from "../../config/siteConfig";
import { io } from "socket.io-client";
import siteConfig from "../../config/siteConfig";

const POLL_INTERVAL = 60000;

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentEnquiries, setRecentEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prevEnquiryCount, setPrevEnquiryCount] = useState(null);
  const navigate = useNavigate();
  const fetchRef = useRef(null);

  const fetchDashboardData = useCallback(
    async (isInitial = false) => {
      try {
        if (isInitial) setLoading(true);

        const [enqRes, pkgRes, recentRes] = await Promise.all([
          fetchWithAuth(apiUrl("/api/enquiries/stats/overview")),
          fetch(apiUrl("/api/packages/stats/overview")),
          fetchWithAuth(apiUrl("/api/enquiries?limit=5")),
        ]);

        const enqData = await safeJson(enqRes);
        const pkgData = await safeJson(pkgRes);
        const recentData = await safeJson(recentRes);

        const newTotalEnquiries = enqData.success ? enqData.data?.overview?.total || 0 : 0;
        const newPendingEnquiries = enqData.success ? enqData.data?.overview?.pending || 0 : 0;

        if (prevEnquiryCount !== null && newTotalEnquiries > prevEnquiryCount) {
          const diff = newTotalEnquiries - prevEnquiryCount;
          toast.info(`${diff} new enquir${diff > 1 ? "ies" : "y"} received!`);
        }
        setPrevEnquiryCount(newTotalEnquiries);

        setStats({
          enquiries: { totalEnquiries: newTotalEnquiries, newEnquiries: newPendingEnquiries },
          packages: pkgData.success ? pkgData.data : { totalPackages: 0, averageRating: 0 },
        });

        if (recentData.success) {
          setRecentEnquiries(recentData.data?.slice(0, 5) || []);
        }
      } catch {
        // Error is handled silently - dashboard will show stale data
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [prevEnquiryCount]
  );

  // Keep ref updated with latest fetch function
  useEffect(() => {
    fetchRef.current = fetchDashboardData;
  }, [fetchDashboardData]);

  // Initial fetch - runs once on mount
  useEffect(() => {
    fetchRef.current?.(true);
  }, []);

  // Socket connection - runs once on mount, uses ref for latest fetch
  useEffect(() => {
    const socket = io(siteConfig.api.baseUrl, {
      transports: ["websocket", "polling"],
    });

    socket.on("new-enquiry", (enquiry) => {
      toast.info(`New enquiry from ${enquiry.name}!`);
      fetchRef.current?.(false);
    });

    socket.on("enquiry-updated", () => {
      fetchRef.current?.(false);
    });

    return () => socket.disconnect();
  }, []);

  // Polling interval
  useEffect(() => {
    const interval = setInterval(() => fetchRef.current?.(false), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const handleExport = async () => {
    try {
      const res = await fetchWithAuth(apiUrl("/api/enquiries/export/excel"));
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `satyam_enquiries_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Report downloaded!");
    } catch {
      toast.error("Export failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Packages",
      value: stats?.packages?.totalPackages || 0,
      icon: <FaSuitcase />,
      color: "bg-blue-500",
      lightBg: "bg-blue-50 dark:bg-blue-500/10",
      link: "/admin/packages",
    },
    {
      title: "Total Enquiries",
      value: stats?.enquiries?.totalEnquiries || 0,
      icon: <FaInbox />,
      color: "bg-emerald-500",
      lightBg: "bg-emerald-50 dark:bg-emerald-500/10",
      link: "/admin/enquiries",
    },
    {
      title: "Pending",
      value: stats?.enquiries?.newEnquiries || 0,
      icon: <FaExclamationCircle />,
      color: "bg-amber-500",
      lightBg: "bg-amber-50 dark:bg-amber-500/10",
      link: "/admin/enquiries",
    },
    {
      title: "Avg Rating",
      value: stats?.packages?.averageRating
        ? Number(stats.packages.averageRating).toFixed(1)
        : "0.0",
      icon: <FaChartLine />,
      color: "bg-purple-500",
      lightBg: "bg-purple-50 dark:bg-purple-500/10",
      link: "/admin/packages",
    },
  ];

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
      contacted: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
      confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
      cancelled: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    };
    const icons = {
      pending: <FaClock className="text-xs" />,
      contacted: <FaPhoneAlt className="text-xs" />,
      confirmed: <FaCheckCircle className="text-xs" />,
      cancelled: <FaTimesCircle className="text-xs" />,
    };
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}
      >
        {icons[status]} {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Overview of your travel business
          </p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm shadow-sm transition-colors"
        >
          <FaDownload /> Export Report
        </button>
      </div>

      {/* Stats Grid — all cards are clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => navigate(card.link)}
            className={`${card.lightBg} rounded-xl p-5 border border-slate-200/50 dark:border-slate-700/50 cursor-pointer hover:scale-[1.03] hover:shadow-lg transition-all duration-200 group`}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform`}
              >
                {card.icon}
              </div>
              <FaArrowRight className="text-xs text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{card.value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{card.title}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Enquiries — each row is clickable */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-slate-800 dark:text-white">Recent Enquiries</h2>
            <button
              onClick={() => navigate("/admin/enquiries")}
              className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 font-medium flex items-center gap-1"
            >
              View All <FaArrowRight className="text-xs" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {recentEnquiries.length > 0 ? (
              recentEnquiries.map((enq) => (
                <div
                  key={enq._id || enq.id}
                  onClick={() => navigate("/admin/enquiries")}
                  className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 group-hover:shadow-lg group-hover:shadow-amber-500/20 transition-shadow">
                      {enq.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {enq.name}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {enq.destination ? (
                          <span className="capitalize">{enq.destination}</span>
                        ) : (
                          "General"
                        )}
                        {enq.phone && <span className="hidden sm:inline"> • {enq.phone}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(enq.status)}
                    <FaArrowRight className="text-xs text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-12 text-center text-slate-400">No enquiries yet</div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate("/admin/packages")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors text-left group"
              >
                <FaSuitcase /> <span className="font-medium flex-1">Manage Packages</span>
                <FaArrowRight className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button
                onClick={() => navigate("/admin/enquiries")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-left group"
              >
                <FaInbox /> <span className="font-medium flex-1">View Enquiries</span>
                <FaArrowRight className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button
                onClick={() => navigate("/admin/settings")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-left group"
              >
                <FaChartLine /> <span className="font-medium flex-1">Site Settings</span>
                <FaArrowRight className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button
                onClick={handleExport}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-left group"
              >
                <FaDownload /> <span className="font-medium flex-1">Export Data</span>
                <FaArrowRight className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h2 className="font-semibold text-slate-800 dark:text-white mb-4">System Status</h2>
            <div className="space-y-3">
              {["API Server", "Database", "Email Service"].map((service) => (
                <div key={service} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">{service}</span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
