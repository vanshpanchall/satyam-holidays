import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaSuitcase,
  FaInbox,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaMoon,
  FaSun,
  FaCog,
  FaChartLine,
  FaCommentDots,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl, fetchWithAuth } from "../../config/siteConfig";
import { getAdminAuthCache, resetAdminAuthCache, setAdminAuthCache } from "./adminAuthCache";

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    const cached = getAdminAuthCache();
    if (cached.checked && cached.authenticated) {
      setIsAuthenticated(true);
      setIsChecking(false);
      return;
    }

    const verifyAuth = async () => {
      try {
        const res = await fetchWithAuth(apiUrl("/api/auth/verify"));
        if (res.ok) {
          setAdminAuthCache(true, true);
          setIsAuthenticated(true);
        } else {
          setAdminAuthCache(true, false);
          localStorage.removeItem("adminToken");
          navigate("/admin/login", { replace: true });
        }
      } catch {
        setAdminAuthCache(true, false);
        navigate("/admin/login", { replace: true });
      } finally {
        setIsChecking(false);
      }
    };

    verifyAuth();
  }, [navigate]);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  const navLinks = [
    { name: "Dashboard", path: "/admin", icon: <FaTachometerAlt /> },
    { name: "Enquiries", path: "/admin/enquiries", icon: <FaInbox /> },
    { name: "Packages", path: "/admin/packages", icon: <FaSuitcase /> },
    { name: "CRM Analytics", path: "/admin/crm", icon: <FaChartLine /> },
    { name: "Review Moderation", path: "/admin/reviews", icon: <FaCommentDots /> },
    { name: "Settings", path: "/admin/settings", icon: <FaCog /> },
  ];

  const handleLogout = async () => {
    try {
      await fetch(apiUrl("/api/auth/logout"), {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore errors during logout
    }
    resetAdminAuthCache();
    localStorage.removeItem("adminToken");
    navigate("/admin/login", { replace: true });
  };

  if (isChecking || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const NavItem = ({ link, onClick }) => {
    const isActive = location.pathname === link.path;
    return (
      <Link
        to={link.path}
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
          isActive
            ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        }`}
      >
        <span className="text-lg">{link.icon}</span>
        <span>{link.name}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-30">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <img src="/satyam-logo.svg" alt="Satyam Holidays" className="h-10 w-auto" />
            <div>
              <h1 className="font-bold text-slate-800 dark:text-white text-sm">Satyam Holidays</h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Admin Panel
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navLinks.map((link) => (
            <NavItem key={link.path} link={link} />
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-1">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? <FaSun className="text-amber-500" /> : <FaMoon />}
            <span className="font-medium">{isDark ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <FaSignOutAlt />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img src="/satyam-logo.svg" alt="Satyam Holidays" className="h-9 w-auto" />
          <span className="font-bold text-slate-800 dark:text-white">Admin</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
        >
          <FaBars className="text-xl" />
        </button>
      </header>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-800 z-50 lg:hidden flex flex-col"
            >
              <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <img src="/satyam-logo.svg" alt="Satyam Holidays" className="h-9 w-auto" />
                  <span className="font-bold text-slate-800 dark:text-white">Satyam Admin</span>
                </div>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <FaTimes className="text-slate-600 dark:text-slate-300" />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-1">
                {navLinks.map((link) => (
                  <NavItem key={link.path} link={link} onClick={() => setIsMobileOpen(false)} />
                ))}
              </nav>
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-1">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {isDark ? <FaSun className="text-amber-500" /> : <FaMoon />}
                  <span className="font-medium">{isDark ? "Light" : "Dark"} Mode</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <FaSignOutAlt />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main id="main-content" className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
