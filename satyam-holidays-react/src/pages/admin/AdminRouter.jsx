import React, { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import PageTransition from "../../components/PageTransition";
import { lazyWithRecovery } from "../../utils/lazyWithRecovery";

import AdminDashboard from "./AdminDashboard";
import AdminEnquiries from "./AdminEnquiries";
import AdminPackages from "./AdminPackages";
import AdminSettings from "./AdminSettings";
import CrmAnalytics from "./CrmAnalytics";
import ReviewModeration from "./ReviewModeration";

const AdminLayout = lazyWithRecovery(() => import("./AdminLayout"), "admin-layout");
const AdminLogin = lazyWithRecovery(() => import("./AdminLogin"), "admin-login");

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
      </Route>
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  </Suspense>
);

export default AdminRouter;
