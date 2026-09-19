import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import LabelCheckFlow from "../components/LabelCheckFlow";
import {
  clearAllSessions,
  createSession,
  deleteSession,
  getSessionWithScans,
  listSessions,
  renameSession,
  saveScan,
  setSessionPinned,
} from "../services/historyService";
import { getDisplayName } from "../services/supabase";

function formatThreadDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function initials(name = "") {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "GN"
  );
}

export default function SignedWorkspacePage({
  routePath,
  navigate,
  session,
  onSignOut,
  installAvailable,
  onInstall,
}) {
  const userId = session.user.id;
  const displayName = getDisplayName(session.user);
  const [threads, setThreads] = useState([]);
  const [currentThread, setCurrentThread] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");

  const threadId = useMemo(() => {
    const match = routePath.match(/^\/app\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  }, [routePath]);

  async function refreshThreads() {
    const list = await listSessions(userId);
    setThreads(list);
    return list;
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      await refreshThreads();
      setCurrentThread(
        threadId ? await getSessionWithScans(userId, threadId) : null,
      );
    } catch (problem) {
      setError(problem.message || "Could not load scan history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    setSidebarOpen(false);
    setOpenMenuId(null);
    setRenamingId(null);
  }, [threadId, userId]);

  async function completeScan(result, options = {}) {
    try {
      if (threadId && currentThread) {
        const scanId = await saveScan(
          userId,
          threadId,
          result,
          options.existingScanId || null,
        );
        await load();
        return { scanId, sessionId: threadId };
      }
      const title = result.fields?.productName || "New product check";
      const created = await createSession(userId, title);
      const scanId = await saveScan(userId, created.id, result);
      await refreshThreads();
      navigate(`/app/${encodeURIComponent(created.id)}`, true);
      return { scanId, sessionId: created.id };
    } catch (problem) {
      setError(
        problem.message || "The result was checked, but saving history failed.",
      );
      return null;
    }
  }

  function startRename(thread) {
    setOpenMenuId(null);
    setRenamingId(thread.id);
    setRenameDraft(thread.title || "Product check");
  }

  async function commitRename(id) {
    const next = renameDraft.trim();
    setRenamingId(null);
    if (!next) return;
    try {
      await renameSession(userId, id, next);
      await load();
    } catch (problem) {
      setError(problem.message);
    }
  }

  async function pin(id, pinned) {
    setOpenMenuId(null);
    try {
      await setSessionPinned(userId, id, !pinned);
      await load();
    } catch (problem) {
      setError(problem.message);
    }
  }

  async function remove(id) {
    setOpenMenuId(null);
    try {
      await deleteSession(userId, id);
      if (threadId === id) navigate("/app", true);
      else await load();
    } catch (problem) {
      setError(problem.message);
    }
  }

  async function clearHistory() {
    if (
      !threads.length ||
      !window.confirm(
        "Permanently delete all saved GenuineNG history, including pinned checks?",
      )
    )
      return;
    try {
      await clearAllSessions(userId);
      setThreads([]);
      setCurrentThread(null);
      navigate("/app", true);
    } catch (problem) {
      setError(problem.message);
    }
  }

  function sidebarNavigate(path) {
    setSidebarOpen(false);
    setOpenMenuId(null);
    navigate(path);
  }

  return (
    <div
      className={`signed-workspace-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
    >
      <button
        type="button"
        className="workspace-mobile-toggle"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open workspace navigation"
      >
        <span />
        <span />
        <span />
      </button>
      {sidebarOpen && (
        <button
          type="button"
          className="workspace-sidebar-scrim"
          aria-label="Close workspace navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`workspace-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="workspace-sidebar-top">
          <a
            className="workspace-brand"
            href="/"
            title={sidebarCollapsed ? "Expand sidebar" : "GenuineNG home"}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "GenuineNG home"}
            onClick={(event) => {
              event.preventDefault();
              if (sidebarCollapsed) {
                setSidebarCollapsed(false);
                return;
              }
              sidebarNavigate("/");
            }}
          >
            <span className="workspace-brand-icon-wrap">
              <img src="/icons/favicon.svg" alt="" />
              <span className="workspace-brand-expand-icon">
                <Icon name="sidebarOpen" size={20} />
              </span>
            </span>
            <span className="workspace-brand-text">
              Genuine<span>NG</span>
            </span>
          </a>
          <button
            type="button"
            className="workspace-sidebar-collapse"
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Icon name={sidebarCollapsed ? "arrow" : "back"} size={18} />
          </button>
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
          <button
            type="button"
            className="workspace-new-check"
            title="New Check"
            onClick={() => sidebarNavigate("/app")}
          >
            <Icon name="plus" size={17} />
            <span>New Check</span>
          </button>
          <button
            type="button"
            title="Help"
            onClick={() => sidebarNavigate("/help")}
          >
            <Icon name="question" size={17} />
            <span>Help</span>
          </button>
          <button
            type="button"
            title="Partners"
            onClick={() => sidebarNavigate("/partners")}
          >
            <Icon name="scan" size={17} />
            <span>Partners</span>
          </button>
          <button
            type="button"
            title="Contact"
            onClick={() => sidebarNavigate("/contact")}
          >
            <Icon name="info" size={17} />
            <span>Contact</span>
          </button>
        </nav>

        <div className="workspace-history-heading">
          <span>SCAN HISTORY</span>
          <div className="history-heading-actions">
            <small>{threads.length}</small>
            {threads.length > 0 && (
              <button type="button" onClick={clearHistory}>
                Clear all
              </button>
            )}
          </div>
        </div>

        <div className="workspace-history-list">
          {loading ? (
            <p className="workspace-history-empty">Loading history…</p>
          ) : threads.length ? (
            threads.map((thread) => (
              <article
                key={thread.id}
                className={`workspace-history-item ${thread.id === threadId ? "active" : ""} ${renamingId === thread.id ? "renaming" : ""}`}
              >
                {renamingId === thread.id ? (
                  <div className="history-inline-rename-wrap">
                    <input
                      className="history-inline-rename"
                      value={renameDraft}
                      onChange={(event) => setRenameDraft(event.target.value)}
                      onBlur={() => commitRename(thread.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitRename(thread.id);
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          setRenamingId(null);
                        }
                      }}
                      autoFocus
                      maxLength="80"
                      aria-label="Rename check"
                    />
                  </div>
                ) : (
                  <a
                    href={`/app/${encodeURIComponent(thread.id)}`}
                    title={thread.title || "Product check"}
                    onClick={(event) => {
                      event.preventDefault();
                      sidebarNavigate(`/app/${encodeURIComponent(thread.id)}`);
                    }}
                  >
                    <span className="collapsed-history-icon">
                      <Icon name="history" size={17} />
                    </span>
                    <strong>
                      {thread.pinned && <span className="pin-mark">●</span>}
                      {thread.title || "Product check"}
                    </strong>
                    <span className="history-meta">
                      {thread.scanCount} scan{thread.scanCount === 1 ? "" : "s"}{" "}
                      · {formatThreadDate(thread.updatedAt)}
                    </span>
                  </a>
                )}

                <div className="history-menu-wrap">
                  <button
                    type="button"
                    className="history-more-button"
                    onClick={() =>
                      setOpenMenuId((current) =>
                        current === thread.id ? null : thread.id,
                      )
                    }
                    aria-label="Check options"
                    aria-expanded={openMenuId === thread.id}
                  >
                    <Icon name="more" size={17} />
                  </button>
                  {openMenuId === thread.id && (
                    <div className="history-context-menu" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => pin(thread.id, thread.pinned)}
                      >
                        <Icon name="pin" size={15} />
                        {thread.pinned ? "Unpin" : "Pin"}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => startRename(thread)}
                      >
                        <Icon name="edit" size={15} />
                        Rename
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="danger"
                        onClick={() => remove(thread.id)}
                      >
                        <Icon name="trash" size={15} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))
          ) : (
            <p className="workspace-history-empty">
              Your saved scan sessions will appear here after the first
              completed check.
            </p>
          )}
        </div>

        <div className="workspace-sidebar-bottom">
          {installAvailable && (
            <button
              type="button"
              className="workspace-install"
              onClick={onInstall}
            >
              <Icon name="plus" size={15} />
              <span>Install as app</span>
            </button>
          )}
          <div className="workspace-user-card">
            <div className="workspace-avatar">{initials(displayName)}</div>
            <div>
              <strong>{displayName}</strong>
              <span>{session.user.email}</span>
            </div>
          </div>
          <button
            type="button"
            className="workspace-signout"
            title="Sign out"
            onClick={onSignOut}
          >
            <Icon name="logout" size={17} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="workspace-main">
        <header className="workspace-main-header">
          <div>
            <span className="eyebrow">GENUINENG LAYER 1</span>
            <strong>{currentThread?.title || "New product check"}</strong>
          </div>
          <div className="workspace-header-user">
            <span>{displayName}</span>
            <div className="workspace-avatar small">
              {initials(displayName)}
            </div>
          </div>
        </header>
        {error && (
          <div className="workspace-error inline-notice form-error">
            <Icon name="warning" />
            <p>{error}</p>
          </div>
        )}
        <div className="workspace-conversation">
          {loading && threadId ? (
            <div className="empty-state">
              <p>Loading saved check…</p>
            </div>
          ) : threadId && !currentThread ? (
            <div className="empty-state">
              <span className="eyebrow">HISTORY</span>
              <h2>That saved check was not found.</h2>
              <button
                className="button primary"
                onClick={() => navigate("/app")}
              >
                Start a new check
              </button>
            </div>
          ) : (
            <LabelCheckFlow
              previousScans={currentThread?.scans || []}
              onResultComplete={completeScan}
              mode="signed"
              conversationId={threadId}
            />
          )}
        </div>
      </main>
    </div>
  );
}
