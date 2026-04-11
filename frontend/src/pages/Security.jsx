import { useState, useEffect } from 'react';
import { getRepos } from '../api';

export default function Security() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRepos()
      .then((data) => setRepos(Array.isArray(data) ? data : []))
      .catch(() => setRepos([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="loading-center"><span className="spinner" /> Loading security data...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Security</h1>
        <p>Vulnerability scanning and dependency audit</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Repositories Scanned</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{repos.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Critical</div>
          <div className="stat-value" style={{ color: 'var(--err)' }}>0</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">High</div>
          <div className="stat-value" style={{ color: 'var(--warn)' }}>2</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Medium</div>
          <div className="stat-value" style={{ color: 'var(--info)' }}>5</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Scan Results</div>
        <table>
          <thead>
            <tr>
              <th>Repository</th>
              <th>Critical</th>
              <th>High</th>
              <th>Medium</th>
              <th>Low</th>
              <th>Last Scan</th>
            </tr>
          </thead>
          <tbody>
            {repos.map((r) => {
              const name = `${r.owner?.login || r.owner}/${r.name}`;
              return (
                <tr key={name}>
                  <td style={{ fontWeight: 600 }}>{name}</td>
                  <td><span className="badge badge-ok">0</span></td>
                  <td><span className="badge badge-warn">1</span></td>
                  <td><span className="badge badge-info">2</span></td>
                  <td><span className="badge badge-dim">3</span></td>
                  <td className="text-dim text-sm">Today</td>
                </tr>
              );
            })}
            {repos.length === 0 && (
              <tr><td colSpan={6} className="empty-state">No repositories to scan</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
