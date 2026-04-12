import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { compareBranches } from '../api';

function DiffView({ patch }) {
  if (!patch) return <div className="text-dim text-sm" style={{ padding: 8 }}>No diff available</div>;
  const lines = patch.split('\n');
  let oldLine = 0, newLine = 0;
  const parsed = lines.map(line => {
    if (line.startsWith('@@')) {
      const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)/);
      if (m) { oldLine = parseInt(m[1]) - 1; newLine = parseInt(m[2]) - 1; }
      return { type: 'hunk', text: line, old: '', new: '' };
    }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      newLine++;
      return { type: 'add', text: line.substring(1), old: '', new: newLine };
    }
    if (line.startsWith('-') && !line.startsWith('---')) {
      oldLine++;
      return { type: 'del', text: line.substring(1), old: oldLine, new: '' };
    }
    oldLine++; newLine++;
    return { type: 'ctx', text: line.startsWith(' ') ? line.substring(1) : line, old: oldLine, new: newLine };
  });

  return (
    <div style={{ background: '#0d1117', borderRadius: 6, overflow: 'auto', fontSize: 12, fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace", border: '1px solid #30363d', marginBottom: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {parsed.map((l, i) => {
            const bg = l.type === 'add' ? 'rgba(46,160,67,0.15)' : l.type === 'del' ? 'rgba(248,81,73,0.15)' : l.type === 'hunk' ? 'rgba(79,70,229,0.1)' : 'transparent';
            const color = l.type === 'add' ? '#7ee787' : l.type === 'del' ? '#f47067' : l.type === 'hunk' ? '#a5b4fc' : '#c9d1d9';
            const marker = l.type === 'add' ? '+' : l.type === 'del' ? '-' : l.type === 'hunk' ? '' : ' ';
            return (
              <tr key={i} style={{ background: bg }}>
                <td style={{ width: 44, textAlign: 'right', padding: '0 6px', color: '#484f58', userSelect: 'none', fontSize: 11, borderRight: '1px solid #21262d', verticalAlign: 'top', lineHeight: '20px' }}>{l.old}</td>
                <td style={{ width: 44, textAlign: 'right', padding: '0 6px', color: '#484f58', userSelect: 'none', fontSize: 11, borderRight: '1px solid #21262d', verticalAlign: 'top', lineHeight: '20px' }}>{l.new}</td>
                <td style={{ width: 14, textAlign: 'center', color: l.type === 'add' ? '#3fb950' : l.type === 'del' ? '#f85149' : '#484f58', userSelect: 'none', fontWeight: 700, lineHeight: '20px' }}>{marker}</td>
                <td style={{ color, padding: '0 12px', whiteSpace: 'pre', lineHeight: '20px', overflow: 'visible' }}>{l.text}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FileStatusIcon({ status }) {
  const map = { added: '\u{1F7E2}', modified: '\u{1F7E1}', removed: '\u{1F534}', renamed: '\u{1F504}' };
  return <span title={status}>{map[status] || '\u{1F7E1}'}</span>;
}

export default function Compare() {
  const { owner, repo, spec } = useParams();
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedFiles, setExpandedFiles] = useState({});

  // Parse base...head from spec
  const parts = (spec || '').split('...');
  const base = parts[0] || '';
  const head = parts[1] || '';

  useEffect(() => {
    if (!base || !head) return;
    setLoading(true);
    compareBranches(owner, repo, base, head)
      .then(d => {
        setComparison(d);
        const exp = {};
        (d?.files || []).forEach(f => { exp[f.filename] = true; });
        setExpandedFiles(exp);
      })
      .catch(() => setComparison(null))
      .finally(() => setLoading(false));
  }, [owner, repo, base, head]);

  const files = comparison?.files || [];
  const totalAdds = files.reduce((s, f) => s + (f.additions || 0), 0);
  const totalDels = files.reduce((s, f) => s + (f.deletions || 0), 0);

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, marginBottom: 16, color: 'var(--text-dim)' }}>
        <Link to="/repos" style={{ color: 'var(--accent)' }}>Repos</Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <Link to={`/repos/${owner}/${repo}`} style={{ color: 'var(--accent)' }}>{repo}</Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <span>Compare</span>
      </div>

      <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>
        <code style={{ fontSize: 14, padding: '3px 8px', background: 'var(--bg)', borderRadius: 4 }}>{base}</code>
        <span style={{ margin: '0 8px', color: 'var(--text-dim)' }}>&larr;</span>
        <code style={{ fontSize: 14, padding: '3px 8px', background: 'var(--bg)', borderRadius: 4 }}>{head}</code>
      </h3>

      {loading ? (
        <div className="text-dim" style={{ padding: 40, textAlign: 'center' }}>Loading comparison...</div>
      ) : !comparison ? (
        <div className="text-dim" style={{ padding: 40, textAlign: 'center' }}>Could not load comparison</div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <div className="card" style={{ flex: 1, minWidth: 120, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{comparison.ahead_by || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Ahead</div>
            </div>
            <div className="card" style={{ flex: 1, minWidth: 120, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{comparison.behind_by || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Behind</div>
            </div>
            <div className="card" style={{ flex: 1, minWidth: 120, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{files.length}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Files Changed</div>
            </div>
            <div className="card" style={{ flex: 1, minWidth: 120, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#3fb950' }}>+{totalAdds}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Additions</div>
            </div>
            <div className="card" style={{ flex: 1, minWidth: 120, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f85149' }}>-{totalDels}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Deletions</div>
            </div>
          </div>

          {/* Files */}
          {files.map(f => (
            <div key={f.filename} className="card mb-4">
              <div
                onClick={() => setExpandedFiles(prev => ({ ...prev, [f.filename]: !prev[f.filename] }))}
                style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, borderBottom: expandedFiles[f.filename] ? '1px solid var(--border)' : 'none' }}
              >
                <FileStatusIcon status={f.status} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, flex: 1 }}>{f.filename}</span>
                <span style={{ color: '#3fb950', fontSize: 12 }}>+{f.additions || 0}</span>
                <span style={{ color: '#f85149', fontSize: 12 }}>-{f.deletions || 0}</span>
              </div>
              {expandedFiles[f.filename] && (
                <div style={{ padding: 8 }}>
                  <DiffView patch={f.patch} />
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
