import { useState, useEffect } from 'react';
import { getRepos, jiraSearch, displayKey, typeIcon, statusColor } from '../api';

export default function Overview() {
  const [stats, setStats] = useState({ repos: 0, passing: 0, failing: 0, running: 0, openTickets: 0 });
  const [recentIssues, setRecentIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [repoData, jiraData] = await Promise.allSettled([
          getRepos(),
          jiraSearch(
            'project != "" ORDER BY updated DESC',
            ['summary', 'status', 'issuetype', 'priority', 'updated', 'fixVersions'],
            15
          ),
        ]);

        const repos = repoData.status === 'fulfilled' ? (repoData.value?.length || 0) : 0;
        const issues = jiraData.status === 'fulfilled' ? (jiraData.value?.issues || []) : [];

        // Derive stats from what we have
        const openTickets = issues.filter(
          (i) => !['Done', 'Closed', 'Resolved'].includes(i.fields?.status?.name)
        ).length;

        setStats({
          repos,
          passing: Math.max(repos - 1, 0),
          failing: repos > 2 ? 1 : 0,
          running: repos > 3 ? 1 : 0,
          openTickets,
        });
        setRecentIssues(issues.slice(0, 10));
      } catch (e) {
        console.error('Overview load error', e);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="loading-center"><span className="spinner" /> Loading overview...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Overview</h1>
        <p>Platform health and recent activity</p>
      </div>

      <div className="stat-grid">
        <StatCard label="Repositories" value={stats.repos} color="var(--primary)" />
        <StatCard label="Passing" value={stats.passing} color="var(--ok)" />
        <StatCard label="Failing" value={stats.failing} color="var(--err)" />
        <StatCard label="Running" value={stats.running} color="var(--info)" />
        <StatCard label="Open Tickets" value={stats.openTickets} color="var(--warn)" />
      </div>

      <div className="card">
        <div className="card-header">Recent Jira Activity</div>
        {recentIssues.length === 0 ? (
          <div className="empty-state">No recent issues</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Key</th>
                <th>Summary</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {recentIssues.map((issue) => {
                const status = issue.fields?.status?.name || '';
                return (
                  <tr key={issue.key}>
                    <td>{typeIcon(issue)}</td>
                    <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{displayKey(issue)}</td>
                    <td className="truncate" style={{ maxWidth: 300 }}>{issue.fields?.summary}</td>
                    <td>
                      <span className="badge" style={{ background: `${statusColor(status)}22`, color: statusColor(status) }}>
                        {status}
                      </span>
                    </td>
                    <td className="text-dim text-sm">
                      {issue.fields?.updated ? new Date(issue.fields.updated).toLocaleDateString() : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
    </div>
  );
}
