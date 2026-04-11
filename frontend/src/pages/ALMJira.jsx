import { useState, useEffect } from 'react';
import { jiraSearch, displayKey, typeIcon, statusColor, priorityColor } from '../api';
import TicketRow from '../components/TicketRow';
import TicketDetailPanel from '../components/TicketDetailPanel';

const BOARD_COLUMNS = ['To Do', 'In Progress', 'In Review', 'Done'];

export default function ALMJira() {
  const [tab, setTab] = useState('board');
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailTicket, setDetailTicket] = useState(null);

  async function loadIssues() {
    setLoading(true);
    try {
      const data = await jiraSearch(
        'project != "" ORDER BY status ASC, priority DESC',
        ['summary', 'status', 'issuetype', 'priority', 'assignee', 'fixVersions', 'updated'],
        200
      );
      setIssues(data?.issues || []);
    } catch (e) {
      console.error('ALMJira load error', e);
    }
    setLoading(false);
  }

  useEffect(() => { loadIssues(); }, []);

  const stories = issues.filter((i) => i.fields?.issuetype?.name === 'Story');
  const defects = issues.filter((i) => i.fields?.issuetype?.name === 'Bug');
  const tasks = issues.filter((i) => !['Story', 'Bug', 'Epic'].includes(i.fields?.issuetype?.name));

  // Group into kanban columns
  const columnMap = {};
  BOARD_COLUMNS.forEach((c) => (columnMap[c] = []));
  issues.forEach((issue) => {
    const status = issue.fields?.status?.name || '';
    let col = 'To Do';
    if (status.toLowerCase().includes('progress')) col = 'In Progress';
    else if (status.toLowerCase().includes('review') || status.toLowerCase().includes('test') || status.toLowerCase().includes('qa')) col = 'In Review';
    else if (status.toLowerCase().includes('done') || status.toLowerCase().includes('closed') || status.toLowerCase().includes('resolved')) col = 'Done';
    if (columnMap[col]) columnMap[col].push(issue);
  });

  // Stats
  const openCount = issues.filter((i) => !['Done', 'Closed', 'Resolved'].includes(i.fields?.status?.name)).length;
  const doneCount = issues.length - openCount;

  if (loading) {
    return <div className="loading-center"><span className="spinner" /> Loading ALM data...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>ALM / Jira</h1>
        <p>Manage stories, defects, and tasks</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Tickets</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{issues.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Open</div>
          <div className="stat-value" style={{ color: 'var(--warn)' }}>{openCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Done</div>
          <div className="stat-value" style={{ color: 'var(--ok)' }}>{doneCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Stories</div>
          <div className="stat-value" style={{ color: 'var(--info)' }}>{stories.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Defects</div>
          <div className="stat-value" style={{ color: 'var(--err)' }}>{defects.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn${tab === 'board' ? ' active' : ''}`} onClick={() => setTab('board')}>Board</button>
        <button className={`tab-btn${tab === 'stories' ? ' active' : ''}`} onClick={() => setTab('stories')}>Stories</button>
        <button className={`tab-btn${tab === 'defects' ? ' active' : ''}`} onClick={() => setTab('defects')}>Defects</button>
      </div>

      {/* Board view */}
      {tab === 'board' && (
        <div className="kanban-board">
          {BOARD_COLUMNS.map((col) => (
            <div key={col} className="kanban-column">
              <div className="kanban-column-header">
                {col}
                <span className="col-count">{columnMap[col].length}</span>
              </div>
              {columnMap[col].map((issue) => (
                <div key={issue.key} className="kanban-card" onClick={() => setDetailTicket(issue)}>
                  <div className="kc-key">{typeIcon(issue)} {displayKey(issue)}</div>
                  <div className="kc-summary">{issue.fields?.summary}</div>
                  <div className="kc-footer">
                    <span
                      className="priority-dot"
                      style={{ width: 8, height: 8, borderRadius: '50%', background: priorityColor(issue.fields?.priority?.name) }}
                    />
                    <span className="text-dim text-sm">{issue.fields?.assignee?.displayName || 'Unassigned'}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Stories table */}
      {tab === 'stories' && (
        <div className="card">
          {stories.length === 0 ? (
            <div className="empty-state">No stories found</div>
          ) : (
            stories.map((issue) => (
              <TicketRow key={issue.key} issue={issue} onClick={() => setDetailTicket(issue)} />
            ))
          )}
        </div>
      )}

      {/* Defects table */}
      {tab === 'defects' && (
        <div className="card">
          {defects.length === 0 ? (
            <div className="empty-state">No defects found</div>
          ) : (
            defects.map((issue) => (
              <TicketRow key={issue.key} issue={issue} onClick={() => setDetailTicket(issue)} />
            ))
          )}
        </div>
      )}

      {/* Detail panel */}
      {detailTicket && (
        <TicketDetailPanel
          issue={detailTicket}
          onClose={() => setDetailTicket(null)}
          onUpdate={() => loadIssues()}
        />
      )}
    </div>
  );
}
