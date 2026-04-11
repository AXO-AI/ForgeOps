import { useState, useEffect } from 'react';
import { displayKey, typeIcon, statusColor, priorityColor, jiraGet, jiraPost, jiraPut } from '../api';

export default function TicketDetailPanel({ issue, onClose, onUpdate }) {
  const [transitions, setTransitions] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!issue) return;
    // Fetch transitions
    jiraGet(`/issue/${issue.key}/transitions`)
      .then((data) => setTransitions(data.transitions || []))
      .catch(() => setTransitions([]));
    // Fetch comments
    jiraGet(`/issue/${issue.key}/comment`)
      .then((data) => setComments(data.comments || []))
      .catch(() => setComments([]));
  }, [issue?.key]);

  if (!issue) return null;

  const status = issue.fields?.status?.name || '';
  const priority = issue.fields?.priority?.name || '';
  const assignee = issue.fields?.assignee?.displayName || 'Unassigned';
  const release = issue.fields?.fixVersions?.[0]?.name || 'None';

  const handleTransition = async (t) => {
    try {
      await jiraPost(`/issue/${issue.key}/transitions`, { transition: { id: t.id } });
      onUpdate?.();
    } catch (e) {
      console.error('Transition failed', e);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      await jiraPost(`/issue/${issue.key}/comment`, { body: newComment });
      setNewComment('');
      const data = await jiraGet(`/issue/${issue.key}/comment`);
      setComments(data.comments || []);
    } catch (err) {
      console.error('Add comment failed', err);
    }
    setLoading(false);
  };

  return (
    <>
      <div className="detail-overlay" onClick={onClose} />
      <div className="detail-panel">
        <button className="dp-close" onClick={onClose}>&times;</button>

        <div className="dp-header">
          <div className="dp-title">
            <span>{typeIcon(issue)}</span>
            <span style={{ color: 'var(--primary)' }}>{displayKey(issue)}</span>
            <span>{issue.fields?.summary}</span>
          </div>
        </div>

        <div className="dp-body">
          {/* Status transition buttons */}
          <div className="dp-field">
            <div className="dp-field-label">Transition</div>
            <div className="dp-actions">
              {transitions.map((t) => (
                <button key={t.id} className="btn btn-sm" onClick={() => handleTransition(t)}>
                  {t.name}
                </button>
              ))}
              {transitions.length === 0 && <span className="text-dim text-sm">No transitions available</span>}
            </div>
          </div>

          {/* Fields */}
          <div className="dp-field">
            <div className="dp-field-label">Status</div>
            <div className="dp-field-value">
              <span className="badge" style={{ background: `${statusColor(status)}22`, color: statusColor(status) }}>
                {status}
              </span>
            </div>
          </div>

          <div className="dp-field">
            <div className="dp-field-label">Priority</div>
            <div className="dp-field-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: priorityColor(priority), display: 'inline-block' }} />
              {priority || 'None'}
            </div>
          </div>

          <div className="dp-field">
            <div className="dp-field-label">Assignee</div>
            <div className="dp-field-value">{assignee}</div>
          </div>

          <div className="dp-field">
            <div className="dp-field-label">Release</div>
            <div className="dp-field-value">{release}</div>
          </div>

          {issue.fields?.description && (
            <div className="dp-field">
              <div className="dp-field-label">Description</div>
              <div className="dp-field-value" style={{ whiteSpace: 'pre-wrap', color: 'var(--dim)' }}>
                {typeof issue.fields.description === 'string'
                  ? issue.fields.description
                  : JSON.stringify(issue.fields.description, null, 2)}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="dp-comments">
            <div className="dp-field-label">Comments ({comments.length})</div>
            {comments.map((c, i) => (
              <div key={c.id || i} className="dp-comment">
                <div className="dp-comment-author">{c.author?.displayName || 'Unknown'}</div>
                <div className="dp-comment-body">
                  {typeof c.body === 'string' ? c.body : JSON.stringify(c.body)}
                </div>
                <div className="dp-comment-date">{c.created ? new Date(c.created).toLocaleString() : ''}</div>
              </div>
            ))}

            <form onSubmit={handleAddComment} style={{ marginTop: 12 }}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
              />
              <button type="submit" className="btn btn-primary btn-sm mt-2" disabled={loading}>
                {loading ? 'Posting...' : 'Add Comment'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
