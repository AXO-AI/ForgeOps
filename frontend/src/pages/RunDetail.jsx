import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getRunJobs, getJobLogs } from '../api';
import LogViewer from '../components/LogViewer';

function StatusIcon({ status, conclusion }) {
  const s = (conclusion || status || '').toLowerCase();
  if (s === 'success') return <span style={{ color: '#059669' }}>&#10003;</span>;
  if (s === 'failure') return <span style={{ color: '#dc2626' }}>&#10007;</span>;
  if (s === 'in_progress') return <span style={{ color: '#d97706' }}>&#9679;</span>;
  if (s === 'skipped') return <span style={{ color: '#6b7280' }}>&#8722;</span>;
  return <span style={{ color: '#6b7280' }}>&#9711;</span>;
}

function formatDuration(startedAt, completedAt) {
  if (!startedAt || !completedAt) return '--';
  const ms = new Date(completedAt) - new Date(startedAt);
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function RunDetail() {
  const { owner, repo, runId } = useParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState(null);
  const [selectedStep, setSelectedStep] = useState(null);
  const [logs, setLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getRunJobs(owner, repo, runId)
      .then(d => setJobs(Array.isArray(d?.jobs) ? d.jobs : Array.isArray(d) ? d : []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [owner, repo, runId]);

  function toggleJob(jobId) {
    setExpandedJob(prev => prev === jobId ? null : jobId);
    setSelectedStep(null);
    setLogs('');
  }

  async function loadLogs(jobId) {
    setLogsLoading(true);
    try {
      const text = await getJobLogs(owner, repo, jobId);
      setLogs(text || 'No logs available');
    } catch {
      setLogs('Failed to fetch logs');
    }
    setLogsLoading(false);
  }

  function handleStepClick(jobId, stepNumber) {
    setSelectedStep(prev => prev === stepNumber ? null : stepNumber);
    if (selectedStep !== stepNumber) {
      loadLogs(jobId);
    }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, marginBottom: 16, color: 'var(--text-dim)' }}>
        <Link to="/repos" style={{ color: 'var(--accent)' }}>Repos</Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <Link to={`/repos/${owner}/${repo}`} style={{ color: 'var(--accent)' }}>{repo}</Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <span>Runs</span>
        <span style={{ margin: '0 6px' }}>/</span>
        <span>#{runId}</span>
      </div>

      <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>Run #{runId}</h3>

      {loading ? (
        <div className="text-dim" style={{ padding: 40, textAlign: 'center' }}>Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="empty-state-box">
          <div className="empty-icon">&#x1F504;</div>
          <div className="empty-title">No jobs found</div>
          <div className="empty-desc">No jobs were found for Run #{runId}. The run may still be queued or the workflow may not have produced any jobs.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {jobs.map(job => (
            <div key={job.id} className="card" style={{ overflow: 'hidden' }}>
              {/* Job header */}
              <div
                onClick={() => toggleJob(job.id)}
                style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}
              >
                <span style={{ fontSize: 16 }}>
                  <StatusIcon status={job.status} conclusion={job.conclusion} />
                </span>
                <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{job.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {formatDuration(job.started_at, job.completed_at)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-dim)', transform: expandedJob === job.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  &#9660;
                </span>
              </div>

              {/* Steps */}
              {expandedJob === job.id && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }}>
                  {(job.steps || []).map(step => (
                    <div key={step.number}>
                      <div
                        onClick={() => handleStepClick(job.id, step.number)}
                        style={{
                          padding: '6px 16px 6px 32px', display: 'flex', alignItems: 'center', gap: 8,
                          cursor: 'pointer', fontSize: 13,
                          background: selectedStep === step.number ? 'var(--bg)' : 'transparent',
                        }}
                      >
                        <StatusIcon status={step.status} conclusion={step.conclusion} />
                        <span style={{ flex: 1 }}>{step.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                          {formatDuration(step.started_at, step.completed_at)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Logs */}
                  {selectedStep && (
                    <div style={{ padding: '12px 16px' }}>
                      {logsLoading ? (
                        <div className="text-dim" style={{ padding: 16, textAlign: 'center' }}>Loading logs...</div>
                      ) : (
                        <LogViewer logs={logs} title={`Job ${job.name} Logs`} />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
