import React, { Suspense, useEffect, useState } from "react";

import { ToastProvider } from "./components/ToastProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import { SettingsProvider } from "./contexts/SettingsContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { PageSkeleton } from "./components/SkeletonLoaders";
import { lazyWithRecovery } from "./utils/lazyWithRecovery";

const Home = lazyWithRecovery(() => import("./components/Home"), "home");
const AdminRouter = lazyWithRecovery(() => import("./pages/admin/AdminRouter.jsx"), "admin-router");

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
