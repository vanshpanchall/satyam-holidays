import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as Sentry from "@sentry/react";

import { ToastProvider } from "./components/ToastProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import { PageSkeleton } from "./components/SkeletonLoaders";
import PageTransition from "./components/PageTransition";

// Initialize Sentry (optional — only if DSN is set)
if (process.env.REACT_APP_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  });
}

// Lazy load routes
const Home = lazy(() => import("./components/Home"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminEnquiries = lazy(() => import("./pages/admin/AdminEnquiries"));
const AdminPackages = lazy(() => import("./pages/admin/AdminPackages"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageSkeleton />}>
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageTransition>
                <Home />
              </PageTransition>
            }
          />
          <Route
            path="/admin/login"
            element={
              <PageTransition>
                <AdminLogin />
              </PageTransition>
            }
          />
          <Route
            path="/admin"
            element={
              <PageTransition>
                <AdminLayout />
              </PageTransition>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="enquiries" element={<AdminEnquiries />} />
            <Route path="packages" element={<AdminPackages />} />
          </Route>
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ErrorBoundary>
          <div className="App min-h-screen bg-white dark:bg-navy-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
            <BrowserRouter>
              <AnimatedRoutes />
            </BrowserRouter>
            <ToastContainer
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
          </div>
        </ErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
