import { useState, useEffect, useRef } from 'react';
import { getNotifications, markRead, markAllRead } from '../../api/notificationsApi';
import { formatDate } from '../../utils/formatCurrency';

export default function NotificationBell() {
  const [open,         setOpen]         = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const bellRef = useRef(null);

  const load = async () => {
    try {
      const data = await getNotifications({ limit: 10 });
      setNotifications(data.data);
      setUnreadCount(data.pagination.unreadCount);
    } catch { /* silently ignore */ }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000); // poll every minute
    return () => clearInterval(id);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e) => { if (!bellRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id) => {
    await markRead(id);
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAll = async () => {
    await markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <div ref={bellRef} style={{ position: 'relative' }}>
      <button
        style={styles.bell}
        onClick={() => setOpen(o => !o)}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        🔔
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.dropHeader}>
            <span style={styles.dropTitle}>Notifications</span>
            {unreadCount > 0 && (
              <button style={styles.markAllBtn} onClick={handleMarkAll}>Mark all read</button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p style={styles.empty}>No notifications</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                style={{ ...styles.item, ...(n.isRead ? {} : styles.itemUnread) }}
                onClick={() => !n.isRead && handleMarkRead(n._id)}
              >
                <p style={styles.itemTitle}>{n.title}</p>
                <p style={styles.itemMsg}>{n.message}</p>
                <p style={styles.itemDate}>{formatDate(n.createdAt)}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  bell:       { background: 'none', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '1rem', position: 'relative' },
  badge:      { position: 'absolute', top: '-6px', right: '-6px', background: 'var(--color-danger)', color: '#fff', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, minWidth: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' },
  dropdown:   { position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: '320px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', boxShadow: 'var(--shadow-md)', zIndex: 300, maxHeight: '400px', overflowY: 'auto' },
  dropHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)' },
  dropTitle:  { fontWeight: 600, fontSize: '0.9rem' },
  markAllBtn: { background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.8rem' },
  empty:      { padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' },
  item:       { padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' },
  itemUnread: { background: 'rgba(59,130,246,0.05)' },
  itemTitle:  { fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.2rem', color: 'var(--color-text)' },
  itemMsg:    { fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' },
  itemDate:   { fontSize: '0.72rem', color: 'var(--color-text-muted)' },
};
