import { useEffect, useRef, useState } from 'react';
import ScanPage from './pages/ScanPage';
import GuestScanPage from './pages/GuestScanPage';
import LoginPage from './pages/LoginPage';
import SignedWorkspacePage from './pages/SignedWorkspacePage';
import Icon from './components/Icon';
import {
  clearDemoSession,
  createDemoSession,
  restoreDemoSession
} from './services/demoPrototype';

const readLocation = () => ({
  pathname: window.location.pathname,
  search: window.location.search
});

const headerNavItems = [
  { label: 'Main', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Partners', path: '/partners' },
  { label: 'Contact', path: '/contact' }
];

const productAlertText = `Fake products are a serious problem in Nigeria, and consumers often have no quick way to know if what they are buying is trustworthy. NAFDAC estimates 13–15% of medicines in circulation are fake, while other estimates are much higher. Counterfeiters have also found smarter ways to circulate fake products without consumers knowing. GenuineNG exists to make product checking simple and make counterfeit products harder to pass unnoticed.`;

function ProductAlertMessage() {
  return (
    <>
      Fake products are a serious problem in Nigeria, and consumers often have no
      quick way to know if what they are buying is trustworthy. NAFDAC estimates{' '}
      <strong className="product-alert-emphasis">13–15%</strong> of medicines in
      circulation are fake, while other estimates are much higher. Counterfeiters
      have also found smarter ways to circulate fake products without consumers
      knowing.{' '}
      <strong className="product-alert-final">
        GenuineNG exists to make product checking simple and make counterfeit
        products harder to pass unnoticed.
      </strong>
    </>
  );
}

export default function App() {
  const [route, setRoute] = useState(readLocation);
  const [session, setSession] = useState(restoreDemoSession);
  const [online, setOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [guestInitialPhoto, setGuestInitialPhoto] = useState(null);
  const [guestScans, setGuestScans] = useState([]);

  const mainRef = useRef(null);
  const previousPath = useRef(route.pathname);

  function navigate(path, replace = false) {
    if (!path.startsWith('/') || path.startsWith('//')) return;
    window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
    setRoute(readLocation());
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function beginGuestScan(file) {
    setGuestInitialPhoto(file || null);
    setGuestScans([]);
    navigate('/scan');
  }

  function addGuestResult(result, options = {}) {
    setGuestScans(current => {
      if (options.replace) {
        return current.map(item => item.id === result.id ? result : item);
      }
      return [...current, result];
    });
  }

  function demoSignIn() {
    const next = createDemoSession();
    setSession(next);
    navigate('/app');
  }

  function demoSignOut() {
    clearDemoSession();
    setSession(null);
    navigate('/');
  }

  useEffect(() => {
    const updateLocation = () => setRoute(readLocation());
    const updateOnline = () => setOnline(navigator.onLine);
    const captureInstall = event => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const installed = () => setInstallPrompt(null);

    window.addEventListener('popstate', updateLocation);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    window.addEventListener('beforeinstallprompt', captureInstall);
    window.addEventListener('appinstalled', installed);

    return () => {
      window.removeEventListener('popstate', updateLocation);
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      window.removeEventListener('beforeinstallprompt', captureInstall);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  useEffect(() => {
    const wasGuestScan = previousPath.current === '/scan';
    const isGuestScan = route.pathname === '/scan';
    if (wasGuestScan && !isGuestScan) {
      setGuestInitialPhoto(null);
      setGuestScans([]);
    }
    previousPath.current = route.pathname;
  }, [route.pathname]);

  useEffect(() => {
    const titles = {
      '/': 'Check a label',
      '/scan': 'Product check',
      '/login': 'Sign in',
      '/app': 'Workspace'
    };
    const title = route.pathname.startsWith('/app/')
      ? 'Saved check'
      : titles[route.pathname] || 'Page not found';
    document.title = `${title} · GenuineNG`;
    mainRef.current?.focus({ preventScroll: true });
  }, [route.pathname, route.search]);

  useEffect(() => {
    setMenuOpen(false);
  }, [route.pathname, route.search]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = event => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
    setMenuOpen(false);
  }

  const navIsActive = path => path === '/' ? route.pathname === '/' : route.pathname === path;

  function navClick(event, path) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    event.preventDefault();
    setMenuOpen(false);
    navigate(path);
  }

  const isWorkspaceRoute = route.pathname === '/app' || route.pathname.startsWith('/app/');

  if (isWorkspaceRoute) {
    if (!session) {
      return (
        <div className="app-shell">
          <main className="site-main workspace-login-fallback">
            <LoginPage session={session} navigate={navigate} onDemoSignIn={demoSignIn} />
          </main>
        </div>
      );
    }

    return (
      <SignedWorkspacePage
        routePath={route.pathname}
        navigate={navigate}
        session={session}
        onSignOut={demoSignOut}
        installAvailable={Boolean(installPrompt)}
        onInstall={installApp}
      />
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>

      <header className="site-header">
        <div className="header-inner">
          <a
            className="wordmark"
            href="/"
            onClick={event => navClick(event, '/')}
            aria-label="GenuineNG home"
          >
            <img src="/icons/favicon.svg" alt="" width="30" height="30" />
            <span>Genuine<span className="brand-suffix">NG</span></span>
          </a>

          <nav className="main-nav" aria-label="Main navigation">
            {headerNavItems.map(item => (
              <a
                key={item.path}
                className={navIsActive(item.path) ? 'active' : ''}
                aria-current={navIsActive(item.path) ? 'page' : undefined}
                href={item.path}
                onClick={event => navClick(event, item.path)}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="account-area">
            {installPrompt && (
              <button type="button" className="install-header-action" onClick={installApp}>
                <Icon name="plus" size={14} /> Install as app
              </button>
            )}

            {session ? (
              <>
                <span className="account-email">{session.user.name}</span>
                <a className="header-action" href="/app" onClick={event => navClick(event, '/app')}>
                  Workspace
                  <span className="header-action-icon"><Icon name="arrow" size={14} /></span>
                </a>
              </>
            ) : (
              <a className="header-action" href="/login" onClick={event => navClick(event, '/login')}>
                Sign in
                <span className="header-action-icon"><Icon name="arrow" size={14} /></span>
              </a>
            )}
          </div>

          <button
            type="button"
            className={`menu-toggle ${menuOpen ? 'open' : ''}`}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen(value => !value)}
          >
            <span /><span /><span />
          </button>
        </div>

        <div
          className={`mobile-menu-overlay ${menuOpen ? 'open' : ''}`}
          aria-hidden={!menuOpen}
          onClick={() => setMenuOpen(false)}
        >
          <aside
            id="mobile-navigation"
            className="mobile-menu-panel"
            aria-label="Mobile navigation"
            onClick={event => event.stopPropagation()}
          >
            <div className="mobile-menu-top">
              <a className="wordmark mobile-menu-wordmark" href="/" onClick={event => navClick(event, '/')}>
                <img src="/icons/favicon.svg" alt="" width="30" height="30" />
                <span>Genuine<span className="brand-suffix">NG</span></span>
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

            <nav className="mobile-menu-nav" aria-label="Mobile main navigation">
              {headerNavItems.map(item => (
                <a
                  key={item.path}
                  className={navIsActive(item.path) ? 'active' : ''}
                  aria-current={navIsActive(item.path) ? 'page' : undefined}
                  href={item.path}
                  onClick={event => navClick(event, item.path)}
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="mobile-menu-account">
              <div className="mobile-menu-actions">
                {installPrompt && (
                  <button type="button" className="mobile-install-action" onClick={installApp}>
                    <Icon name="plus" size={15} /><span>Install as app</span>
                  </button>
                )}

                {session ? (
                  <a
                    className="header-action mobile-account-action"
                    href="/app"
                    onClick={event => navClick(event, '/app')}
                  >
                    Workspace
                    <span className="header-action-icon"><Icon name="arrow" size={14} /></span>
                  </a>
                ) : (
                  <a
                    className="header-action mobile-account-action"
                    href="/login"
                    onClick={event => navClick(event, '/login')}
                  >
                    Sign in
                    <span className="header-action-icon"><Icon name="arrow" size={14} /></span>
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
          <p>You’re offline. This frontend demo still works, but live backend checks are not connected.</p>
        </div>
      )}

      {route.pathname === '/' && (
        <section className="product-alert-ticker" aria-label="Product safety alert">
          <span className="visually-hidden">{productAlertText}</span>
          <div className="product-alert-track" aria-hidden="true">
            <p className="product-alert-copy"><ProductAlertMessage /></p>
            <p className="product-alert-copy"><ProductAlertMessage /></p>
          </div>
        </section>
      )}

      <main
        id="main-content"
        ref={mainRef}
        tabIndex="-1"
        className={`site-main ${route.pathname === '/scan' ? 'guest-scan-main' : ''}`}
      >
        {route.pathname === '/' ? (
          <ScanPage navigate={navigate} onBeginScan={beginGuestScan} />
        ) : route.pathname === '/scan' ? (
          <GuestScanPage
            initialPhotoFile={guestInitialPhoto}
            previousScans={guestScans}
            onResultComplete={addGuestResult}
            navigate={navigate}
          />
        ) : route.pathname === '/login' ? (
          <LoginPage session={session} navigate={navigate} onDemoSignIn={demoSignIn} />
        ) : (
          <div className="empty-state not-found-state">
            <span className="eyebrow">404</span>
            <h1>This page isn’t here yet.</h1>
            <p>We’re still building this part of GenuineNG. Head back to the main page for now.</p>
            <button className="button primary" onClick={() => navigate('/')}>
              Back to main
            </button>
          </div>
        )}
      </main>

      <footer className="site-footer">
        <p className="footer-tagline">Made for everyday product checks in Nigeria.</p>
        <a
          className="footer-wordmark"
          href="/"
          onClick={event => navClick(event, '/')}
          aria-label="GenuineNG home"
        >
          <img src="/icons/favicon.svg" alt="" width="26" height="26" />
          <span>Genuine<span className="brand-suffix">NG</span></span>
        </a>
        <span className="footer-copy">© 2026 GenuineNG</span>
      </footer>
    </div>
  );
}
