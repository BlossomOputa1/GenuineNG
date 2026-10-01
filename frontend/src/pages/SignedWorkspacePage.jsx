import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../components/Icon";
import ContactForm from "../components/ContactForm";
import LabelCheckFlow from "../components/LabelCheckFlow";
import NotificationBell from "../components/NotificationBell";
import {
  clearAllSessions,
  deleteSession,
  getSessionWithScans,
  listSessions,
  renameSession,
  saveCodeScan,
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
  const [newCheckVersion, setNewCheckVersion] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);
  const contactButtonRef = useRef(null);
  const contactDialogRef = useRef(null);

  useEffect(() => {
    if (!contactOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    contactDialogRef.current?.querySelector("input")?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setContactOpen(false);
        contactButtonRef.current?.focus();
      }
      if (event.key !== "Tab") return;
      const focusable = [...(contactDialogRef.current?.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      ) || [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [contactOpen]);

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
      const isCode =
        result?.type === "genuine_code" || Boolean(result?.payload?.unitId);
      const persisted = isCode
        ? await saveCodeScan(userId, threadId || null, result)
        : await saveScan(
            userId,
            threadId || null,
            result,
            options.existingScanId || null,
          );

      if (!persisted?.sessionId || !persisted?.scanId) {
        throw new Error(
          "The check completed, but GenuineNG could not confirm that history was saved.",
        );
      }

      if (threadId) {
        await load();
      } else {
        await refreshThreads();
        navigate(`/app/${encodeURIComponent(persisted.sessionId)}`, true);
      }
      return persisted;
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
      setNewCheckVersion((value) => value + 1);
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

  function startNewCheck() {
    setSidebarOpen(false);
    setOpenMenuId(null);
    setRenamingId(null);
    setCurrentThread(null);
    setError("");
    // A new check is a brand-new, unlocked working session even when the
    // browser is already on /app. Remounting the flow clears the local
    // mode lock without requiring a page refresh.
    setNewCheckVersion((value) => value + 1);
    if (threadId) navigate("/app");
    else window.scrollTo({ top: 0, behavior: "instant" });
  }

  return (
    <div
      className={`signed-workspace-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
    >
      <button
        type="button"
        className="workspace-mobile-toggle"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open checkspace navigation"
      >
        <span />
        <span />
        <span />
      </button>
      {sidebarOpen && (
        <button
          type="button"
          className="workspace-sidebar-scrim"
          aria-label="Close checkspace navigation"
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
            aria-label="Close checkspace navigation"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <nav className="workspace-quick-nav" aria-label="Checkspace navigation">
          <button
            type="button"
            className="workspace-new-check"
            title="New Check"
            onClick={startNewCheck}
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
            ref={contactButtonRef}
            onClick={() => {
              setSidebarOpen(false);
              setContactOpen(true);
            }}
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
              Your saved scan sessions will appear here.
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
            <span className="eyebrow">
              {currentThread?.mode === "genuine_code"
                ? "GENUINENG CODE"
                : "GENUINENG REGISTRY"}
            </span>
            <strong>{currentThread?.title || "New product check"}</strong>
          </div>
          <div className="workspace-header-user">
            <NotificationBell userId={userId} navigate={navigate} compact />
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
              <button className="button primary" onClick={startNewCheck}>
                Start a new check
              </button>
            </div>
          ) : (
            <LabelCheckFlow
              key={`${threadId || "new"}:${newCheckVersion}`}
              previousScans={currentThread?.scans || []}
              onResultComplete={completeScan}
              mode="signed"
              onCancelPendingScan={() => navigate("/app")}
              conversationId={threadId}
              initialMode={
                currentThread?.mode === "genuine_code" ? "code" : "registry"
              }
              sessionLocked={Boolean(currentThread)}
            />
          )}
        </div>
      </main>
      {contactOpen && (
        <div
          className="contact-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setContactOpen(false);
              contactButtonRef.current?.focus();
            }
          }}
        >
          <section
            ref={contactDialogRef}
            className="partner-application-card contact-card contact-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-form-title"
          >
            <div className="contact-dialog-header">
              <span className="contact-dialog-brand">
                <img src="/icons/favicon.svg" alt="" width="32" height="32" />
                Genuine<span>NG</span>
              </span>
              <button
                type="button"
                className="contact-dialog-close"
                aria-label="Close contact form"
                onClick={() => {
                  setContactOpen(false);
                  contactButtonRef.current?.focus();
                }}
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <ContactForm />
          </section>
        </div>
      )}
    </div>
  );
}
