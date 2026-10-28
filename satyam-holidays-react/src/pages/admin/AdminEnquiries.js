import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  FaDownload,
  FaClock,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUsers,
  FaSearch,
  FaTimes,
  FaWhatsapp,
  FaStickyNote,
} from "react-icons/fa";
import { apiUrl, fetchWithAuth, safeJson, toastApiError } from "../../config/siteConfig";
import AddLeadModal from "./AddLeadModal";
import { sourceLabel } from "./adminUi";
import { ScrollArea } from "../../components/ui/Scrollbar";

const AdminEnquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingCrm, setSavingCrm] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddLead, setShowAddLead] = useState(false);

  useEffect(() => {
    fetchEnquiries();
    const pollInterval = setInterval(fetchEnquiries, 30000);
    return () => clearInterval(pollInterval);
  }, []);

  const deepLinkId = searchParams.get("id");
  useEffect(() => {
    if (!deepLinkId || loading) return;
    const found = enquiries.find((e) => (e._id || e.id) === deepLinkId);
    if (found) {
      setSelectedEnquiry(found);
      return;
    }
    fetchWithAuth(apiUrl(`/api/enquiries/${deepLinkId}`))
      .then(safeJson)
      .then((json) => json.success && json.data && setSelectedEnquiry(json.data))
      .catch(() => {});
  }, [deepLinkId, loading, enquiries]);

  const closeEnquiry = () => {
    setSelectedEnquiry(null);
    if (deepLinkId) {
      searchParams.delete("id");
      setSearchParams(searchParams, { replace: true });
    }
  };

  useEffect(() => {
    setNoteDraft("");
  }, [selectedEnquiry?._id, selectedEnquiry?.id]);

  useEffect(() => {
    if (selectedEnquiry) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => document.body.classList.remove("modal-open");
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
      toastApiError(err, "Failed to load enquiries");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await fetchWithAuth(apiUrl(`/api/enquiries/${id}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await safeJson(res);
      if (res.ok && json.success) {
        toast.success(`Status updated to ${status}`);
        setEnquiries((prev) =>
          prev.map((enq) => (enq._id === id || enq.id === id ? { ...enq, status } : enq))
        );
        if (selectedEnquiry && (selectedEnquiry._id === id || selectedEnquiry.id === id)) {
          setSelectedEnquiry({ ...selectedEnquiry, status });
        }
      } else {
        toastApiError(json, "Failed to update status");
      }
    } catch (err) {
      toastApiError(err, "Failed to update status");
    }
  };

  const saveCrm = async (payload) => {
    if (!selectedEnquiry) return;
    const id = selectedEnquiry._id || selectedEnquiry.id;
    setSavingCrm(true);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/enquiries/${id}/crm`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await safeJson(res);
      if (res.ok && json.success) {
        toast.success(payload.note ? "Note added" : "Follow-up saved");
        setNoteDraft("");
        setSelectedEnquiry(json.data);
        setEnquiries((prev) => prev.map((enq) => ((enq._id || enq.id) === id ? json.data : enq)));
      } else {
        toastApiError(json, "Failed to save");
      }
    } catch (err) {
      toastApiError(err, "Failed to save");
    } finally {
      setSavingCrm(false);
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
      toastApiError(err, "Export failed");
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
      icon: <FaPhoneAlt />,
      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
    },
    cancelled: {
      icon: <FaTimes />,
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

  const parseMessage = (msg = "") => {
    if (!msg) return { comment: "", metadata: null };
    const metaIndex = msg.indexOf("[Inquired via");
    if (metaIndex === -1) return { comment: msg, metadata: null };
    const comment = msg.substring(0, metaIndex).trim();
    const metaRaw = msg.substring(metaIndex);
    const lines = metaRaw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const metadata = {};
    lines.forEach((line) => {
      if (line.startsWith("[Inquired via")) {
        metadata.page = line.replace("[Inquired via Page:", "").replace("]", "").trim();
      } else if (line.startsWith("- ")) {
        const parts = line.replace("- ", "").split(":");
        if (parts.length >= 2) {
          metadata[parts[0].trim()] = parts.slice(1).join(":").trim();
        }
      }
    });
    return { comment, metadata };
  };

  const filteredEnquiries = enquiries
    .filter((enquiry) => activeTab === "all" || enquiry.status === activeTab)
    .filter((enquiry) => {
      const query = searchTerm.toLowerCase();
      return (
        !query ||
        enquiry.name?.toLowerCase().includes(query) ||
        enquiry.email?.toLowerCase().includes(query) ||
        enquiry.phone?.includes(searchTerm) ||
        enquiry.destination?.toLowerCase().includes(query)
      );
    });

  const getCount = (status) =>
    status === "all"
      ? enquiries.length
      : enquiries.filter((enquiry) => enquiry.status === status).length;

  const selectedMessage = selectedEnquiry
    ? parseMessage(selectedEnquiry.message)
    : { comment: "", metadata: null };

  const modalContent = selectedEnquiry ? (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={closeEnquiry}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-start justify-between gap-3 px-5 py-4 sm:px-6 sm:py-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Enquiry Specification
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {sourceLabel(selectedEnquiry.source)} &nbsp;•&nbsp; Lead score{" "}
                {selectedEnquiry.leadScore ?? 0} &nbsp;•&nbsp; Submitted:{" "}
                {selectedEnquiry.createdAt
                  ? new Date(selectedEnquiry.createdAt).toLocaleString()
                  : "—"}
              </p>
            </div>
            <button
              onClick={closeEnquiry}
              className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-lg transition-colors text-slate-500 dark:text-slate-400"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>

          <ScrollArea className="max-h-[75vh]" contentClassName="p-4 sm:p-6 space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-2xl shadow-sm">
                {selectedEnquiry.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                  {selectedEnquiry.name}
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-sm text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 truncate">
                    <FaEnvelope className="text-amber-500" /> {selectedEnquiry.email}
                  </span>
                  {selectedEnquiry.phone && (
                    <span className="flex items-center gap-1.5">
                      <FaPhoneAlt className="text-amber-500" /> {selectedEnquiry.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 text-lg flex-shrink-0">
                  <FaPhoneAlt />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">
                    Phone Number
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-white text-sm block">
                    {selectedEnquiry.phone || "—"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 text-lg flex-shrink-0">
                  <FaMapMarkerAlt />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">
                    Destination
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-white capitalize text-sm block">
                    {selectedEnquiry.destination || "—"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 text-lg flex-shrink-0">
                  <FaCalendarAlt />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">
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
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 text-lg flex-shrink-0">
                  <FaUsers />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">
                    Travelers Count
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-white text-sm block">
                    {selectedEnquiry.travelers ? `${selectedEnquiry.travelers} Person(s)` : "—"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm sm:col-span-2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 text-lg flex-shrink-0">
                  <FaClock />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">
                    Expected Budget
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-white text-sm block">
                    {selectedEnquiry.budget || "Flexible"}
                  </span>
                </div>
              </div>
            </div>

            {selectedMessage.metadata && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Context Info (Inquired via Page)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-xs">
                      Package Source
                    </span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {selectedMessage.metadata.page}
                    </strong>
                  </div>
                  {Object.keys(selectedMessage.metadata)
                    .filter((key) => key !== "page")
                    .map((key) => (
                      <div key={key}>
                        <span className="text-slate-500 dark:text-slate-400 block text-xs capitalize">
                          {key}
                        </span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {selectedMessage.metadata[key]}
                        </strong>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {selectedMessage.comment && (
              <div className="p-5 bg-amber-50/50 dark:bg-amber-500/5 rounded-xl border-l-4 border-amber-500">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider block mb-2">
                  Customer Personal Message
                </span>
                <p className="text-slate-800 dark:text-slate-300 leading-relaxed whitespace-pre-line text-sm font-medium">
                  "{selectedMessage.comment}"
                </p>
              </div>
            )}

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Follow-up reminder
              </span>
              <input
                type="date"
                value={
                  selectedEnquiry.followUpDate ? selectedEnquiry.followUpDate.slice(0, 10) : ""
                }
                onChange={(e) => saveCrm({ followUpDate: e.target.value || null })}
                disabled={savingCrm}
                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-white"
              />
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FaStickyNote /> Internal notes
              </span>
              {(selectedEnquiry.adminNotes || []).length > 0 && (
                <ul className="space-y-2">
                  {selectedEnquiry.adminNotes.map((n, i) => (
                    <li
                      key={n._id || i}
                      className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <p className="whitespace-pre-line">{n.text}</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {n.author || "admin"} · {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && noteDraft.trim() && saveCrm({ note: noteDraft.trim() })
                  }
                  maxLength={1000}
                  placeholder="e.g. Called, wants Kedarnath in May"
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  disabled={savingCrm || !noteDraft.trim()}
                  onClick={() => saveCrm({ note: noteDraft.trim() })}
                  className="px-4 py-2 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Update Enquiry Status
              </span>
              <div className="flex flex-wrap gap-2.5">
                {["pending", "contacted", "confirmed", "cancelled"].map((status) => {
                  const config = statusConfig[status];
                  const isActive = selectedEnquiry.status === status;
                  return (
                    <button
                      key={status}
                      onClick={() =>
                        updateStatus(selectedEnquiry._id || selectedEnquiry.id, status)
                      }
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold capitalize transition-all duration-200 ${isActive ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : `${config.color} hover:bg-opacity-80`}`}
                    >
                      {config.icon} {status}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <a
                href={`mailto:${selectedEnquiry.email}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm shadow-sm transition-colors"
              >
                <FaEnvelope /> Send Email Reply
              </a>
              <a
                href={`https://wa.me/${String(selectedEnquiry.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${selectedEnquiry.name}, this is Satyam Holidays regarding your travel enquiry.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-sm transition-colors"
              >
                <FaWhatsapp /> WhatsApp
              </a>
              <a
                href={`tel:${selectedEnquiry.phone}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <FaPhoneAlt /> Call Client
              </a>
            </div>
          </ScrollArea>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  ) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Enquiries</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage customer enquiries
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowAddLead(true)}
            className="btn btn-accent h-10"
          >
            + Add lead
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm shadow-sm transition-colors"
          >
            <FaDownload /> Export
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
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
          <div className="flex flex-wrap gap-1 lg:flex-nowrap lg:overflow-x-auto lg:pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? "bg-amber-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"}`}
              >
                {tab.label} ({getCount(tab.id)})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">
                  Destination
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                  Date
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                  Status
                </th>
                <th className="px-4 sm:px-5 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredEnquiries.length > 0 ? (
                filteredEnquiries.map((enquiry) => {
                  const status = statusConfig[enquiry.status] || statusConfig.pending;
                  return (
                    <tr
                      key={enquiry._id || enquiry.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-4 sm:px-5 py-4 w-full max-w-0 sm:w-auto sm:max-w-none">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            {enquiry.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 dark:text-white truncate">
                              {enquiry.name}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                              {enquiry.email}
                            </p>
                            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 sm:hidden">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${status.color}`}
                              >
                                {status.icon} {enquiry.status}
                              </span>
                              {enquiry.createdAt && (
                                <span className="text-xs text-slate-400">
                                  {new Date(enquiry.createdAt).toLocaleDateString()}
                                </span>
                              )}
                              {enquiry.followUpDate &&
                                new Date(enquiry.followUpDate) <= new Date() &&
                                enquiry.status !== "confirmed" &&
                                enquiry.status !== "cancelled" && (
                                  <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                    Follow-up due
                                  </span>
                                )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="capitalize text-slate-700 dark:text-slate-300">
                          {enquiry.destination || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell text-sm text-slate-500 dark:text-slate-400">
                        {enquiry.createdAt ? new Date(enquiry.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${status.color}`}
                        >
                          {status.icon} {enquiry.status}
                        </span>
                        {enquiry.followUpDate &&
                          new Date(enquiry.followUpDate) <= new Date() &&
                          enquiry.status !== "confirmed" &&
                          enquiry.status !== "cancelled" && (
                            <span className="ml-2 text-xs font-medium text-red-600 dark:text-red-400">
                              Follow-up due
                            </span>
                          )}
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-right">
                        <button
                          onClick={() => setSelectedEnquiry(enquiry)}
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
                    {loading ? "Loading enquiries..." : "No enquiries found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent}
      {showAddLead && (
        <AddLeadModal
          onClose={() => setShowAddLead(false)}
          onCreated={(lead) => setEnquiries((prev) => [lead, ...prev])}
        />
      )}
    </div>
  );
};

export default AdminEnquiries;
