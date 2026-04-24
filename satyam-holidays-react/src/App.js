import React, { Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { ToastProvider } from "./components/ToastProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import { SettingsProvider } from "./contexts/SettingsContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { PageSkeleton } from "./components/SkeletonLoaders";
import { lazyWithRecovery } from "./utils/lazyWithRecovery";

const Home = lazyWithRecovery(() => import("./components/Home"), "home");
const AdminRouter = lazyWithRecovery(() => import("./pages/admin/AdminRouter.jsx"), "admin-router");
const PackageLandingPage = lazyWithRecovery(
  () => import("./pages/PackageLandingPage"),
  "package-landing"
);
const WishlistPage = lazyWithRecovery(() => import("./pages/WishlistPage"), "wishlist-page");
const ComparePage = lazyWithRecovery(() => import("./pages/ComparePage"), "compare-page");
const AiPlannerPage = lazyWithRecovery(() => import("./pages/AiPlannerPage"), "ai-planner-page");

import ScrollToTop from "./components/ScrollToTop";
import PageTransition from "./components/PageTransition";

function App() {
  const [ToastContainerComponent, setToastContainerComponent] = useState(null);

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
              <BrowserRouter>
                <ScrollToTop />
                <Suspense fallback={<PageSkeleton />}>
                  <Routes>
                    <Route path="/admin/*" element={<AdminRouter />} />
                    <Route
                      path="/"
                      element={
                        <PageTransition>
                          <Home />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/packages/:slug"
                      element={
                        <PageTransition>
                          <PackageLandingPage />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/wishlist"
                      element={
                        <PageTransition>
                          <WishlistPage />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/compare"
                      element={
                        <PageTransition>
                          <ComparePage />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/ai-planner"
                      element={
                        <PageTransition>
                          <AiPlannerPage />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="*"
                      element={
                        <PageTransition>
                          <Home />
                        </PageTransition>
                      }
                    />
                  </Routes>
                </Suspense>
              </BrowserRouter>
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
