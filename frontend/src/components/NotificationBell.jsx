import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import { listUserNotifications, markNotificationRead } from '../services/notificationService';

function formatNotificationDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function NotificationBell({ userId, navigate, compact = false }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const rootRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      setItems(await listUserNotifications(userId));
      setError('');
    } catch (problem) {
      setError(problem.message || 'Could not load notifications.');
    }
  }, [userId]);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const unreadCount = useMemo(() => items.filter((item) => !item.read_at).length, [items]);

  async function openNotification(item) {
    try {
      if (!item.read_at) {
        await markNotificationRead(userId, item.id);
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry));
      }
    } catch {
      // Opening the notification should still work if the read receipt fails.
    }
    setOpen(false);
    if (item.action_path) navigate(item.action_path);
  }

  return (
    <div className={`notification-bell ${compact ? 'compact' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="notification-bell-button"
        aria-label={unreadCount ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'Notifications'}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          if (!open) refresh();
        }}
      >
        <Icon name="bell" size={compact ? 18 : 19} />
        {unreadCount > 0 && <span className="notification-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {open && (
        <div className="notification-popover" role="dialog" aria-label="Notifications">
          <div className="notification-popover-heading">
            <strong>Notifications</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications"><Icon name="close" size={16} /></button>
          </div>
          {error ? (
            <p className="notification-empty">{error}</p>
          ) : items.length ? (
            <div className="notification-list">
              {items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`notification-item ${item.read_at ? '' : 'unread'}`}
                  onClick={() => openNotification(item)}
                >
                  <span className="notification-item-icon"><Icon name={item.type === 'manufacturer_approved' ? 'shield' : 'info'} size={17} /></span>
                  <span className="notification-item-copy">
                    <strong>{item.title}</strong>
                    <span>{item.message}</span>
                    <small>{formatNotificationDate(item.created_at)}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="notification-empty">No notifications yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
