import React, { Suspense, lazy, useEffect, useState } from "react";

import { ToastProvider } from "./components/ToastProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import { SettingsProvider } from "./contexts/SettingsContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { PageSkeleton } from "./components/SkeletonLoaders";

const isChunkLoadError = (error) => {
  const message = error?.message || "";
  return /ChunkLoadError|Loading chunk [\d]+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
    message
  );
};

const lazyWithRecovery = (importer, storageKey) =>
  lazy(async () => {
    try {
      const module = await importer();
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(storageKey);
      }
      return module;
    } catch (error) {
      if (typeof window !== "undefined" && isChunkLoadError(error)) {
        const hasRetried = window.sessionStorage.getItem(storageKey);
        if (!hasRetried) {
          window.sessionStorage.setItem(storageKey, "1");
          window.location.reload();
          return new Promise(() => {});
        }
      }
      throw error;
    }
  });

const Home = lazyWithRecovery(() => import("./components/Home"), "lazy-retry:home");
const AdminRouter = lazyWithRecovery(
  () => import("./pages/admin/AdminRouter.jsx"),
  "lazy-retry:admin-router"
);

function App() {
  const [ToastContainerComponent, setToastContainerComponent] = useState(null);
  const isAdminPath =
    typeof window !== "undefined" && window.location.pathname.startsWith("/admin");

  useEffect(() => {
    const dsn = process.env.REACT_APP_SENTRY_DSN;
    if (!dsn) return;

    import("@sentry/react")
      .then((Sentry) => {
        Sentry.init({
          dsn,
          environment: process.env.NODE_ENV || "development",
          tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
        });
      })
      .catch(() => {
        // Ignore Sentry bootstrap failures in the client.
      });
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadToastUi = () => {
      Promise.all([import("react-toastify"), import("react-toastify/dist/ReactToastify.css")])
        .then(([module]) => {
          if (!isCancelled) {
            setToastContainerComponent(() => module.ToastContainer);
          }
        })
        .catch(() => {
          // Ignore toast UI bootstrap failures; custom toast provider still works.
        });
    };

    const timer = setTimeout(loadToastUi, 10000);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <ThemeProvider>
      <SettingsProvider>
        <ToastProvider>
          <ErrorBoundary>
            <div className="App min-h-screen bg-white dark:bg-navy-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
              <Suspense fallback={<PageSkeleton />}>
                {isAdminPath ? <AdminRouter /> : <Home />}
              </Suspense>
              {ToastContainerComponent ? (
                <ToastContainerComponent
                  position="bottom-right"
                  autoClose={4000}
                  hideProgressBar={false}
                  newestOnTop
                  closeOnClick
                  pauseOnFocusLoss
                  draggable
                  pauseOnHover
                  theme="colored"
                />
              ) : null}
            </div>
          </ErrorBoundary>
        </ToastProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;
