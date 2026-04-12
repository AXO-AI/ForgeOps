import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBranches, getCommits, getRuns, getPulls, getReadme, timeAgo } from '../api';

function StatusBadge({ status }) {
  const colors = {
    completed: '#059669', success: '#059669', in_progress: '#d97706',
    queued: '#6b7280', failure: '#dc2626', cancelled: '#6b7280',
  };
  const s = (status || '').toLowerCase();
  const color = colors[s] || '#6b7280';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 12, background: color + '22', color, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {status || 'unknown'}
    </span>
  );
}

export default function RepoDetail() {
  const { owner, repo } = useParams();
  const [tab, setTab] = useState('overview');
  const [readme, setReadme] = useState(null);
  const [commits, setCommits] = useState([]);
  const [branches, setBranches] = useState([]);
  const [runs, setRuns] = useState([]);
  const [pulls, setPulls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      getReadme(owner, repo).then(setReadme).catch(() => setReadme(null)),
      getCommits(owner, repo).then(d => setCommits(Array.isArray(d) ? d : [])).catch(() => setCommits([])),
      getBranches(owner, repo).then(d => setBranches(Array.isArray(d) ? d : [])).catch(() => setBranches([])),
      getRuns(owner, repo).then(d => setRuns(Array.isArray(d?.workflow_runs) ? d.workflow_runs : Array.isArray(d) ? d : [])).catch(() => setRuns([])),
      getPulls(owner, repo).then(d => setPulls(Array.isArray(d) ? d : [])).catch(() => setPulls([])),
    ]).finally(() => setLoading(false));
  }, [owner, repo]);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'branches', label: `Branches (${branches.length})` },
    { key: 'runs', label: `Pipeline Runs (${runs.length})` },
    { key: 'pulls', label: `Pull Requests (${pulls.length})` },
  ];

  function decodeReadme() {
    if (!readme) return null;
    try {
      return atob(readme.content || '');
    } catch {
      return readme.content || '';
    }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, marginBottom: 16, color: 'var(--text-dim)' }}>
        <Link to="/repos" style={{ color: 'var(--accent)' }}>Repos</Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <span>{owner}/{repo}</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px', fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? 'var(--accent)' : 'var(--text-dim)',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-dim" style={{ padding: 40, textAlign: 'center' }}>Loading...</div>}

      {!loading && tab === 'overview' && (
        <div>
          {/* README */}
          {readme && (
            <div className="card mb-4">
              <div className="card-header">README</div>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13, lineHeight: 1.6, padding: 16, margin: 0, maxHeight: 400, overflow: 'auto' }}>
                {decodeReadme()}
              </pre>
            </div>
          )}

          {/* Recent commits */}
          <div className="card">
            <div className="card-header">Recent Commits</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>SHA</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Message</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Author</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {commits.slice(0, 20).map(c => (
                  <tr key={c.sha} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                      {c.sha?.substring(0, 7)}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 13 }}>
                      {c.commit?.message?.split('\n')[0] || ''}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-dim)' }}>
                      {c.commit?.author?.name || c.author?.login || ''}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-dim)' }}>
                      {timeAgo(c.commit?.author?.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && tab === 'branches' && (
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Branch</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Last Commit SHA</th>
              </tr>
            </thead>
            <tbody>
              {branches.map(b => (
                <tr key={b.name} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <Link to={`/repos/${owner}/${repo}/branch/${encodeURIComponent(b.name)}`} style={{ color: 'var(--accent)', fontWeight: 500 }}>
                      {b.name}
                    </Link>
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--text-dim)' }}>
                    {b.commit?.sha?.substring(0, 7) || '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === 'runs' && (
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Run</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Workflow</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Branch</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <StatusBadge status={r.conclusion || r.status} />
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <Link to={`/repos/${owner}/${repo}/runs/${r.id}`} style={{ color: 'var(--accent)', fontWeight: 500 }}>
                      #{r.run_number || r.id}
                    </Link>
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 13 }}>
                    {r.name || r.workflow?.name || '--'}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12 }}>
                    <code style={{ fontSize: 11, padding: '2px 6px', background: 'var(--bg)', borderRadius: 4 }}>
                      {r.head_branch || '--'}
                    </code>
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-dim)' }}>
                    {timeAgo(r.created_at || r.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === 'pulls' && (
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>#</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Title</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Branches</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Author</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {pulls.map(pr => (
                <tr key={pr.id || pr.number} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <StatusBadge status={pr.state || 'open'} />
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                    #{pr.number}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 13 }}>
                    {pr.title || '--'}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 11 }}>
                    <code style={{ padding: '2px 6px', background: 'var(--bg)', borderRadius: 4 }}>{pr.head?.ref || '--'}</code>
                    <span style={{ margin: '0 4px', color: 'var(--text-dim)' }}>&larr;</span>
                    <code style={{ padding: '2px 6px', background: 'var(--bg)', borderRadius: 4 }}>{pr.base?.ref || '--'}</code>
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-dim)' }}>
                    {pr.user?.login || '--'}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-dim)' }}>
                    {timeAgo(pr.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
