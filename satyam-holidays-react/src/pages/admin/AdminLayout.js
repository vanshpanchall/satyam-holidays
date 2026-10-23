import React, { Suspense, useCallback, useEffect, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  PiArrowSquareOut,
  PiChartLineUp,
  PiChatsCircle,
  PiGear,
  PiHouseLine,
  PiList,
  PiMoon,
  PiSignOut,
  PiSuitcaseRolling,
  PiSun,
  PiTray,
  PiX,
} from "react-icons/pi";
import { apiUrl, fetchWithAuth, safeJson } from "../../config/siteConfig";
import { useSiteConfig } from "../../contexts/SettingsContext";
import { ScrollArea } from "../../components/ui/Scrollbar";
import { getAdminAuthCache, resetAdminAuthCache, setAdminAuthCache } from "./adminAuthCache";

const NAV = [
  {
    group: "Overview",
    items: [{ name: "Dashboard", path: "/admin", icon: PiHouseLine, end: true }],
  },
  {
    group: "Sales",
    items: [
      { name: "Enquiries", path: "/admin/enquiries", icon: PiTray, badge: true },
      { name: "CRM analytics", path: "/admin/crm", icon: PiChartLineUp },
    ],
  },
  {
    group: "Content",
    items: [
      { name: "Packages", path: "/admin/packages", icon: PiSuitcaseRolling },
      { name: "Reviews", path: "/admin/reviews", icon: PiChatsCircle },
      { name: "Site settings", path: "/admin/settings", icon: PiGear },
    ],
  },
];

const titleFor = (pathname) =>
  NAV.flatMap((g) => g.items).find((i) =>
    i.end ? pathname === i.path : pathname.startsWith(i.path)
  )?.name || "Admin";

const SidebarContent = ({ pending, onNavigate, onLogout, isDark, toggleTheme, company }) => (
  <div className="flex h-full flex-col bg-ink-950 text-white">
    <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
      <img src={company.logo} alt="" className="h-9 w-9 rounded-full bg-white object-contain p-1" />
      <div className="leading-tight">
        <p className="font-display text-[15px]">{company.name}</p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">Admin</p>
      </div>
    </div>

    <ScrollArea
      className="flex-1"
      as="nav"
      viewportProps={{ "aria-label": "Admin" }}
      viewportClassName="px-3 py-6"
      contentClassName="space-y-6"
      tone="light"
    >
      {NAV.map((group) => (
        <div key={group.group}>
          <p className="mb-2 px-3 text-[10px] uppercase tracking-[0.2em] text-white/35">
            {group.group}
          </p>
          <ul className="space-y-0.5">
            {group.items.map(({ name, path, icon: Icon, end, badge }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      isActive
                        ? "bg-white text-ink-900"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="flex-1">{name}</span>
                  {badge && pending > 0 && (
                    <span className="rounded-full bg-saffron-500 px-2 py-0.5 text-[11px] font-medium text-white">
                      {pending}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </ScrollArea>

    <div className="space-y-0.5 border-t border-white/10 p-3">
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white"
      >
        <PiArrowSquareOut className="h-[18px] w-[18px]" /> View live site
      </a>
      <button
        type="button"
        onClick={toggleTheme}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white"
      >
        {isDark ? (
          <PiSun className="h-[18px] w-[18px]" />
        ) : (
          <PiMoon className="h-[18px] w-[18px]" />
        )}
        {isDark ? "Light mode" : "Dark mode"}
      </button>
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-300 hover:bg-red-500/10"
      >
        <PiSignOut className="h-[18px] w-[18px]" /> Sign out
      </button>
    </div>
  </div>
);

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { company } = useSiteConfig();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [pending, setPending] = useState(0);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const cached = getAdminAuthCache();
    if (cached.checked && cached.authenticated) {
      setIsAuthenticated(true);
      setIsChecking(false);
      return;
    }

    (async () => {
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
    })();
  }, [navigate]);

  // Pending-enquiry badge, refreshed on route change
  const loadPending = useCallback(async () => {
    try {
      const res = await fetchWithAuth(apiUrl("/api/enquiries/stats/overview"));
      const json = await safeJson(res);
      if (json.success) setPending(json.data?.overview?.pending || 0);
    } catch {
      // badge is optional
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadPending();
  }, [isAuthenticated, location.pathname, loadPending]);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [mobileOpen]);

  const toggleTheme = () => {
    const html = document.documentElement;
    const nextDark = !html.classList.contains("dark");
    html.classList.toggle("dark", nextDark);
    html.classList.toggle("light", !nextDark);
    try {
      localStorage.setItem("theme", nextDark ? "dark" : "light");
    } catch {
      // ignore
    }
    setIsDark(nextDark);
  };

  const handleLogout = async () => {
    try {
      await fetch(apiUrl("/api/auth/logout"), { method: "POST", credentials: "include" });
    } catch {
      // ignore errors during logout
    }
    resetAdminAuthCache();
    localStorage.removeItem("adminToken");
    navigate("/admin/login", { replace: true });
  };

  if (isChecking || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-saffron-500 border-t-transparent" />
      </div>
    );
  }

  const sidebar = (
    <SidebarContent
      pending={pending}
      onNavigate={() => setMobileOpen(false)}
      onLogout={handleLogout}
      isDark={isDark}
      toggleTheme={toggleTheme}
      company={company}
    />
  );

  return (
    <div className="min-h-screen bg-page text-fg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-page/90 px-4 backdrop-blur lg:ml-64 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="icon-btn lg:hidden"
            aria-label="Open menu"
          >
            <PiList className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl text-fg">{titleFor(location.pathname)}</h1>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost hidden h-9 sm:inline-flex"
        >
          <PiArrowSquareOut className="h-4 w-4" /> Live site
        </a>
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Admin menu"
        >
          <div className="absolute inset-0 bg-ink-950/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl">
            {sidebar}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10"
              aria-label="Close menu"
            >
              <PiX className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <main id="main-content" className="lg:ml-64">
        <div className="p-4 lg:p-8">
          <Suspense
            fallback={
              <div className="space-y-4" role="status" aria-label="Loading">
                <div className="skeleton h-28 rounded-3xl" />
                <div className="skeleton h-72 rounded-3xl" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
