import React, { Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import { PageSkeleton } from "../../components/SkeletonLoaders";
import PageTransition from "../../components/PageTransition";
import { lazyWithRecovery } from "../../utils/lazyWithRecovery";

const AdminLayout = lazyWithRecovery(() => import("./AdminLayout"), "admin-layout");
const AdminDashboard = lazyWithRecovery(() => import("./AdminDashboard"), "admin-dashboard");
const AdminEnquiries = lazyWithRecovery(() => import("./AdminEnquiries"), "admin-enquiries");
const AdminPackages = lazyWithRecovery(() => import("./AdminPackages"), "admin-packages");
const AdminSettings = lazyWithRecovery(() => import("./AdminSettings"), "admin-settings");
const AdminLogin = lazyWithRecovery(() => import("./AdminLogin"), "admin-login");

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
