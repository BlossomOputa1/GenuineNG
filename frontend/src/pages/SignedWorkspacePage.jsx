import { useEffect, useMemo, useState } from 'react';
import DemoScanFlow from '../components/DemoScanFlow';
import Icon from '../components/Icon';
import {
  appendDemoScan,
  createDemoThread,
  deleteDemoThread,
  getDemoThread,
  listDemoThreads,
  updateDemoScan
} from '../services/demoPrototype';

function formatThreadDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short'
  }).format(date);
}

export default function SignedWorkspacePage({
  routePath,
  navigate,
  session,
  onSignOut,
  installAvailable,
  onInstall
}) {
  const [threads, setThreads] = useState(() => listDemoThreads());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const threadId = useMemo(() => {
    const match = routePath.match(/^\/app\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  }, [routePath]);

  const currentThread = useMemo(
    () => (threadId ? getDemoThread(threadId) : null),
    [threadId, threads]
  );

  useEffect(() => {
    setSidebarOpen(false);
  }, [routePath]);

  function refreshThreads() {
    setThreads(listDemoThreads());
  }

  function completeScan(scan, options = {}) {
    if (threadId && currentThread) {
      if (options.replace) updateDemoScan(threadId, scan.id, scan);
      else appendDemoScan(threadId, scan);
      refreshThreads();
      return;
    }

    const thread = createDemoThread(scan);
    refreshThreads();
    navigate(`/app/${encodeURIComponent(thread.id)}`, true);
  }

  function removeThread(event, id) {
    event.stopPropagation();
    event.preventDefault();
    deleteDemoThread(id);
    refreshThreads();
    if (threadId === id) navigate('/app', true);
  }

  function sidebarNavigate(path) {
    setSidebarOpen(false);
    navigate(path);
  }

  return (
    <div className="signed-workspace-shell">
      <button
        type="button"
        className="workspace-mobile-toggle"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open workspace navigation"
      >
        <span /><span /><span />
      </button>

      {sidebarOpen && (
        <button
          type="button"
          className="workspace-sidebar-scrim"
          aria-label="Close workspace navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`workspace-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="workspace-sidebar-top">
          <a
            className="workspace-brand"
            href="/"
            onClick={event => {
              event.preventDefault();
              sidebarNavigate('/');
            }}
          >
            <img src="/icons/favicon.svg" alt="" />
            <span>Genuine<span>NG</span></span>
          </a>

          <button
            type="button"
            className="workspace-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close workspace navigation"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <nav className="workspace-quick-nav" aria-label="Workspace navigation">
          <button type="button" className="workspace-new-check" onClick={() => sidebarNavigate('/app')}>
            <Icon name="plus" size={17} />
            <span>New Check</span>
          </button>
          <button type="button" onClick={() => sidebarNavigate('/help')}>
            <Icon name="question" size={17} />
            <span>Help</span>
          </button>
          <button type="button" onClick={() => sidebarNavigate('/partners')}>
            <Icon name="scan" size={17} />
            <span>Partners</span>
          </button>
          <button type="button" onClick={() => sidebarNavigate('/contact')}>
            <Icon name="info" size={17} />
            <span>Contact</span>
          </button>
        </nav>

        <div className="workspace-history-heading">
          <span>SCAN HISTORY</span>
          <small>{threads.length}</small>
        </div>

        <div className="workspace-history-list">
          {threads.length ? (
            threads.map(thread => (
              <article
                key={thread.id}
                className={`workspace-history-item ${thread.id === threadId ? 'active' : ''}`}
              >
                <a
                  href={`/app/${encodeURIComponent(thread.id)}`}
                  onClick={event => {
                    event.preventDefault();
                    sidebarNavigate(`/app/${encodeURIComponent(thread.id)}`);
                  }}
                >
                  <strong>{thread.title || 'Product check'}</strong>
                  <span>{thread.scans?.length || 0} scan{thread.scans?.length === 1 ? '' : 's'} · {formatThreadDate(thread.updatedAt)}</span>
                </a>
                <button
                  type="button"
                  className="workspace-history-delete"
                  onClick={event => removeThread(event, thread.id)}
                  aria-label={`Delete ${thread.title || 'product check'}`}
                >
                  <Icon name="trash" size={15} />
                </button>
              </article>
            ))
          ) : (
            <p className="workspace-history-empty">Your demo scan sessions will appear here after the first completed check.</p>
          )}
        </div>

        <div className="workspace-sidebar-bottom">
          {installAvailable && (
            <button type="button" className="workspace-install" onClick={onInstall}>
              <Icon name="plus" size={15} /> Install as app
            </button>
          )}
          <div className="workspace-user-card">
            <div className="workspace-avatar">EU</div>
            <div>
              <strong>{session?.user?.name || 'Evaare Ugbor'}</strong>
              <span>Frontend demo</span>
            </div>
          </div>
          <button type="button" className="workspace-signout" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="workspace-main">
        <header className="workspace-main-header">
          <div>
            <span className="eyebrow">GENUINENG LAYER 1</span>
            <strong>{currentThread?.title || 'New product check'}</strong>
          </div>
          <div className="workspace-header-user">
            <span>{session?.user?.name || 'Evaare Ugbor'}</span>
            <div className="workspace-avatar small">EU</div>
          </div>
        </header>

        <div className="workspace-conversation">
          <DemoScanFlow
            previousScans={currentThread?.scans || []}
            onResultComplete={completeScan}
            mode="signed"
            conversationId={threadId}
          />
        </div>
      </main>
    </div>
  );
}
