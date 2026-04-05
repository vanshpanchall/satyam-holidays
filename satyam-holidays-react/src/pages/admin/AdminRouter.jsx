import React, { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import { PageSkeleton } from "../../components/SkeletonLoaders";
import PageTransition from "../../components/PageTransition";

const AdminLayout = lazy(() => import("./AdminLayout"));
const AdminDashboard = lazy(() => import("./AdminDashboard"));
const AdminEnquiries = lazy(() => import("./AdminEnquiries"));
const AdminPackages = lazy(() => import("./AdminPackages"));
const AdminSettings = lazy(() => import("./AdminSettings"));
const AdminLogin = lazy(() => import("./AdminLogin"));

const AnimatedAdminRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageSkeleton />}>
        <Routes location={location} key={location.pathname}>
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
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

const AdminRouter = () => (
  <BrowserRouter>
    <AnimatedAdminRoutes />
  </BrowserRouter>
);

export default AdminRouter;
