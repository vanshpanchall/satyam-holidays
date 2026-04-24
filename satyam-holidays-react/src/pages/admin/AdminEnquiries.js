import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  FaDownload,
  FaClock,
  FaPhoneAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUsers,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import { apiUrl, fetchWithAuth, safeJson } from "../../config/siteConfig";

const AdminEnquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEnquiries();
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

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(apiUrl("/api/enquiries?limit=100"));
      if (res.status === 401) {
        navigate("/admin/login", { replace: true });
        return;
      }
      const json = await safeJson(res);
      if (json.success) {
        setEnquiries(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load enquiries", err);
      toast.error("Failed to load enquiries");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await fetchWithAuth(apiUrl(`/api/enquiries/${id}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Status updated to ${newStatus}`);
        setEnquiries((prev) =>
          prev.map((enq) => (enq._id === id || enq.id === id ? { ...enq, status: newStatus } : enq))
        );
        if (selectedEnquiry && (selectedEnquiry._id === id || selectedEnquiry.id === id)) {
          setSelectedEnquiry({ ...selectedEnquiry, status: newStatus });
        }
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetchWithAuth(apiUrl("/api/enquiries/export/excel"));
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `enquiries_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Downloaded successfully");
    } catch (err) {
      toast.error("Export failed");
    }
  };

  const statusConfig = {
    pending: {
      icon: <FaClock />,
      color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
    },
    contacted: {
      icon: <FaPhoneAlt />,
      color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
    },
    confirmed: {
      icon: <FaCheckCircle />,
      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
    },
    cancelled: {
      icon: <FaTimesCircle />,
      color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    },
  };

  const tabs = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "contacted", label: "Contacted" },
    { id: "confirmed", label: "Confirmed" },
    { id: "cancelled", label: "Cancelled" },
  ];

  const filteredEnquiries = enquiries
    .filter((e) => activeTab === "all" || e.status === activeTab)
    .filter(
      (e) =>
        searchTerm === "" ||
        e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.phone?.includes(searchTerm) ||
        e.destination?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const getCount = (status) =>
    status === "all" ? enquiries.length : enquiries.filter((e) => e.status === status).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Enquiries</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage customer enquiries
          </p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm shadow-sm transition-colors"
        >
          <FaDownload /> Export
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-amber-500 text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                {tab.label} ({getCount(tab.id)})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">
                  Destination
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                  Date
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredEnquiries.length > 0 ? (
                filteredEnquiries.map((enq) => {
                  const status = statusConfig[enq.status] || statusConfig.pending;
                  return (
                    <tr
                      key={enq._id || enq.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            {enq.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 dark:text-white truncate">
                              {enq.name}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                              {enq.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="capitalize text-slate-700 dark:text-slate-300">
                          {enq.destination || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell text-sm text-slate-500 dark:text-slate-400">
                        {new Date(enq.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${status.color}`}
                        >
                          {status.icon} {enq.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setSelectedEnquiry(enq)}
                          className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium text-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    No enquiries found
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setSelectedEnquiry(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                  Enquiry Details
                </h2>
                <button
                  onClick={() => setSelectedEnquiry(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <FaTimes className="text-slate-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Customer Info */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-xl">
                    {selectedEnquiry.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-white">
                      {selectedEnquiry.name}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400">{selectedEnquiry.email}</p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs uppercase mb-1">
                      <FaPhoneAlt /> Phone
                    </div>
                    <p className="font-medium text-slate-800 dark:text-white">
                      {selectedEnquiry.phone || "—"}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs uppercase mb-1">
                      <FaMapMarkerAlt /> Destination
                    </div>
                    <p className="font-medium text-slate-800 dark:text-white capitalize">
                      {selectedEnquiry.destination || "—"}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs uppercase mb-1">
                      <FaCalendarAlt /> Travel Date
                    </div>
                    <p className="font-medium text-slate-800 dark:text-white">
                      {selectedEnquiry.travelDate
                        ? new Date(selectedEnquiry.travelDate).toLocaleDateString()
                        : "Flexible"}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs uppercase mb-1">
                      <FaUsers /> Travelers
                    </div>
                    <p className="font-medium text-slate-800 dark:text-white">
                      {selectedEnquiry.travelers || "—"}
                    </p>
                  </div>
                </div>

                {/* Message */}
                {selectedEnquiry.message && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-lg border-l-4 border-amber-500">
                    <p className="text-xs text-amber-700 dark:text-amber-400 uppercase font-medium mb-2">
                      Message
                    </p>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                      {selectedEnquiry.message}
                    </p>
                  </div>
                )}

                {/* Status Update */}
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium mb-3">
                    Update Status
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["pending", "contacted", "confirmed", "cancelled"].map((status) => {
                      const config = statusConfig[status];
                      const isActive = selectedEnquiry.status === status;
                      return (
                        <button
                          key={status}
                          onClick={() =>
                            updateStatus(selectedEnquiry._id || selectedEnquiry.id, status)
                          }
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                            isActive
                              ? "bg-amber-500 text-white shadow-md"
                              : `${config.color} hover:opacity-80`
                          }`}
                        >
                          {config.icon} {status}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <a
                    href={`mailto:${selectedEnquiry.email}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                  >
                    <FaEnvelope /> Email
                  </a>
                  <a
                    href={`tel:${selectedEnquiry.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <FaPhoneAlt /> Call
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

export default AdminEnquiries;
