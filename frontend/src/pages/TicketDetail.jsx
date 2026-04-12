import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { jiraGet, jiraPost, displayKey, typeIcon, statusColor } from '../api';

export default function TicketDetail() {
  const { key } = useParams();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    loadIssue();
  }, [key]);

  async function loadIssue() {
    setLoading(true);
    try {
      const [issueData, commentsData, transData] = await Promise.all([
        jiraGet(`/issue/${key}`),
        jiraGet(`/issue/${key}/comment`).catch(() => ({ comments: [] })),
        jiraGet(`/issue/${key}/transitions`).catch(() => ({ transitions: [] })),
      ]);
      setIssue(issueData);
      setComments(commentsData?.comments || []);
      setTransitions(transData?.transitions || []);
    } catch (e) {
      console.error('Failed to load ticket', e);
    }
    setLoading(false);
  }

  async function addComment() {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await jiraPost(`/issue/${key}/comment`, { body: newComment });
      setNewComment('');
      const data = await jiraGet(`/issue/${key}/comment`).catch(() => ({ comments: [] }));
      setComments(data?.comments || []);
    } catch (e) {
      console.error('Failed to add comment', e);
    }
    setSubmitting(false);
  }

  async function doTransition(transitionId) {
    setTransitioning(true);
    try {
      await jiraPost(`/issue/${key}/transitions`, { transition: { id: transitionId } });
      await loadIssue();
    } catch (e) {
      console.error('Transition failed', e);
    }
    setTransitioning(false);
  }

  if (loading) return <div className="text-dim" style={{ padding: 40, textAlign: 'center' }}>Loading ticket...</div>;
  if (!issue) return <div className="text-dim" style={{ padding: 40, textAlign: 'center' }}>Ticket not found</div>;

  const fields = issue.fields || {};
  const status = fields.status?.name || '';
  const priority = fields.priority?.name || '';
  const assignee = fields.assignee?.displayName || 'Unassigned';
  const release = (fields.fixVersions || []).map(v => v.name).join(', ') || 'None';
  const description = fields.description || '';

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, marginBottom: 16, color: 'var(--text-dim)' }}>
        <Link to="/alm-jira" style={{ color: 'var(--accent)' }}>ALM</Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <span>{displayKey(issue)}</span>
      </div>

      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 22 }}>{typeIcon(issue)}</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>{displayKey(issue)}</span>
        <h2 style={{ margin: 0, fontSize: 20, flex: 1 }}>{fields.summary || ''}</h2>
      </div>

      {/* Status + transitions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-block', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600,
          background: statusColor(status) + '22', color: statusColor(status),
        }}>
          {status}
        </span>
        {transitions.map(t => (
          <button
            key={t.id}
            onClick={() => doTransition(t.id)}
            disabled={transitioning}
            className="btn btn-sm"
            style={{ fontSize: 11 }}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div className="card mb-4" style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>Priority</div>
            <div style={{ fontSize: 14 }}>{priority}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>Assignee</div>
            <div style={{ fontSize: 14 }}>{assignee}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>Release</div>
            <div style={{ fontSize: 14 }}>{release}</div>
          </div>
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="card mb-4">
          <div className="card-header">Description</div>
          <div style={{ padding: 16, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {typeof description === 'string' ? description : JSON.stringify(description, null, 2)}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="card">
        <div className="card-header">Comments ({comments.length})</div>
        <div style={{ padding: 16 }}>
          {comments.length === 0 && <div className="text-dim" style={{ marginBottom: 12 }}>No comments yet</div>}
          {comments.map((c, i) => (
            <div key={c.id || i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < comments.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{c.author?.displayName || 'Unknown'}</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  {c.created ? new Date(c.created).toLocaleString() : ''}
                </span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {typeof c.body === 'string' ? c.body : JSON.stringify(c.body, null, 2)}
              </div>
            </div>
          ))}

          {/* Add comment */}
          <div style={{ marginTop: 12 }}>
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              style={{ width: '100%', resize: 'vertical', marginBottom: 8 }}
            />
            <button
              onClick={addComment}
              disabled={submitting || !newComment.trim()}
              className="btn btn-primary btn-sm"
            >
              {submitting ? 'Posting...' : 'Add Comment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
