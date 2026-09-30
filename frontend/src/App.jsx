import { lazy, Suspense, useEffect, useRef, useState } from "react";
import Icon from "./components/Icon";
import NotificationBell from "./components/NotificationBell";
import { checkBackendHealth } from "./services/api";
import { signOut } from "./services/authService";
import {
  getDisplayName,
  supabase,
  supabaseConfigured,
} from "./services/supabase";

const readLocation = () => ({
  pathname: window.location.pathname,
  search: window.location.search,
});
const headerNavItems = [
  { label: "Main", path: "/" },
  { label: "About", path: "/about" },
  { label: "Partners", path: "/partners" },
  { label: "Contact", path: "/contact" },
];
const deferredPaths = new Set(["/about", "/contact", "/help"]);

function isDeferredPath(path) {
  const pathname = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return deferredPaths.has(pathname);
}
const productAlertText =
  "Counterfeit products can copy real-looking label details. GenuineNG makes printed information easier to read, review and check while being clear about what a label check can and cannot prove.";

const GuestScanPage = lazy(() => import("./pages/GuestScanPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const Layer2ScanPage = lazy(() => import("./pages/Layer2ScanPage"));
const PlaceholderPage = lazy(() => import("./pages/PlaceholderPage"));
const PartnerApplicationPage = lazy(
  () => import("./pages/PartnerApplicationPage"),
);
const AdminPartnerApprovalPage = lazy(
  () => import("./pages/AdminPartnerApprovalPage"),
);
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));
const ScanPage = lazy(() => import("./pages/ScanPage"));
const SignedWorkspacePage = lazy(() => import("./pages/SignedWorkspacePage"));
const ManufacturerPortalPage = lazy(
  () => import("./pages/manufacturer/ManufacturerPortalPage"),
);

function RouteFallback() {
  return (
    <div className="app-shell">
      <main className="site-main workspace-login-fallback">
        <div className="empty-state">
          <p>Loading...</p>
        </div>
      </main>
    </div>
  );
}

function ProductAlertMessage() {
  return (
    <>
      Counterfeit products can copy real-looking label details. GenuineNG makes
      printed information easier to read, review and check while being clear
      about what a label check can and cannot prove.{" "}
      <strong className="product-alert-final">
        Every result shows what matched, what raised a warning, and what could
        not be checked.
      </strong>
    </>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <AppContent />
    </Suspense>
  );
}

function AppContent() {
  const [route, setRoute] = useState(readLocation);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(supabaseConfigured);
  const [online, setOnline] = useState(navigator.onLine);
  const [backendHealthy, setBackendHealthy] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [guestInitialPhoto, setGuestInitialPhoto] = useState(null);
  const [guestScans, setGuestScans] = useState([]);
  const [guestCodeScans, setGuestCodeScans] = useState([]);
  const mainRef = useRef(null);
  const previousPath = useRef(route.pathname);
  const visibleHeaderNavItems = headerNavItems.filter(
    (item) => item.path !== "/partners" || Boolean(session?.user),
  );

  function navigate(path, replace = false) {
    if (!path.startsWith("/") || path.startsWith("//")) return;
    if (isDeferredPath(path)) return;

    window.history[replace ? "replaceState" : "pushState"]({}, "", path);
    setRoute(readLocation());
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function beginGuestScan(file) {
    setGuestInitialPhoto(file || null);
    setGuestScans([]);
    navigate("/scan");
  }
  function addGuestResult(result, options = {}) {
    setGuestScans((current) =>
      options.replace
        ? current.map((item) => (item.id === result.id ? result : item))
        : [...current, result],
    );
  }

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setAuthLoading(false);
      return undefined;
    }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session || null);
        setAuthLoading(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession || null);
        setAuthLoading(false);
      },
    );
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    checkBackendHealth(controller.signal)
      .then(() => setBackendHealthy(true))
      .catch(() => setBackendHealthy(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const updateLocation = () => setRoute(readLocation());
    const updateOnline = () => setOnline(navigator.onLine);
    const captureInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const installed = () => setInstallPrompt(null);
    window.addEventListener("popstate", updateLocation);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    window.addEventListener("beforeinstallprompt", captureInstall);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("popstate", updateLocation);
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      window.removeEventListener("beforeinstallprompt", captureInstall);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  useEffect(() => {
    const wasGuestScan = previousPath.current === "/scan";
    const isGuestScan = route.pathname === "/scan";
    if (wasGuestScan && !isGuestScan) {
      setGuestInitialPhoto(null);
      setGuestScans([]);
    }
    if (
      previousPath.current === "/code-scan" &&
      route.pathname !== "/code-scan"
    ) {
      setGuestCodeScans([]);
    }
    previousPath.current = route.pathname;
  }, [route.pathname]);
  useEffect(() => {
    const identifier =
      route.pathname === "/admin/partner-approval"
        ? "Partner Approval"
        : route.pathname.startsWith("/manufacturer")
          ? `Manufacturer · ${route.pathname.split("/").filter(Boolean).slice(-1)[0] === "manufacturer" ? "Overview" : route.pathname.split("/").filter(Boolean).slice(-1)[0].replaceAll("-", " ")}`
          : route.pathname.startsWith("/app/")
            ? "Saved Check"
            : {
                "/scan": "Product Check",
                "/code-scan": "GenuineNG Code",
                "/login": "Sign In",
                "/reset-password": "Reset Password",
                "/app": "Workspace",
                "/about": "About",
                "/help": "Help",
                "/partners": "Partners",
                "/contact": "Contact",
                "/privacy": "Privacy Policy",
                "/terms": "Terms of Service",
              }[route.pathname] ||
              (route.pathname === "/" ? "" : "Page Not Found");
    document.title = identifier ? `GenuineNG - ${identifier}` : "GenuineNG";
    mainRef.current?.focus({ preventScroll: true });
    setMenuOpen(false);
  }, [route.pathname, route.search]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const close = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
    setMenuOpen(false);
  }
  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      setSession(null);
      navigate("/");
    }
  }
  const navIsActive = (path) =>
    path === "/" ? route.pathname === "/" : route.pathname === path;
  function navClick(event, path) {
    if (isDeferredPath(path)) {
      event.preventDefault();
      return;
    }

    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    setMenuOpen(false);
    navigate(path);
  }
  const isWorkspaceRoute =
    route.pathname === "/app" || route.pathname.startsWith("/app/");
  const isManufacturerRoute =
    route.pathname === "/manufacturer" ||
    route.pathname.startsWith("/manufacturer/");
  const isPartnerApprovalRoute = route.pathname === "/admin/partner-approval";

  if (
    authLoading &&
    (isWorkspaceRoute ||
      isManufacturerRoute ||
      isPartnerApprovalRoute ||
      route.pathname === "/login" ||
      route.pathname === "/partners")
  ) {
    return (
      <div className="app-shell">
        <main className="site-main workspace-login-fallback">
          <div className="empty-state" role="status">
            <p>Loading your account…</p>
          </div>
        </main>
      </div>
    );
  }

  if (isPartnerApprovalRoute) {
    if (!session) {
      const returnPath = `${route.pathname}${route.search}`;
      return (
        <div className="app-shell auth-route-shell">
          <main className="site-main auth-route-main">
            <LoginPage session={session} navigate={navigate} />
          </main>
        </div>
      );
    }
    return (
      <AdminPartnerApprovalPage
        routeSearch={route.search}
        session={session}
        navigate={navigate}
      />
    );
  }

  if (isManufacturerRoute) {
    if (!session)
      return (
        <div className="app-shell">
          <main className="site-main workspace-login-fallback">
            <LoginPage session={session} navigate={navigate} />
          </main>
        </div>
      );
    return (
      <ManufacturerPortalPage
        routePath={route.pathname}
        navigate={navigate}
        session={session}
        onSignOut={handleSignOut}
      />
    );
  }

  if (isWorkspaceRoute) {
    if (!session)
      return (
        <div className="app-shell">
          <main className="site-main workspace-login-fallback">
            <LoginPage session={session} navigate={navigate} />
          </main>
        </div>
      );
    return (
      <SignedWorkspacePage
        routePath={route.pathname}
        navigate={navigate}
        session={session}
        onSignOut={handleSignOut}
        installAvailable={Boolean(installPrompt)}
        onInstall={installApp}
      />
    );
  }
  if (route.pathname === "/reset-password") {
    return (
      <div className="app-shell reset-route-shell">
        <header className="site-header reset-route-header">
          <div className="header-inner reset-route-header-inner">
            <span className="wordmark reset-route-wordmark">
              <img src="/icons/favicon.svg" alt="" width="30" height="30" />
              <span>
                Genuine<span className="brand-suffix">NG</span>
              </span>
            </span>
          </div>
        </header>

        <main
          id="main-content"
          ref={mainRef}
          tabIndex="-1"
          className="site-main reset-route-main"
        >
          <ResetPasswordPage navigate={navigate} />
        </main>
      </div>
    );
  }
  if (route.pathname === "/partners" && !session?.user) {
    return (
      <div className="app-shell auth-route-shell">
        <main
          id="main-content"
          ref={mainRef}
          tabIndex="-1"
          className="site-main auth-route-main"
        >
          <LoginPage
            session={session}
            navigate={(path, replace = false) =>
              navigate(path === "/app" ? "/partners" : path, replace)
            }
          />
        </main>
      </div>
    );
  }
  if (route.pathname === "/login") {
    return (
      <div className="app-shell auth-route-shell">
        <main
          id="main-content"
          ref={mainRef}
          tabIndex="-1"
          className="site-main auth-route-main"
        >
          <LoginPage session={session} navigate={navigate} />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a
            className="wordmark"
            href="/"
            onClick={(event) => navClick(event, "/")}
            aria-label="GenuineNG home"
          >
            <img src="/icons/favicon.svg" alt="" width="30" height="30" />
            <span>
              Genuine<span className="brand-suffix">NG</span>
            </span>
          </a>
          <nav className="main-nav" aria-label="Main navigation">
            {visibleHeaderNavItems.map((item) => (
              <a
                key={item.path}
                className={navIsActive(item.path) ? "active" : ""}
                aria-current={navIsActive(item.path) ? "page" : undefined}
                href={item.path}
                onClick={(event) => navClick(event, item.path)}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="account-area">
            {installPrompt && (
              <button
                type="button"
                className="install-header-action"
                onClick={installApp}
              >
                <Icon name="plus" size={14} />
                <span className="install-header-label">Install as app</span>
              </button>
            )}
            {session ? (
              <>
                <NotificationBell
                  userId={session.user.id}
                  navigate={navigate}
                  compact
                />
                <span className="account-email">
                  {getDisplayName(session.user)}
                </span>
                <a
                  className="header-action"
                  href="/app"
                  onClick={(event) => navClick(event, "/app")}
                >
                  Workspace
                  <span className="header-action-icon">
                    <Icon name="arrow" size={14} />
                  </span>
                </a>
              </>
            ) : (
              <a
                className="header-action"
                href="/login"
                onClick={(event) => navClick(event, "/login")}
              >
                Sign in
                <span className="header-action-icon">
                  <Icon name="arrow" size={14} />
                </span>
              </a>
            )}
          </div>
          <button
            type="button"
            className={`menu-toggle ${menuOpen ? "open" : ""}`}
            aria-label={
              menuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
        <div
          className={`mobile-menu-overlay ${menuOpen ? "open" : ""}`}
          aria-hidden={!menuOpen}
          onClick={() => setMenuOpen(false)}
        >
          <aside
            id="mobile-navigation"
            className="mobile-menu-panel"
            aria-label="Mobile navigation"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-menu-top">
              <a
                className="wordmark mobile-menu-wordmark"
                href="/"
                onClick={(event) => navClick(event, "/")}
              >
                <img src="/icons/favicon.svg" alt="" width="30" height="30" />
                <span>
                  Genuine<span className="brand-suffix">NG</span>
                </span>
              </a>
              <button
                type="button"
                className="mobile-menu-close"
                aria-label="Close navigation menu"
                onClick={() => setMenuOpen(false)}
              >
                <Icon name="close" size={22} />
              </button>
            </div>
            <nav
              className="mobile-menu-nav"
              aria-label="Mobile main navigation"
            >
              {visibleHeaderNavItems.map((item) => (
                <a
                  key={item.path}
                  className={navIsActive(item.path) ? "active" : ""}
                  href={isDeferredPath(item.path) ? undefined : item.path}
                  aria-disabled={isDeferredPath(item.path) ? true : undefined}
                  title={isDeferredPath(item.path) ? "Coming soon" : undefined}
                  onClick={(event) => navClick(event, item.path)}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mobile-menu-account">
              <div className="mobile-menu-actions">
                {installPrompt && (
                  <button
                    type="button"
                    className="mobile-install-action"
                    onClick={installApp}
                  >
                    <Icon name="plus" size={15} />
                    <span>Install as app</span>
                  </button>
                )}
                {session ? (
                  <a
                    className="header-action mobile-account-action"
                    href="/app"
                    onClick={(event) => navClick(event, "/app")}
                  >
                    Workspace
                    <span className="header-action-icon">
                      <Icon name="arrow" size={14} />
                    </span>
                  </a>
                ) : (
                  <a
                    className="header-action mobile-account-action"
                    href="/login"
                    onClick={(event) => navClick(event, "/login")}
                  >
                    Sign in
                    <span className="header-action-icon">
                      <Icon name="arrow" size={14} />
                    </span>
                  </a>
                )}
              </div>
            </div>
          </aside>
        </div>
      </header>
      {!online && (
        <div className="offline-strip" role="status">
          <Icon name="offline" size={17} />
          <p>
            Network unavailable. Live verification and history saving require a
            connection.
          </p>
        </div>
      )}
      {online && backendHealthy === false && (
        <div className="offline-strip" role="status">
          <Icon name="info" size={17} />
          <p>
            The GenuineNG service is temporarily unavailable. Live checks and
            saved history may be delayed.
          </p>
        </div>
      )}
      {route.pathname === "/" && (
        <section
          className="product-alert-ticker"
          aria-label="Product safety message"
        >
          <span className="visually-hidden">{productAlertText}</span>
          <div className="product-alert-track" aria-hidden="true">
            <p className="product-alert-copy">
              <ProductAlertMessage />
            </p>
            <p className="product-alert-copy">
              <ProductAlertMessage />
            </p>
          </div>
        </section>
      )}
      <main
        id="main-content"
        ref={mainRef}
        tabIndex="-1"
        className={`site-main ${route.pathname === "/scan" ? "guest-scan-main" : ""}`}
      >
        {route.pathname === "/" ? (
          <ScanPage
            navigate={navigate}
            onBeginScan={beginGuestScan}
            session={session}
          />
        ) : route.pathname === "/scan" ? (
          <GuestScanPage
            initialPhotoFile={guestInitialPhoto}
            previousScans={guestScans}
            onResultComplete={addGuestResult}
            navigate={navigate}
          />
        ) : route.pathname === "/code-scan" ? (
          <Layer2ScanPage
            previousScans={guestCodeScans}
            mode="guest"
            onResultComplete={async (result) => {
              const saved = {
                ...result,
                id:
                  result.id ||
                  globalThis.crypto?.randomUUID?.() ||
                  `${Date.now()}`,
              };
              setGuestCodeScans((current) => [...current, saved]);
              return saved;
            }}
          />
        ) : route.pathname === "/partners" ? (
          <PartnerApplicationPage
            navigate={navigate}
            session={session}
            authLoading={authLoading}
          />
        ) : ["/about", "/help", "/contact"].includes(route.pathname) ? (
          <PlaceholderPage page={route.pathname.slice(1)} navigate={navigate} />
        ) : route.pathname === "/privacy" ? (
          <PrivacyPolicyPage navigate={navigate} />
        ) : route.pathname === "/terms" ? (
          <TermsOfServicePage navigate={navigate} />
        ) : (
          <div className="empty-state not-found-state">
            <span className="eyebrow">404</span>
            <h1>This page isn’t here yet.</h1>
            <p>
              We’re still building this part of GenuineNG. Head back to the main
              page for now.
            </p>
            <button className="button primary" onClick={() => navigate("/")}>
              Back to main
            </button>
          </div>
        )}
      </main>
      <footer className="site-footer">
        <p className="footer-tagline">
          Made for everyday product checks in Nigeria.
        </p>
        <a
          className="footer-wordmark"
          href="/"
          onClick={(event) => navClick(event, "/")}
          aria-label="GenuineNG home"
        >
          <img src="/icons/favicon.svg" alt="" width="26" height="26" />
          <span>
            Genuine<span className="brand-suffix">NG</span>
          </span>
        </a>
        <span className="footer-copy">© 2026 GenuineNG</span>
      </footer>
    </div>
  );
}
