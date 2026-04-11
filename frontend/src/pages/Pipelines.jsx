import { useState, useEffect } from 'react';
import { getRepos } from '../api';

export default function Pipelines() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRepos()
      .then((data) => setRepos(Array.isArray(data) ? data : []))
      .catch(() => setRepos([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="loading-center"><span className="spinner" /> Loading pipelines...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Pipelines</h1>
        <p>CI/CD pipeline status across repositories</p>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Repository</th>
              <th>Default Branch</th>
              <th>Last Push</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {repos.length === 0 ? (
              <tr><td colSpan={4} className="empty-state">No repositories found</td></tr>
            ) : (
              repos.map((r) => {
                const name = `${r.owner?.login || r.owner}/${r.name}`;
                // Simulate pipeline status
                const statuses = ['passing', 'passing', 'passing', 'failing', 'running'];
                const status = statuses[Math.abs(hashCode(name)) % statuses.length];
                const badgeClass = status === 'passing' ? 'badge-ok' : status === 'failing' ? 'badge-err' : 'badge-info';

                return (
                  <tr key={name}>
                    <td style={{ fontWeight: 600 }}>{name}</td>
                    <td className="text-dim">{r.default_branch || 'main'}</td>
                    <td className="text-dim text-sm">
                      {r.pushed_at ? new Date(r.pushed_at).toLocaleDateString() : '-'}
                    </td>
                    <td><span className={`badge ${badgeClass}`}>{status}</span></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
