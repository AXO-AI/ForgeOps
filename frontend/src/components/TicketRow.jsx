import { useState } from 'react';
import { displayKey, typeIcon, statusColor, priorityColor, jiraGet, jiraPost } from '../api';

export default function TicketRow({ issue, selected, onClick, onViewDetail, onRefresh }) {
  if (!issue) return null;
  const status = issue.fields?.status?.name || '';
  const priority = issue.fields?.priority?.name || '';
  const isBug = issue.fields?.issuetype?.name === 'Bug';
  const [showTransitions, setShowTransitions] = useState(false);
  const [transitions, setTransitions] = useState([]);
  const [transitioning, setTransitioning] = useState(false);

  async function loadTransitions(e) {
    e.stopPropagation();
    if (showTransitions) { setShowTransitions(false); return; }
    try {
      const data = await jiraGet('/issue/' + issue.key + '/transitions');
      setTransitions(data?.transitions || []);
      setShowTransitions(true);
    } catch (err) {
      console.error('Failed to load transitions:', err);
    }
  }

  async function doTransition(e, tid, name) {
    e.stopPropagation();
    setTransitioning(true);
    try {
      await jiraPost('/issue/' + issue.key + '/transition', { transitionId: tid });
      setShowTransitions(false);
      setTransitioning(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Transition failed:', err);
      setTransitioning(false);
    }
  }

  return (
    <div
      className={`ticket-row${selected ? ' selected' : ''}`}
      style={{ borderLeft: isBug ? '2px solid var(--error)' : '2px solid transparent' }}
      onClick={() => onClick?.(issue)}
    >
      <span className="ticket-type">{typeIcon(issue)}</span>
      <span className="ticket-key" style={{ color: isBug ? 'var(--error)' : 'var(--primary)' }}>
        {displayKey(issue)}
      </span>
      <span className="ticket-summary">{issue.fields?.summary || ''}</span>
      <span
        className="priority-dot"
        style={{ background: priorityColor(priority) }}
        title={priority}
      />
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <span
          className="badge status-badge"
          style={{
            background: `${statusColor(status)}22`,
            color: statusColor(status),
            cursor: 'pointer',
          }}
          onClick={loadTransitions}
          title="Click to change status"
        >
          {transitioning ? '...' : status} {'\u25BE'}
        </span>
        {showTransitions && transitions.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              zIndex: 20,
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,.15)',
              minWidth: 160,
              padding: 4,
              marginTop: 2,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {transitions.map((t) => (
              <div
                key={t.id}
                style={{
                  padding: '6px 10px',
                  fontSize: 11,
                  cursor: 'pointer',
                  borderRadius: 4,
                }}
                className="hover-bg"
                onClick={(e) => doTransition(e, t.id, t.name)}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {t.name}
              </div>
            ))}
          </div>
        )}
      </div>
      {onViewDetail && (
        <button
          className="btn btn-sm"
          style={{ flexShrink: 0, padding: '2px 6px', fontSize: 10 }}
          onClick={(e) => { e.stopPropagation(); onViewDetail(issue); }}
        >
          &#x2197;
        </button>
      )}
    </div>
  );
}
