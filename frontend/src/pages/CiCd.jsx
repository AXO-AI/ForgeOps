import { useState, useEffect } from 'react';
import { Loader2, Rocket, History, Play, CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';
import { api, timeAgo } from '../api';
import Badge from '../components/Badge';
import LogViewer from '../components/LogViewer';

export default function CiCd() {
  const [tab, setTab] = useState('deploy');
  const [repos, setRepos] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [env, setEnv] = useState('staging');
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState(null);

  // History
  const [builds, setBuilds] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [viewLogs, setViewLogs] = useState(null);
  const [jobLogs, setJobLogs] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const r = await api.discovery.forgeopsRepos();
        const list = r?.repos || r || [];
        setRepos(Array.isArray(list) ? list : []);
      } catch {
        // silent
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedRepo) return;
    async function loadBranches() {
      try {
        const [o, r] = selectedRepo.split('/');
        const b = await api.github.branches(o, r);
        setBranches(Array.isArray(b) ? b : []);
      } catch {
        setBranches([]);
      }
    }
    loadBranches();
  }, [selectedRepo]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.github.buildHistory();
      setBuilds(Array.isArray(res) ? res : res?.builds || []);
    } catch {
      setBuilds([]);
    }
    setHistoryLoading(false);
  };

  const deploy = async () => {
    if (!selectedRepo || !selectedBranch) return;
    setDeploying(true);
    setDeployResult(null);
    try {
      const [o, r] = selectedRepo.split('/');
      const res = await api.github.commitFiles(o, r, [], `deploy: ${env} from ${selectedBranch}`, selectedBranch);
      setDeployResult(res ? { success: true, msg: `Deployment to ${env} triggered` } : { success: false, msg: 'Deployment failed' });
    } catch {
      setDeployResult({ success: false, msg: 'Deployment error' });
    }
    setDeploying(false);
  };

  const showLogs = async (build) => {
    setViewLogs(build);
    try {
      const owner = build.repository?.owner?.login || build.owner || '';
      const repo = build.repository?.name || build.repo || '';
      const runId = build.id || build.run_id;
      if (owner && repo && runId) {
        const res = await api.github.runJobs(owner, repo, runId);
        const jobs = res?.jobs || [];
        setJobLogs(jobs.map((j) => ({
          time: timeAgo(j.started_at),
          level: j.conclusion === 'success' ? 'INFO' : j.conclusion === 'failure' ? 'ERROR' : 'WARN',
          message: `${j.name}: ${j.conclusion || j.status || 'running'}`,
        })));
      }
    } catch {
      setJobLogs([{ time: '', level: 'ERROR', message: 'Failed to load job logs' }]);
    }
  };

  const conclusionIcon = (c) => {
    if (c === 'success') return <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />;
    if (c === 'failure') return <XCircle size={14} style={{ color: 'var(--danger)' }} />;
    return <Clock size={14} style={{ color: 'var(--warning)' }} />;
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>CI/CD</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {['deploy', 'history'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-sm font-medium border-none cursor-pointer capitalize"
            style={{
              background: tab === t ? 'var(--accent)' : 'var(--bg-card)',
              color: tab === t ? 'white' : 'var(--text-secondary)',
            }}
          >
            {t === 'deploy' ? <span className="flex items-center gap-1.5"><Rocket size={14} /> Deploy</span> : <span className="flex items-center gap-1.5"><History size={14} /> History</span>}
          </button>
        ))}
      </div>

      {tab === 'deploy' && (
        <div className="rounded-lg p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Repository</label>
              <select
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
              >
                <option value="">Select repository...</option>
                {repos.map((r) => {
                  const full = r.full_name || `${r.owner || ''}/${r.name || r}`;
                  return <option key={full} value={full}>{full}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Environment</label>
              <select
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                value={env}
                onChange={(e) => setEnv(e.target.value)}
              >
                <option value="dev">Development</option>
                <option value="staging">Staging</option>
                <option value="uat">UAT</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Branch</label>
              <select
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
                {branches.length === 0 && <option value="main">main</option>}
              </select>
            </div>
          </div>
          <button
            onClick={deploy}
            disabled={deploying || !selectedRepo}
            className="px-6 py-2.5 rounded-lg text-sm font-medium border-none cursor-pointer flex items-center gap-2"
            style={{ background: 'var(--success)', color: 'white', opacity: deploying ? 0.6 : 1 }}
          >
            {deploying ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Deploy to {env}
          </button>
          {deployResult && (
            <div className="mt-3 text-sm px-3 py-2 rounded" style={{
              color: deployResult.success ? 'var(--success)' : 'var(--danger)',
              background: deployResult.success ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)',
            }}>
              {deployResult.msg}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div>
          {historyLoading ? (
            <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent)' }} /></div>
          ) : builds.length === 0 ? (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--text-tertiary)' }}>No build history available</div>
          ) : (
            <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--text-tertiary)' }}>Status</th>
                    <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--text-tertiary)' }}>Workflow</th>
                    <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--text-tertiary)' }}>Branch</th>
                    <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--text-tertiary)' }}>Time</th>
                    <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--text-tertiary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {builds.slice(0, 30).map((b, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-4 py-3">{conclusionIcon(b.conclusion || b.status)}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{b.name || b.workflow?.name || 'Build'}</td>
                      <td className="px-4 py-3">
                        <Badge text={b.head_branch || b.branch || 'main'} color="var(--info)" />
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(b.created_at || b.updated_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => showLogs(b)}
                          className="flex items-center gap-1 text-xs border-none bg-transparent cursor-pointer"
                          style={{ color: 'var(--accent)' }}
                        >
                          <Eye size={12} /> View Logs
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Job logs panel */}
          {viewLogs && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Logs: {viewLogs.name || viewLogs.workflow?.name || 'Build'}
                </span>
                <button
                  onClick={() => { setViewLogs(null); setJobLogs([]); }}
                  className="text-xs bg-transparent border-none cursor-pointer"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Close
                </button>
              </div>
              <LogViewer logs={jobLogs} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
