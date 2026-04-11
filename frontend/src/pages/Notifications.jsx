import { useState } from 'react';
import { sendTeamsNotification } from '../api';

export default function Notifications() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState([]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    try {
      await sendTeamsNotification({
        title,
        text: message,
        themeColor: '4f46e5',
      });
      setSent([{ title, message, time: new Date().toLocaleTimeString() }, ...sent]);
      setTitle('');
      setMessage('');
    } catch (e) {
      console.error('Notification failed', e);
    }
    setSending(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Notifications</h1>
        <p>Send Teams notifications and manage alerts</p>
      </div>

      <div className="card mb-4">
        <div className="card-header">Send Notification</div>
        <div className="form-group mb-2">
          <label>Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" />
        </div>
        <div className="form-group mb-2">
          <label>Message</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Notification message..." />
        </div>
        <button className="btn btn-primary" onClick={handleSend} disabled={sending}>
          {sending ? 'Sending...' : 'Send to Teams'}
        </button>
      </div>

      {sent.length > 0 && (
        <div className="card">
          <div className="card-header">Sent Notifications</div>
          {sent.map((n, i) => (
            <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
              <div className="text-dim text-sm">{n.message}</div>
              <div className="text-dim text-sm" style={{ marginTop: 4 }}>Sent at {n.time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
