import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCommits, timeAgo } from '../api';

export default function BranchDetail() {
  const { owner, repo, branchName } = useParams();
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCommits(owner, repo, branchName)
      .then(d => setCommits(Array.isArray(d) ? d : []))
      .catch(() => setCommits([]))
      .finally(() => setLoading(false));
  }, [owner, repo, branchName]);

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, marginBottom: 16, color: 'var(--text-dim)' }}>
        <Link to="/repos" style={{ color: 'var(--accent)' }}>Repos</Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <Link to={`/repos/${owner}/${repo}`} style={{ color: 'var(--accent)' }}>{repo}</Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <span>Branches</span>
        <span style={{ margin: '0 6px' }}>/</span>
        <span>{decodeURIComponent(branchName)}</span>
      </div>

      <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>
        <code style={{ padding: '4px 10px', background: 'var(--bg)', borderRadius: 6, fontSize: 15 }}>
          {decodeURIComponent(branchName)}
        </code>
      </h3>

      {loading ? (
        <div className="text-dim" style={{ padding: 40, textAlign: 'center' }}>Loading commits...</div>
      ) : (
        <div className="card">
          <div className="card-header">Commits ({commits.length})</div>
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
              {commits.map(c => (
                <tr key={c.sha} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--text-dim)' }}>
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
      )}
    </div>
  );
}
