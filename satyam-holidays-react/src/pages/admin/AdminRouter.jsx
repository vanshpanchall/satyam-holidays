import React, { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import PageTransition from "../../components/PageTransition";
import { lazyWithRecovery } from "../../utils/lazyWithRecovery";

// Each screen is its own chunk, so opening the dashboard doesn't download the package editor etc.
const AdminLayout = lazyWithRecovery(() => import("./AdminLayout"), "admin-layout");
const AdminLogin = lazyWithRecovery(() => import("./AdminLogin"), "admin-login");
const AdminDashboard = lazyWithRecovery(() => import("./AdminDashboard"), "admin-dashboard");
const AdminEnquiries = lazyWithRecovery(() => import("./AdminEnquiries"), "admin-enquiries");
const AdminPackages = lazyWithRecovery(() => import("./AdminPackages"), "admin-packages");
const AdminSettings = lazyWithRecovery(() => import("./AdminSettings"), "admin-settings");
const CrmAnalytics = lazyWithRecovery(() => import("./CrmAnalytics"), "crm-analytics");
const ReviewModeration = lazyWithRecovery(() => import("./ReviewModeration"), "review-moderation");
const AdminQuotes = lazyWithRecovery(() => import("./AdminQuotes"), "admin-quotes");
const AdminInstagram = lazyWithRecovery(() => import("./AdminInstagram"), "admin-instagram");
const QuoteBuilder = lazyWithRecovery(() => import("./QuoteBuilder"), "quote-builder");

const AdminRouter = () => (
  <Suspense fallback={null}>
    <Routes>
      <Route
        path="login"
        element={
          <PageTransition>
            <AdminLogin />
          </PageTransition>
        }
      />
      <Route path="" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="enquiries" element={<AdminEnquiries />} />
        <Route path="packages" element={<AdminPackages />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="crm" element={<CrmAnalytics />} />
        <Route path="reviews" element={<ReviewModeration />} />
        <Route path="quotes" element={<AdminQuotes />} />
        <Route path="instagram" element={<AdminInstagram />} />
        <Route path="quotes/:id" element={<QuoteBuilder />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  </Suspense>
);

export default AdminRouter;
