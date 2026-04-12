import { useState, useEffect } from 'react';
import { sendTeamsNotification } from '../api';

const STORAGE_KEY = 'fg_notification_log';

function loadNotifications() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveNotifications(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 100)));
}

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pipeline', label: 'Pipelines' },
  { key: 'merge', label: 'Merges' },
  { key: 'jira', label: 'Jira' },
  { key: 'security', label: 'Security' },
  { key: 'deployment', label: 'Deployments' },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setNotifications(loadNotifications());
  }, []);

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    saveNotifications(updated);
  };

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotifications(updated);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    try {
      await sendTeamsNotification({ title, text: message, themeColor: '4f46e5' });
      setToast('Notification sent to Teams');
      setTimeout(() => setToast(null), 3000);
      const newNotif = {
        id: Date.now(),
        type: 'deployment',
        icon: '\uD83D\uDCE2',
        title: `Sent: ${title}`,
        desc: message,
        time: new Date().toISOString(),
        read: true,
      };
      const updated = [newNotif, ...notifications];
      setNotifications(updated);
      saveNotifications(updated);
      setTitle('');
      setMessage('');
    } catch (e) {
      setToast('Failed to send notification');
      setTimeout(() => setToast(null), 3000);
    }
    setSending(false);
  };

  const formatTime = (t) => {
    if (!t) return '';
    try {
      const d = new Date(t);
      if (isNaN(d.getTime())) return t;
      const now = Date.now();
      const diff = now - d.getTime();
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
      return `${Math.floor(diff / 86400000)} days ago`;
    } catch { return t; }
  };

  return (
    <div>
      {toast && <div className="toast toast-info">{toast}</div>}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Notifications</h1>
          <p>Activity feed and Teams notification center</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-sm" onClick={markAllRead}>
            Mark all read ({unreadCount})
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="tabs">
        {FILTER_TABS.map(t => {
          const count = t.key === 'all' ? notifications.length : notifications.filter(n => n.type === t.key).length;
          return (
            <button
              key={t.key}
              className={`tab-btn ${filter === t.key ? 'active' : ''}`}
              onClick={() => setFilter(t.key)}
            >
              {t.label} <span className="text-dim" style={{ fontSize: 11, marginLeft: 4 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Notification Feed */}
      <div className="card mb-4">
        <div className="card-header">
          <span style={{ flex: 1 }}>Activity Feed</span>
          {unreadCount > 0 && <span className="badge badge-primary badge-pulse">{unreadCount} unread</span>}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state-box">
            <div className="empty-icon">&#x1F514;</div>
            <div className="empty-title">No notifications yet</div>
            <div className="empty-desc">Notifications appear when you merge, deploy, or run security scans.</div>
          </div>
        ) : (
          <div>
            {filtered.map(n => (
              <div
                key={n.id}
                className={`notif-item ${n.read ? '' : 'unread'}`}
                onClick={() => markAsRead(n.id)}
              >
                <div className="notif-icon">{n.icon}</div>
                <div className="notif-body">
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-desc">{n.desc}</div>
                </div>
                <div className="notif-time">{formatTime(n.time)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send to Teams */}
      <div className="card">
        <div className="card-header">Send Teams Notification</div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" />
          </div>
        </div>
        <div className="form-group mb-2">
          <label>Message</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Notification message..." />
        </div>
        <button className="btn btn-primary" onClick={handleSend} disabled={sending || !title.trim() || !message.trim()}>
          {sending ? 'Sending...' : 'Send to Teams'}
        </button>
      </div>
    </div>
  );
}
