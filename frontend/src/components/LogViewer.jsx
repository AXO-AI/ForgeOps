import { useState, useEffect, useRef } from 'react';

export default function LogViewer({ logs = '', title = 'Logs', searchable = true }) {
  const [search, setSearch] = useState('');
  const endRef = useRef(null);
  const lines = logs.split('\n');

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  function lineColor(line) {
    if (/ERROR|FATAL/i.test(line)) return { bg: 'rgba(248,81,73,0.18)', color: '#f47067' };
    if (/WARN/i.test(line)) return { bg: 'rgba(210,153,34,0.15)', color: '#d2992a' };
    if (/INFO/i.test(line)) return { bg: 'rgba(56,139,253,0.1)', color: '#58a6ff' };
    return { bg: 'transparent', color: '#c9d1d9' };
  }

  const matchesSearch = (line) => search && line.toLowerCase().includes(search.toLowerCase());

  function handleDownload() {
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #30363d' }}>
      <div style={{ background: '#161b22', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #30363d' }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: '#c9d1d9' }}>{title}</span>
        <div style={{ flex: 1 }} />
        {searchable && (
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 4, padding: '3px 8px', color: '#c9d1d9', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", width: 200 }}
          />
        )}
        <button
          onClick={handleDownload}
          style={{ background: 'none', border: '1px solid #30363d', borderRadius: 4, padding: '3px 8px', color: '#8b949e', fontSize: 11, cursor: 'pointer' }}
        >
          Download
        </button>
      </div>
      <div style={{ background: '#0d1117', maxHeight: 480, overflow: 'auto', fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace", fontSize: 12, lineHeight: '20px' }}>
        {lines.map((line, i) => {
          const { bg, color } = lineColor(line);
          const highlighted = matchesSearch(line);
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                background: highlighted ? 'rgba(210,153,34,0.25)' : bg,
                borderLeft: highlighted ? '3px solid #d2992a' : '3px solid transparent',
              }}
            >
              <span style={{ width: 48, textAlign: 'right', padding: '0 8px', color: '#484f58', userSelect: 'none', flexShrink: 0, fontSize: 11 }}>
                {i + 1}
              </span>
              <span style={{ color, padding: '0 8px', whiteSpace: 'pre', overflow: 'visible' }}>
                {line}
              </span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}
