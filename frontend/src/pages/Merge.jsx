import { useState, useEffect } from 'react';
import { Loader2, GitMerge, GitCommit, Shield, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { api, timeAgo } from '../api';
import DiffViewer from '../components/DiffViewer';
import LogViewer from '../components/LogViewer';

export default function Merge() {
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [branches, setBranches] = useState([]);
  const [baseBranch, setBaseBranch] = useState('main');
  const [headBranch, setHeadBranch] = useState('');
  const [loading, setLoading] = useState(false);

  const [commits, setCommits] = useState([]);
  const [diff, setDiff] = useState(null);
  const [scaResult, setScaResult] = useState(null);
  const [scaLoading, setScaLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState(null);
  const [activityLog, setActivityLog] = useState([]);

  useEffect(() => {
    async function loadRepos() {
      try {
        const r = await api.discovery.forgeopsRepos();
        const list = r?.repos || r || [];
        setRepos(Array.isArray(list) ? list : []);
      } catch {
        // silent
      }
    }
    loadRepos();
  }, []);

  useEffect(() => {
    if (!selectedRepo) return;
    async function loadBranches() {
      try {
        const [owner, repo] = selectedRepo.split('/');
        const b = await api.github.branches(owner, repo);
        setBranches(Array.isArray(b) ? b : []);
      } catch {
        setBranches([]);
      }
    }
    loadBranches();
  }, [selectedRepo]);

  const compare = async () => {
    if (!selectedRepo || !baseBranch || !headBranch) return;
    setLoading(true);
    setDiff(null);
    setCommits([]);
    setScaResult(null);
    setMergeResult(null);
    setActivityLog([]);
    try {
      const [owner, repo] = selectedRepo.split('/');
      const res = await api.github.compare(owner, repo, baseBranch, headBranch);
      setCommits(res?.commits || []);
      setDiff(res);
      addLog('INFO', `Compared ${headBranch} against ${baseBranch}: ${res?.files?.length || 0} files changed`);
    } catch {
      addLog('ERROR', 'Failed to load comparison');
    }
    setLoading(false);
  };

  const runSca = async () => {
    if (!selectedRepo) return;
    setScaLoading(true);
    try {
      const [owner, repo] = selectedRepo.split('/');
      const res = await api.sca.scan(owner, repo, baseBranch, headBranch);
      setScaResult(res);
      const vulns = res?.vulnerabilities?.length || res?.findings?.length || 0;
      addLog(vulns > 0 ? 'WARN' : 'INFO', `SCA scan complete: ${vulns} finding(s)`);
    } catch {
      addLog('ERROR', 'SCA scan failed');
    }
    setScaLoading(false);
  };

  const doMerge = async () => {
    if (!selectedRepo || !baseBranch || !headBranch) return;
    setMerging(true);
    try {
      const [owner, repo] = selectedRepo.split('/');
      const msg = `Merge ${headBranch} into ${baseBranch}`;
      const res = await api.github.merge(owner, repo, baseBranch, headBranch, msg);
      if (res) {
        setMergeResult({ success: true, msg: 'Merge completed successfully' });
        addLog('INFO', `Merged ${headBranch} into ${baseBranch}`);
      } else {
        setMergeResult({ success: false, msg: 'Merge failed' });
        addLog('ERROR', 'Merge failed');
      }
    } catch {
      setMergeResult({ success: false, msg: 'Error during merge' });
      addLog('ERROR', 'Merge error');
    }
    setMerging(false);
  };

  const addLog = (level, message) => {
    setActivityLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), level, message }]);
  };

  const owner = selectedRepo?.split('/')[0];
  const repo = selectedRepo?.split('/')[1];

  return (
    <div>
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Merge</h1>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <select
          className="px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          value={selectedRepo}
          onChange={(e) => { setSelectedRepo(e.target.value); setHeadBranch(''); setDiff(null); }}
        >
          <option value="">Select repository...</option>
          {repos.map((r) => {
            const full = r.full_name || `${r.owner || ''}/${r.name || r}`;
            return <option key={full} value={full}>{full}</option>;
          })}
        </select>
        <select
          className="px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          value={baseBranch}
          onChange={(e) => setBaseBranch(e.target.value)}
        >
          {branches.map((b) => (
            <option key={b.name} value={b.name}>{b.name}</option>
          ))}
          {branches.length === 0 && <option value="main">main</option>}
        </select>
        <select
          className="px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          value={headBranch}
          onChange={(e) => setHeadBranch(e.target.value)}
        >
          <option value="">Head branch...</option>
          {branches.filter((b) => b.name !== baseBranch).map((b) => (
            <option key={b.name} value={b.name}>{b.name}</option>
          ))}
        </select>
        <button
          onClick={compare}
          disabled={loading || !headBranch}
          className="px-4 py-2 rounded-lg text-sm font-medium border-none cursor-pointer flex items-center justify-center gap-2"
          style={{ background: 'var(--accent)', color: 'white', opacity: loading || !headBranch ? 0.5 : 1 }}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Compare
        </button>
      </div>

      {/* Commits */}
      {commits.length > 0 && (
        <div className="rounded-lg overflow-hidden mb-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="px-4 py-3 text-sm font-semibold flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <GitCommit size={14} style={{ color: 'var(--accent)' }} />
            {commits.length} Commit{commits.length !== 1 ? 's' : ''}
          </div>
          {commits.slice(0, 20).map((c, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2 text-sm" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="font-mono text-xs shrink-0" style={{ color: 'var(--accent)' }}>{(c.sha || '').slice(0, 7)}</span>
              <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{c.commit?.message || c.message || ''}</span>
              <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(c.commit?.author?.date)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Diff */}
      {diff?.files && (
        <div className="mb-6">
          <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Changed Files</div>
          <DiffViewer files={diff.files} />
        </div>
      )}

      {/* Actions */}
      {diff && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={runSca}
            disabled={scaLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium border-none cursor-pointer flex items-center gap-2"
            style={{ background: 'rgba(88,166,255,0.1)', color: 'var(--info)', border: '1px solid var(--info)' }}
          >
            {scaLoading ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
            Run SCA Scan
          </button>
          <button
            onClick={doMerge}
            disabled={merging}
            className="px-4 py-2 rounded-lg text-sm font-medium border-none cursor-pointer flex items-center gap-2"
            style={{ background: 'var(--success)', color: 'white', opacity: merging ? 0.6 : 1 }}
          >
            {merging ? <Loader2 size={14} className="animate-spin" /> : <GitMerge size={14} />}
            Merge
          </button>
        </div>
      )}

      {/* SCA result */}
      {scaResult && (
        <div className="rounded-lg p-4 mb-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Shield size={14} style={{ color: 'var(--info)' }} />
            SCA Results
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {(scaResult.vulnerabilities || scaResult.findings || []).length === 0 ? (
              <div className="flex items-center gap-2" style={{ color: 'var(--success)' }}>
                <CheckCircle2 size={14} /> No vulnerabilities found
              </div>
            ) : (
              (scaResult.vulnerabilities || scaResult.findings || []).map((v, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  {v.severity === 'CRITICAL' || v.severity === 'HIGH'
                    ? <XCircle size={14} style={{ color: 'var(--danger)' }} />
                    : <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />}
                  <span>{v.title || v.name || v.id || 'Finding'}</span>
                  <span className="ml-auto font-mono">{v.severity}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Merge result */}
      {mergeResult && (
        <div className="rounded-lg p-3 mb-6 text-sm" style={{
          background: mergeResult.success ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)',
          color: mergeResult.success ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${mergeResult.success ? 'var(--success)' : 'var(--danger)'}`,
        }}>
          {mergeResult.msg}
        </div>
      )}

      {/* Activity log */}
      {activityLog.length > 0 && (
        <div>
          <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Activity Log</div>
          <LogViewer logs={activityLog} />
        </div>
      )}
    </div>
  );
}
