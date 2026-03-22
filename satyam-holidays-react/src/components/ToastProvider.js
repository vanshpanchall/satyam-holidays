import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

let idCounter = 0;
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message, options = {}) => {
      const id = ++idCounter;
      const toast = {
        id,
        message,
        type: options.type || "info", // info | success | error | warning
        duration: options.duration ?? 3500,
      };
      setToasts((prev) => [...prev, toast]);
      if (toast.duration > 0) {
        setTimeout(() => remove(id), toast.duration);
      }
      return id;
    },
    [remove]
  );

  const value = useMemo(() => ({ show, remove }), [show, remove]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* aria-live region for SRs */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {toasts.length > 0 ? toasts[toasts.length - 1].message : ""}
      </div>
      {/* Visual toasts */}
      <div className="fixed z-[70] bottom-4 right-4 space-y-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-sm w-80 rounded-lg shadow-lg px-4 py-3 text-sm flex items-start gap-2 border
              ${t.type === "success" ? "bg-green-50 border-green-200 text-green-800" : ""}
              ${t.type === "error" ? "bg-red-50 border-red-200 text-red-800" : ""}
              ${t.type === "info" ? "bg-white border-navy-200 text-navy-800" : ""}
              ${t.type === "warning" ? "bg-yellow-50 border-yellow-200 text-yellow-800" : ""}
            `}
            role="status"
          >
            <div className="flex-1">{t.message}</div>
            <button
              className="ml-2 text-navy-500 hover:text-navy-700"
              onClick={() => remove(t.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
