import { useState, useEffect } from 'react';
import { jiraSearch, displayKey, typeIcon, statusColor } from '../api';
import TicketDetailPanel from '../components/TicketDetailPanel';

const ENVS = [
  { name: 'INT', label: 'Integration', color: 'var(--info)' },
  { name: 'QA', label: 'Quality Assurance', color: 'var(--warn)' },
  { name: 'STAGE', label: 'Staging', color: 'var(--primary)' },
  { name: 'PROD', label: 'Production', color: 'var(--ok)' },
];

export default function Environments() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [detailTicket, setDetailTicket] = useState(null);

  async function loadIssues() {
    setLoading(true);
    try {
      const data = await jiraSearch(
        'project != "" ORDER BY status ASC, priority DESC',
        ['summary', 'status', 'issuetype', 'priority', 'labels', 'fixVersions'],
        200
      );
      setIssues(data?.issues || []);
    } catch (e) {
      console.error('Environments load error', e);
    }
    setLoading(false);
  }

  useEffect(() => { loadIssues(); }, []);

  // Assign issues to environments based on status
  function getEnvIssues(envName) {
    return issues.filter((i) => {
      const status = (i.fields?.status?.name || '').toLowerCase();
      const labels = (i.fields?.labels || []).map((l) => l.toLowerCase());

      // Check labels first
      if (labels.includes(envName.toLowerCase())) return true;

      // Heuristic based on status
      switch (envName) {
        case 'INT':
          return status.includes('progress') || status.includes('development');
        case 'QA':
          return status.includes('test') || status.includes('qa') || status.includes('review');
        case 'STAGE':
          return status.includes('stag') || status.includes('uat');
        case 'PROD':
          return status.includes('done') || status.includes('closed') || status.includes('resolved');
        default:
          return false;
      }
    });
  }

  if (loading) {
    return <div className="loading-center"><span className="spinner" /> Loading environments...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Environments</h1>
        <p>Track ticket progression across environments</p>
      </div>

      <div className="env-grid">
        {ENVS.map((env) => {
          const envIssues = getEnvIssues(env.name);
          const isExpanded = expanded[env.name];

          return (
            <div key={env.name} className="env-card">
              <div className="env-card-header">
                <div>
                  <div className="env-name" style={{ color: env.color }}>{env.name}</div>
                  <div className="text-dim text-sm">{env.label}</div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: env.color }}>
                  {envIssues.length}
                </div>
              </div>

              <div className="env-card-body">
                <button
                  className="btn btn-sm w-full mb-2"
                  onClick={() => setExpanded({ ...expanded, [env.name]: !isExpanded })}
                >
                  {isExpanded ? 'Hide' : 'Show'} Tickets
                </button>

                {isExpanded && (
                  <>
                    {envIssues.length === 0 ? (
                      <div className="empty-state">No tickets</div>
                    ) : (
                      envIssues.map((issue) => {
                        const status = issue.fields?.status?.name || '';
                        return (
                          <div
                            key={issue.key}
                            className="ticket-row"
                            onClick={() => setDetailTicket(issue)}
                          >
                            <span className="ticket-type">{typeIcon(issue)}</span>
                            <span className="ticket-key">{displayKey(issue)}</span>
                            <span className="ticket-summary">{issue.fields?.summary}</span>
                            <span
                              className="badge status-badge"
                              style={{ background: `${statusColor(status)}22`, color: statusColor(status) }}
                            >
                              {status}
                            </span>
                          </div>
                        );
                      })
                    )}

                    {envIssues.length > 0 && env.name !== 'PROD' && (
                      <button
                        className="btn btn-ok btn-sm w-full mt-2"
                        onClick={() => alert(`Mark ${envIssues.length} tickets as complete in ${env.name}`)}
                      >
                        Mark Complete in {env.name}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
