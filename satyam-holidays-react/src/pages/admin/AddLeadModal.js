import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { PiX } from "react-icons/pi";
import { apiUrl, fetchWithAuth, safeJson, toastApiError } from "../../config/siteConfig";
import { DESTINATIONS, MANUAL_SOURCES } from "../../config/enquiryOptions";
import { BUDGETS } from "../packagesFilters";
import Select from "../../components/ui/Select";
import { ScrollArea } from "../../components/ui/Scrollbar";

const EMPTY = {
  name: "",
  phone: "",
  email: "",
  source: "phone",
  destination: "",
  travelDate: "",
  travelers: "2",
  budget: "",
  status: "pending",
  note: "",
};

const input =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-4 focus:ring-saffron-500/15";
const compactSelect = "!h-[2.75rem] !text-sm !px-3.5";

const Field = ({ label, children, className = "" }) => (
  <div className={className}>
    <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
    {children}
  </div>
);

/** Log a lead that came in by phone, WhatsApp or in person. No emails are sent to the customer. */
const AddLeadModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (key) => (value) =>
    setForm((f) => ({ ...f, [key]: value?.target ? value.target.value : value }));

  useEffect(() => {
    document.body.classList.add("modal-open");
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || String(form.phone).replace(/\D/g, "").length < 10) {
      toast.error("Add a name and a phone number with at least 10 digits");
      return;
    }
    setSaving(true);
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
      const res = await fetchWithAuth(apiUrl("/api/enquiries/manual"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await safeJson(res);
      if (res.ok && json.success) {
        toast.success("Lead added");
        onCreated?.(json.data);
        onClose();
      } else {
        toastApiError(json, "Couldn't add the lead");
      }
    } catch (err) {
      toastApiError(err, "Couldn't add the lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/60 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-lead-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94vh] supports-[height:100dvh]:max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-page shadow-2xl sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 id="add-lead-title" className="font-display text-xl text-fg">
              Add a lead
            </h2>
            <p className="text-xs text-muted">
              For enquiries taken by phone, WhatsApp or at the office.
            </p>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
            <PiX className="h-4 w-4" />
          </button>
        </div>

        <ScrollArea className="flex-1" viewportClassName="p-6">
          <form id="add-lead-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Name *" className="sm:col-span-2">
              <input
                required
                autoFocus
                value={form.name}
                onChange={set("name")}
                className={input}
              />
            </Field>
            <Field label="Phone / WhatsApp *">
              <input
                required
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                className={input}
                placeholder="+91"
              />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={set("email")} className={input} />
            </Field>
            <Field label="Came in via">
              <Select
                value={form.source}
                onChange={set("source")}
                options={MANUAL_SOURCES}
                className={compactSelect}
                aria-label="Came in via"
              />
            </Field>
            <Field label="Stage">
              <Select
                value={form.status}
                onChange={set("status")}
                aria-label="Stage"
                className={compactSelect}
                options={[
                  { value: "pending", label: "New — not contacted" },
                  { value: "contacted", label: "Contacted" },
                  { value: "confirmed", label: "Confirmed booking" },
                ]}
              />
            </Field>
            <Field label="Destination">
              <Select
                value={form.destination}
                onChange={set("destination")}
                options={[{ value: "", label: "Not decided" }, ...DESTINATIONS]}
                className={compactSelect}
                aria-label="Destination"
              />
            </Field>
            <Field label="Travel date">
              <input
                type="date"
                value={form.travelDate}
                onChange={set("travelDate")}
                className={input}
              />
            </Field>
            <Field label="Travellers">
              <Select
                value={form.travelers}
                onChange={set("travelers")}
                aria-label="Travellers"
                className={compactSelect}
                options={["1", "2", "3", "4", "5+"].map((t) => ({
                  value: t,
                  label: t === "5+" ? "5 or more" : t,
                }))}
              />
            </Field>
            <Field label="Budget per person">
              <Select
                value={form.budget}
                onChange={set("budget")}
                options={[
                  { value: "", label: "Not shared" },
                  ...BUDGETS.map((b) => ({ value: b.id, label: b.label })),
                ]}
                className={compactSelect}
                aria-label="Budget"
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <textarea
                rows={3}
                maxLength={1000}
                value={form.note}
                onChange={set("note")}
                className={input}
                placeholder="What they asked for, best time to call…"
              />
            </Field>
          </form>
        </ScrollArea>

        <div className="flex shrink-0 gap-3 border-t border-line p-4">
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
            Cancel
          </button>
          <button
            type="submit"
            form="add-lead-form"
            disabled={saving}
            className="btn btn-accent flex-1"
          >
            {saving ? "Saving…" : "Add lead"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddLeadModal;
