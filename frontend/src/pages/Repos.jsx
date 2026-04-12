import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRepos, timeAgo } from '../api';

const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219',
  Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', 'C#': '#178600', HTML: '#e34c26',
  CSS: '#563d7c', Shell: '#89e051', PHP: '#4F5D95', Swift: '#F05138', Kotlin: '#A97BFF',
};

export default function Repos() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [sortBy, setSortBy] = useState('pushed');

  useEffect(() => {
    getRepos()
      .then(d => setRepos(Array.isArray(d) ? d : []))
      .catch(() => setRepos([]))
      .finally(() => setLoading(false));
  }, []);

  const languages = [...new Set(repos.map(r => r.language).filter(Boolean))].sort();

  let filtered = repos.filter(r => {
    if (search && !r.name?.toLowerCase().includes(search.toLowerCase()) && !r.description?.toLowerCase().includes(search.toLowerCase())) return false;
    if (langFilter && r.language !== langFilter) return false;
    return true;
  });

  if (sortBy === 'pushed') {
    filtered.sort((a, b) => new Date(b.pushed_at || 0) - new Date(a.pushed_at || 0));
  } else if (sortBy === 'name') {
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search repositories..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select value={langFilter} onChange={e => setLangFilter(e.target.value)}>
          <option value="">All Languages</option>
          {languages.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="pushed">Last Push</option>
          <option value="name">Name</option>
        </select>
      </div>

      {loading ? (
        <div className="text-dim" style={{ padding: 40, textAlign: 'center' }}>Loading repositories...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state-box">
          <div className="empty-icon">&#x1F4E6;</div>
          <div className="empty-title">No repositories found</div>
          <div className="empty-desc">No repositories match your search or filter criteria. Try adjusting your filters or configure your GitHub organization in Settings.</div>
          <a href="/settings" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>Configure GitHub</a>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Repository</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Description</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Language</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Last Push</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Branches</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>CI</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const owner = r.owner?.login || r.full_name?.split('/')[0] || '';
                const name = r.name || '';
                return (
                  <tr key={r.id || r.full_name} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <Link to={`/repos/${owner}/${name}`} style={{ fontWeight: 600, color: 'var(--accent)' }}>
                        {r.full_name || name}
                      </Link>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: 13 }}>
                      {r.description || '--'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>
                      {r.language && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: LANG_COLORS[r.language] || '#6b7280', display: 'inline-block' }} />
                          {r.language}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-dim)' }}>
                      {timeAgo(r.pushed_at)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: 'var(--text-dim)' }}>
                      --
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: 'var(--text-dim)' }}>
                      --
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
