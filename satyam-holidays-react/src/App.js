import React, { Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { ToastProvider } from "./components/ToastProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import { SettingsProvider } from "./contexts/SettingsContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { PageSkeleton } from "./components/SkeletonLoaders";
import ScrollToTop from "./components/ScrollToTop";
import PageTransition from "./components/PageTransition";
import { PageScrollbar } from "./components/ui/Scrollbar";
import { lazyWithRecovery } from "./utils/lazyWithRecovery";
import { refreshCsrfToken } from "./utils/csrf";

const Home = lazyWithRecovery(() => import("./components/Home"), "home");
const AdminRouter = lazyWithRecovery(() => import("./pages/admin/AdminRouter.jsx"), "admin-router");
const PackagesPage = lazyWithRecovery(() => import("./pages/PackagesPage"), "packages-page");
const PackageLandingPage = lazyWithRecovery(
  () => import("./pages/PackageLandingPage"),
  "package-landing"
);
const WishlistPage = lazyWithRecovery(() => import("./pages/WishlistPage"), "wishlist-page");
const ComparePage = lazyWithRecovery(() => import("./pages/ComparePage"), "compare-page");
const AiPlannerPage = lazyWithRecovery(() => import("./pages/AiPlannerPage"), "ai-planner-page");
const LegalPage = lazyWithRecovery(() => import("./pages/LegalPage"), "legal-page");
const QuotePage = lazyWithRecovery(() => import("./pages/QuotePage"), "quote-page");
const NotFoundPage = lazyWithRecovery(() => import("./pages/NotFoundPage"), "not-found-page");

const page = (element) => <PageTransition>{element}</PageTransition>;

function App() {
  const [ToastContainerComponent, setToastContainerComponent] = useState(null);

  useEffect(() => {
    refreshCsrfToken();
  }, []);

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

  // react-toastify is loaded after first paint; toasts fired earlier are queued by the library
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      Promise.all([import("react-toastify"), import("react-toastify/dist/ReactToastify.css")])
        .then(([module]) => !cancelled && setToastContainerComponent(() => module.ToastContainer))
        .catch(() => {});
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    const handle = idle(load);
    return () => {
      cancelled = true;
      if (window.cancelIdleCallback && typeof handle === "number")
        window.cancelIdleCallback(handle);
    };
  }, []);

  return (
    <ThemeProvider>
      <SettingsProvider>
        <ToastProvider>
          <ErrorBoundary>
            <PageScrollbar />
            <BrowserRouter>
              <ScrollToTop />
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
                  <Route path="/admin/*" element={<AdminRouter />} />
                  <Route path="/" element={page(<Home />)} />
                  <Route path="/packages" element={page(<PackagesPage />)} />
                  <Route path="/packages/:slug" element={page(<PackageLandingPage />)} />
                  <Route path="/wishlist" element={page(<WishlistPage />)} />
                  <Route path="/compare" element={page(<ComparePage />)} />
                  <Route path="/ai-planner" element={page(<AiPlannerPage />)} />
                  <Route
                    path="/privacy-policy"
                    element={page(<LegalPage page="privacy-policy" />)}
                  />
                  <Route path="/terms" element={page(<LegalPage page="terms" />)} />
                  <Route path="/refund-policy" element={page(<LegalPage page="refund-policy" />)} />
                  <Route path="/quote/:token" element={page(<QuotePage />)} />
                  <Route path="*" element={page(<NotFoundPage />)} />
                </Routes>
              </Suspense>
            </BrowserRouter>
            {ToastContainerComponent ? (
              <ToastContainerComponent
                position="bottom-left"
                autoClose={4000}
                newestOnTop
                closeOnClick
                pauseOnFocusLoss
                pauseOnHover
                theme="colored"
              />
            ) : null}
          </ErrorBoundary>
        </ToastProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;
