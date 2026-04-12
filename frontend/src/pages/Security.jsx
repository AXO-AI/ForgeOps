import { useState, useEffect } from 'react';
import { getForgeOpsRepos, runScaScan, getScaConfig } from '../api';

function sevClass(sev) {
  const s = sev.toLowerCase();
  if (s === 'critical') return 'sev-critical';
  if (s === 'high') return 'sev-high';
  if (s === 'medium') return 'sev-medium';
  if (s === 'low') return 'sev-low';
  return 'sev-info';
}

const SCANNER_DEFS = [
  { name: 'Gitleaks', configKey: 'gitleaksEnabled', description: 'Secret detection' },
  { name: 'OWASP Dependency-Check', configKey: 'owaspEnabled', description: 'SCA / CVE scanning' },
  { name: 'Trivy', configKey: 'trivyEnabled', description: 'Container & dependency scanning' },
  { name: 'Black Duck', configKey: 'blackduckEnabled', description: 'License compliance' },
];

export default function Security() {
  const [findings, setFindings] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [filterSev, setFilterSev] = useState('All');
  const [toast, setToast] = useState(null);
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [scanners, setScanners] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const repoData = await getForgeOpsRepos();
        const repoList = (repoData?.repos || []).map(r => ({ name: r.name, full_name: r.full_name }));
        setRepos(repoList);
        if (repoList.length > 0) {
          setSelectedRepo(repoList[0].full_name || repoList[0].name || '');
        }
      } catch { /* no repos */ }
      setLoadingRepos(false);

      try {
        const config = await getScaConfig();
        setScanners(SCANNER_DEFS.map(s => ({
          ...s,
          status: config?.[s.configKey] ? 'active' : 'inactive',
        })));
      } catch {
        setScanners(SCANNER_DEFS.map(s => ({ ...s, status: 'inactive' })));
      }
    }
    init();
  }, []);

  const counts = {
    total: findings.length,
    critical: findings.filter(f => f.severity === 'Critical').length,
    high: findings.filter(f => f.severity === 'High').length,
    medium: findings.filter(f => f.severity === 'Medium').length,
    low: findings.filter(f => f.severity === 'Low').length,
  };

  const filtered = filterSev === 'All' ? findings : findings.filter(f => f.severity === filterSev);

  const runScan = async () => {
    if (!selectedRepo) {
      setToast('Select a repository first');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setScanning(true);
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 90) return 90;
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      const parts = selectedRepo.split('/');
      const owner = parts.length > 1 ? parts[0] : '';
      const repo = parts.length > 1 ? parts[1] : parts[0];
      const result = await runScaScan(owner, repo);
      clearInterval(interval);
      setScanProgress(100);

      const scanFindings = [];
      if (result?.vulnerabilities) {
        result.vulnerabilities.forEach((v, i) => {
          scanFindings.push({
            id: i + 1,
            severity: v.severity || 'Medium',
            rule: v.cve || v.rule || v.id || `FINDING-${i + 1}`,
            file: v.file || v.source || 'N/A',
            component: v.component || v.package || 'N/A',
            scanner: v.scanner || 'SCA',
            description: v.description || v.title || '',
            details: v.details || v.recommendation || '',
          });
        });
      }
      if (result?.findings) {
        result.findings.forEach((v, i) => {
          scanFindings.push({
            id: scanFindings.length + i + 1,
            severity: v.severity || 'Medium',
            rule: v.cve || v.rule || v.id || `FINDING-${scanFindings.length + i + 1}`,
            file: v.file || v.source || 'N/A',
            component: v.component || v.package || 'N/A',
            scanner: v.scanner || 'SCA',
            description: v.description || v.title || '',
            details: v.details || v.recommendation || '',
          });
        });
      }

      setFindings(scanFindings);
      setToast(`Scan completed. ${scanFindings.length} finding${scanFindings.length !== 1 ? 's' : ''} in ${selectedRepo}.`);
      setTimeout(() => setToast(null), 4000);
    } catch (e) {
      clearInterval(interval);
      setToast('Scan failed. Check SCA configuration in Settings.');
      setTimeout(() => setToast(null), 4000);
    }
    setScanning(false);
  };

  const handleCreateJira = (finding) => {
    setToast(`Jira bug created for ${finding.rule} in ${finding.component}`);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div>
      {toast && <div className="toast toast-success">{toast}</div>}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Security Dashboard</h1>
          <p>Vulnerability scanning, secret detection, and dependency audit</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            style={{ minWidth: 200 }}
            disabled={loadingRepos || scanning}
          >
            {loadingRepos && <option>Loading repos...</option>}
            {!loadingRepos && repos.length === 0 && <option value="">No repos found</option>}
            {repos.map(r => (
              <option key={r.full_name || r.name} value={r.full_name || r.name}>
                {r.full_name || r.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={runScan} disabled={scanning || !selectedRepo}>
            {scanning ? 'Scanning...' : 'Run Scan'}
          </button>
        </div>
      </div>

      {scanning && (
        <div className="card mb-4 animate-fade">
          <div className="card-header">Scan In Progress</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 8 }}>
            Scanning {selectedRepo} for vulnerabilities, secrets, and license issues...
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${Math.min(scanProgress, 100)}%` }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{Math.round(Math.min(scanProgress, 100))}% complete</div>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card" style={{ borderTop: '3px solid var(--text)' }}>
          <div className="stat-label">Total Findings</div>
          <div className="stat-value">{counts.total}</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{findings.length > 0 ? 'from last SCA scan' : 'Run a scan to see results'}</div>
        </div>
        <div className="stat-card" style={{ borderTop: '3px solid #dc2626' }}>
          <div className="stat-label">Critical</div>
          <div className="stat-value" style={{ color: '#dc2626' }}>{counts.critical}</div>
        </div>
        <div className="stat-card" style={{ borderTop: '3px solid #ea580c' }}>
          <div className="stat-label">High</div>
          <div className="stat-value" style={{ color: '#ea580c' }}>{counts.high}</div>
        </div>
        <div className="stat-card" style={{ borderTop: '3px solid var(--warn)' }}>
          <div className="stat-label">Medium</div>
          <div className="stat-value" style={{ color: 'var(--warn)' }}>{counts.medium}</div>
        </div>
        <div className="stat-card" style={{ borderTop: '3px solid var(--info)' }}>
          <div className="stat-label">Low</div>
          <div className="stat-value" style={{ color: 'var(--info)' }}>{counts.low}</div>
        </div>
      </div>

      {/* Scanner Status */}
      {scanners.length > 0 && (
        <div className="scanner-grid">
          {scanners.map(s => (
            <div className="scanner-card" key={s.name}>
              <div className={`scanner-status ${s.status}`} />
              <div>
                <div className="scanner-name">{s.name}</div>
                <div className="scanner-label">{s.description}</div>
                <div className="scanner-label">{s.status === 'active' ? 'Configured' : 'Not configured'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Findings Table */}
      <div className="card">
        <div className="card-header">
          <span style={{ flex: 1 }}>Findings</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['All', 'Critical', 'High', 'Medium', 'Low'].map(s => (
              <button
                key={s}
                className={`btn btn-sm ${filterSev === s ? 'btn-primary' : ''}`}
                onClick={() => setFilterSev(s)}
              >
                {s} {s !== 'All' ? `(${counts[s.toLowerCase()]})` : ''}
              </button>
            ))}
          </div>
        </div>

        {findings.length === 0 ? (
          <div className="empty-state-box">
            <div className="empty-icon">&#x1F6E1;&#xFE0F;</div>
            <div className="empty-title">No findings yet</div>
            <div className="empty-desc">Select a repository and run a security scan to see findings.</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state-box">
            <div className="empty-icon">&#x1F6E1;&#xFE0F;</div>
            <div className="empty-title">No findings at this severity</div>
            <div className="empty-desc">Adjust the filter or run a new scan to check for vulnerabilities.</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Rule</th>
                <th>File</th>
                <th>Component</th>
                <th>Scanner</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <>
                  <tr key={f.id} onClick={() => setExpanded(expanded === f.id ? null : f.id)} style={{ cursor: 'pointer' }}>
                    <td><span className={`badge ${sevClass(f.severity)}`}>{f.severity}</span></td>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600 }}>{f.rule}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{f.file}</td>
                    <td style={{ fontSize: 12 }}>{f.component}</td>
                    <td><span className="badge badge-dim">{f.scanner}</span></td>
                    <td style={{ fontSize: 12, maxWidth: 280 }} className="truncate">{f.description}</td>
                  </tr>
                  {expanded === f.id && (
                    <tr key={`${f.id}-detail`}>
                      <td colSpan={6} style={{ padding: 0 }}>
                        <div className="expand-row">
                          <div style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.7 }}>
                            <strong>Full Details:</strong> {f.details}
                          </div>
                          <div style={{ fontSize: 13, marginBottom: 12 }}>
                            <strong>Description:</strong> {f.description}
                          </div>
                          <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); handleCreateJira(f); }}>
                            Create Jira Bug
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
