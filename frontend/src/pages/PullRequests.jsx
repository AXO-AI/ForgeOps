import { useState, useEffect } from 'react';
import {
  getForgeOpsRepos, getBranches, getCommits, compareBranches, mergeBranches,
  jiraGet, jiraPost, runScaScan, aiCodeReview,
  displayKey, typeIcon, statusColor, timeAgo,
} from '../api';
import ALMSelector from '../components/ALMSelector';
import TicketDetailPanel from '../components/TicketDetailPanel';

function DiffView({ patch }) {
  if (!patch) return <div className="text-dim text-sm" style={{ padding: 8 }}>No diff available</div>;
  // Parse patch into lines with old/new line numbers
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
                <td style={{ width: 44, textAlign: 'right', padding: '0 6px', color: '#484f58', userSelect: 'none', fontSize: 11, borderRight: '1px solid #21262d', verticalAlign: 'top', lineHeight: '20px' }}>
                  {l.old}
                </td>
                <td style={{ width: 44, textAlign: 'right', padding: '0 6px', color: '#484f58', userSelect: 'none', fontSize: 11, borderRight: '1px solid #21262d', verticalAlign: 'top', lineHeight: '20px' }}>
                  {l.new}
                </td>
                <td style={{ width: 14, textAlign: 'center', color: l.type === 'add' ? '#3fb950' : l.type === 'del' ? '#f85149' : '#484f58', userSelect: 'none', fontWeight: 700, lineHeight: '20px' }}>
                  {marker}
                </td>
                <td style={{ color, padding: '0 12px', whiteSpace: 'pre', lineHeight: '20px', overflow: 'visible' }}>
                  {l.text}
                </td>
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

export default function PullRequests() {
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [branches, setBranches] = useState([]);
  const [sourceBranch, setSourceBranch] = useState('');
  const [targetBranch, setTargetBranch] = useState('');
  const [loadingRepos, setLoadingRepos] = useState(true);

  // Git state
  const [commits, setCommits] = useState([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState({});
  const [merging, setMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState(null);
  const [mergeMessage, setMergeMessage] = useState('');
  const [activityLog, setActivityLog] = useState([]);
  const [scaResult, setScaResult] = useState(null);
  const [scaRunning, setScaRunning] = useState(false);
  const [aiReviewResult, setAiReviewResult] = useState(null);
  const [aiReviewRunning, setAiReviewRunning] = useState(false);

  function log(msg, status = 'info') {
    setActivityLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, status }]);
  }

  // Jira state
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailTicket, setDetailTicket] = useState(null);

  const owner = selectedRepo.split('/')[0] || '';
  const repo = selectedRepo.split('/')[1] || '';

  useEffect(() => {
    getForgeOpsRepos().then(d => {
      const list = (d?.repos || []).map(r => ({ name: r.name, full_name: r.full_name, owner: { login: r.full_name?.split('/')[0] || 'askboppana' } }));
      setRepos(list);
    }).catch(() => setRepos([])).finally(() => setLoadingRepos(false));
  }, []);

  useEffect(() => {
    if (!selectedRepo) return;
    getBranches(owner, repo).then(d => {
      const list = Array.isArray(d) ? d : [];
      setBranches(list);
      const main = list.find(b => b.name === 'main') || list.find(b => b.name === 'master') || list[0];
      if (main) setTargetBranch(main.name);
      setSourceBranch('');
      setCommits([]); setComparison(null); setMergeResult(null);
    }).catch(() => setBranches([]));
  }, [selectedRepo]);

  // Fetch commits when source branch changes
  useEffect(() => {
    if (!owner || !repo || !sourceBranch) { setCommits([]); return; }
    setLoadingCommits(true);
    getCommits(owner, repo, sourceBranch).then(d => setCommits(Array.isArray(d) ? d : [])).catch(() => setCommits([])).finally(() => setLoadingCommits(false));
  }, [selectedRepo, sourceBranch]);

  // Fetch diff when both branches selected
  useEffect(() => {
    if (!owner || !repo || !sourceBranch || !targetBranch || sourceBranch === targetBranch) { setComparison(null); return; }
    setLoadingDiff(true); setMergeResult(null); setActivityLog([]);
    setMergeMessage(`Merge ${sourceBranch} into ${targetBranch}`);
    log(`Comparing branches: ${targetBranch} ← ${sourceBranch}`);
    log(`Repository: ${owner}/${repo}`);
    compareBranches(owner, repo, targetBranch, sourceBranch).then(d => {
      setComparison(d);
      const fileCount = (d?.files || []).length;
      const adds = (d?.files || []).reduce((s, f) => s + (f.additions || 0), 0);
      const dels = (d?.files || []).reduce((s, f) => s + (f.deletions || 0), 0);
      if (d?.status === 'identical') {
        log('Branches are identical — no differences', 'warn');
      } else {
        log(`${d?.ahead_by || 0} commits ahead, ${d?.behind_by || 0} commits behind`, d?.ahead_by > 0 ? 'success' : 'info');
        log(`${fileCount} files changed, +${adds} -${dels}`);
        if (d?.ahead_by > 0) log('Ready to merge', 'success');
        else log('Source has no unique commits ahead of target', 'warn');
      }
      const exp = {};
      (d?.files || []).forEach(f => { exp[f.filename] = true; });
      setExpandedFiles(exp);
    }).catch(err => { setComparison(null); log(`Compare failed: ${err.message}`, 'error'); }).finally(() => setLoadingDiff(false));
  }, [selectedRepo, sourceBranch, targetBranch]);

  async function doMerge() {
    if (!owner || !repo) return;
    setActivityLog([]);
    setScaResult(null);
    setMerging(true);
    setScaRunning(true);

    // ── PHASE 1: Mandatory SCA Scan ──
    log('═══ PHASE 1: Security Scan (SCA) ═══');
    log(`Scanning ${sourceBranch} before merge to ${targetBranch}...`);
    log(`Repository: ${owner}/${repo}`);
    log('Running: Black Duck SCA, OWASP Dependency Check, Gitleaks, SAST, License Compliance...');

    let sca;
    try {
      sca = await runScaScan(owner, repo, targetBranch, sourceBranch);
    } catch (err) {
      log(`SCA scan failed: ${err.message}`, 'error');
      log('Merge blocked — security scan must complete successfully', 'error');
      setMerging(false);
      setScaRunning(false);
      return;
    }
    setScaResult(sca);
    setScaRunning(false);

    log(`Scanned ${sca.summary?.filesScanned || 0} files (${sca.summary?.filesChanged || 0} changed)`);
    log(`Dependency files found: ${sca.summary?.depFilesFound || 0}`);
    log('');
    if (sca.summary?.critical > 0) log(`CRITICAL: ${sca.summary.critical} finding(s)`, 'error');
    if (sca.summary?.high > 0) log(`HIGH: ${sca.summary.high} finding(s)`, 'error');
    if (sca.summary?.medium > 0) log(`MEDIUM: ${sca.summary.medium} finding(s)`, 'warn');
    if (sca.summary?.low > 0) log(`LOW: ${sca.summary.low} finding(s)`);
    if (sca.findings?.length === 0) log('No security findings detected', 'success');

    // Log each finding
    (sca.findings || []).forEach(f => {
      const icon = f.severity === 'critical' ? '\u{1F534}' : f.severity === 'high' ? '\u{1F7E0}' : f.severity === 'medium' ? '\u{1F7E1}' : '\u{1F7E2}';
      log(`${icon} [${f.scanner}] ${f.rule}: ${f.message}`, f.severity === 'critical' || f.severity === 'high' ? 'error' : 'warn');
      if (f.file) log(`   File: ${f.file}${f.component ? ' → ' + f.component + '@' + f.version : ''}`);
    });

    log('');
    log(`Security Gate: ${sca.gate}`, sca.passed ? 'success' : 'error');
    log(`Policy: ${sca.policy || 'Block on Critical or High'}`);

    if (!sca.passed) {
      log('', 'error');
      log('═══ MERGE BLOCKED — Fix security findings before merging ═══', 'error');
      log('Resolve all Critical and High findings, then retry the merge.', 'error');
      setMerging(false);
      return;
    }

    // ── PHASE 1.5: AI Code Review ──
    log('');
    log('═══ PHASE 1.5: AI Code Review ═══');
    log('Sending diff to AI for code review...');
    setAiReviewRunning(true);

    let aiReview = null;
    try {
      const diffText = (comparison?.files || []).map(f => `--- a/${f.filename}\n+++ b/${f.filename}\n${f.patch || ''}`).join('\n');
      aiReview = await aiCodeReview(diffText, `${owner}/${repo}`, sourceBranch);
      setAiReviewResult(aiReview);

      if (aiReview.findings && aiReview.findings.length > 0) {
        aiReview.findings.forEach(f => {
          const icon = f.severity === 'critical' ? '\u{1F534}' : f.severity === 'high' ? '\u{1F7E0}' : f.severity === 'medium' ? '\u{1F7E1}' : '\u{1F7E2}';
          log(`${icon} [AI] ${f.message}`, f.severity === 'critical' || f.severity === 'high' ? 'error' : 'warn');
          if (f.file) log(`   File: ${f.file}${f.line ? ':' + f.line : ''}`);
          if (f.suggestion) log(`   Fix: ${f.suggestion}`);
        });
      } else {
        log('No issues found by AI review', 'success');
      }

      log(`AI Risk Level: ${aiReview.riskLevel || 'unknown'}`, aiReview.riskLevel === 'critical' ? 'error' : aiReview.riskLevel === 'high' ? 'warn' : 'success');
      log(`AI Summary: ${aiReview.summary || 'No summary'}`);

      const hasCriticalAI = (aiReview.findings || []).some(f => f.severity === 'critical');
      if (hasCriticalAI) {
        log('', 'error');
        log('═══ MERGE BLOCKED — AI found critical issues ═══', 'error');
        log('Address critical AI findings before merging.', 'error');
        setMerging(false);
        setAiReviewRunning(false);
        return;
      }

      const hasHighAI = (aiReview.findings || []).some(f => f.severity === 'high');
      if (hasHighAI) {
        log('AI found high-severity issues — proceeding with warning', 'warn');
      }
    } catch (err) {
      log(`AI code review failed: ${err.message} — proceeding without AI review`, 'warn');
    }
    setAiReviewRunning(false);

    // ── PHASE 2: Merge ──
    log('');
    log('═══ PHASE 2: Merge ═══');
    log(`Commit message: "${mergeMessage}"`);

    let result;
    try {
      log('Calling GitHub Merges API...');
      result = await mergeBranches(owner, repo, targetBranch, sourceBranch, mergeMessage);
    } catch (err) {
      log(`Merge API error: ${err.message}`, 'error');
      setMerging(false);
      return;
    }

    setMergeResult(result);

    if (result.status === 201 || result.status === 200) {
      const sha = result.data?.sha?.substring(0, 7) || 'unknown';
      log(`Merge successful! Commit: ${sha}`, 'success');
      log(`Merge SHA: ${result.data?.sha || 'N/A'}`);

      // ── PHASE 3: Post-merge Jira update ──
      log('');
      log('═══ PHASE 3: Post-merge Actions ═══');
      const ticketMatch = sourceBranch.match(/[A-Z]+-\d+/);
      if (ticketMatch) {
        const ticket = ticketMatch[0];
        const envMap = { int: 'In Progress', qa: 'Ready for SIT', stage: 'Ready for UAT', main: 'Deployed to Production' };
        const targetStatus = envMap[targetBranch] || envMap.main;
        log(`Jira ticket detected in branch: ${ticket}`);
        log(`Target Jira status: ${targetStatus}`);

        if (targetStatus) {
          try {
            log(`Fetching transitions for ${ticket}...`);
            const trans = await jiraGet('/issue/' + ticket + '/transitions');
            const available = (trans?.transitions || []).map(t => t.name).join(', ');
            log(`Available transitions: ${available || 'none'}`);
            const t = (trans?.transitions || []).find(tr => tr.name === targetStatus || tr.to?.name === targetStatus);
            if (t) {
              log(`Transitioning ${ticket} to "${targetStatus}"...`);
              await jiraPost('/issue/' + ticket + '/transition', { transitionId: t.id });
              log(`${ticket} moved to "${targetStatus}"`, 'success');
            } else {
              log(`Transition "${targetStatus}" not available for ${ticket}`, 'warn');
            }
            log(`Adding merge comment to ${ticket}...`);
            await jiraPost('/issue/' + ticket + '/comment', { body: `Merged to ${targetBranch} by ForgeOps. Commit: ${sha}` });
            log(`Comment added to ${ticket}`, 'success');
          } catch (err) {
            log(`Jira update failed: ${err.message}`, 'error');
          }
        }
      } else {
        log('No Jira ticket found in branch name — skipping Jira update');
      }
      log('Merge complete!', 'success');
    } else if (result.status === 409) {
      log(`Merge conflict! GitHub returned 409`, 'error');
      log(`Response: ${JSON.stringify(result.data?.message || result.data).substring(0, 200)}`, 'error');
      log('Resolve conflicts manually or push a fix commit, then retry', 'warn');
    } else if (result.status === 404) {
      log(`Branch not found (404). Check that both branches exist.`, 'error');
      log(`Response: ${JSON.stringify(result.data?.message || result.data).substring(0, 200)}`, 'error');
    } else if (result.status === 403) {
      log(`Permission denied (403). Your GitHub token may lack push access.`, 'error');
      log(`Response: ${JSON.stringify(result.data?.message || result.data).substring(0, 200)}`, 'error');
    } else if (result.status === 422) {
      log(`Unprocessable (422). Nothing to merge — branches may already be merged.`, 'warn');
      log(`Response: ${JSON.stringify(result.data?.message || result.data).substring(0, 200)}`, 'warn');
    } else {
      log(`Unexpected response: HTTP ${result.status}`, 'error');
      log(`Response: ${JSON.stringify(result.data).substring(0, 300)}`, 'error');
    }
    setMerging(false);
  }


  const totalAdd = (comparison?.files || []).reduce((s, f) => s + (f.additions || 0), 0);
  const totalDel = (comparison?.files || []).reduce((s, f) => s + (f.deletions || 0), 0);
  const isIdentical = comparison?.status === 'identical' || (comparison?.ahead_by === 0 && comparison?.behind_by === 0);
  const canMerge = comparison && comparison.ahead_by > 0;
  const hasConflict = mergeResult?.status === 409;
  const hasBothBranches = sourceBranch && targetBranch && sourceBranch !== targetBranch;

  return (
    <div>
      <div className="page-header">
        <h1>Merge</h1>
        <p>Compare branches, review diffs, merge code, and link Jira tickets</p>
      </div>

      {/* SECTION 1: Repo & Branches */}
      <div className="card mb-4">
        <div className="card-header">Repository & Branches</div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label>Repository</label>
            <select value={selectedRepo} onChange={e => setSelectedRepo(e.target.value)}>
              <option value="">Select repo...</option>
              {repos.map(r => { const f = `${r.owner?.login || r.owner}/${r.name}`; return <option key={f} value={f}>{f}</option>; })}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Source Branch</label>
            <select value={sourceBranch} onChange={e => setSourceBranch(e.target.value)}>
              <option value="">Select source...</option>
              {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Target Branch</label>
            <select value={targetBranch} onChange={e => setTargetBranch(e.target.value)}>
              <option value="">Select target...</option>
              {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 2: Commits */}
      {sourceBranch && (
        <div className="card mb-4">
          <div className="card-header">
            Commits on <code style={{ fontSize: 12 }}>{sourceBranch}</code>
            <span className="badge" style={{ marginLeft: 8, background: 'var(--primary-bg)', color: 'var(--primary)' }}>{commits.length}</span>
          </div>
          {loadingCommits ? <div className="loading-center"><span className="spinner" /> Loading commits...</div> : commits.length === 0 ? <div className="empty-state-box"><div className="empty-icon">&#x1F4DD;</div><div className="empty-title">No commits found</div><div className="empty-desc">No commits on this branch yet.</div></div> : (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {commits.slice(0, 20).map(c => (
                <div key={c.sha} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <code style={{ color: 'var(--primary)', fontWeight: 600, flexShrink: 0 }}>{c.sha?.substring(0, 7)}</code>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.commit?.message?.split('\n')[0] || ''}</span>
                  <span className="text-dim" style={{ flexShrink: 0 }}>{c.commit?.author?.name || ''}</span>
                  <span className="text-dim" style={{ flexShrink: 0, fontSize: 10 }}>{timeAgo(c.commit?.author?.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: Diff Report */}
      {hasBothBranches && (
        <div className="card mb-4">
          <div className="card-header">
            Diff: <code style={{ fontSize: 11 }}>{targetBranch}</code> ← <code style={{ fontSize: 11 }}>{sourceBranch}</code>
          </div>
          {loadingDiff ? (
            <div className="loading-center"><span className="spinner" /> Comparing branches...</div>
          ) : !comparison ? (
            <div className="empty-state">Unable to compare branches. Check that both branches exist.</div>
          ) : isIdentical ? (
            <div style={{ padding: 12, background: 'rgba(5,150,105,0.08)', borderRadius: 8, fontSize: 12, color: '#059669' }}>
              {'\u2705'} Branches are identical — no differences found.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 16, padding: '8px 0', fontSize: 12, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
                <span><strong>{comparison.ahead_by}</strong> commits ahead</span>
                <span><strong>{comparison.behind_by}</strong> commits behind <code style={{ fontSize: 11 }}>{targetBranch}</code></span>
                <span><strong>{(comparison.files || []).length}</strong> files changed</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>+{totalAdd}</span>
                <span style={{ color: '#dc2626', fontWeight: 600 }}>-{totalDel}</span>
              </div>
              {(comparison.files || []).length === 0 ? (
                <div className="text-dim text-sm" style={{ padding: 8 }}>No file changes (metadata-only commits)</div>
              ) : (comparison.files || []).map(f => (
                <div key={f.filename} style={{ borderTop: '1px solid var(--border)' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', cursor: 'pointer', fontSize: 12 }}
                    onClick={() => setExpandedFiles(p => ({ ...p, [f.filename]: !p[f.filename] }))}
                  >
                    <FileStatusIcon status={f.status} />
                    <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 11 }}>{f.filename}</span>
                    <span style={{ color: '#059669', fontSize: 11, fontWeight: 600 }}>+{f.additions}</span>
                    <span style={{ color: '#dc2626', fontSize: 11, fontWeight: 600 }}>-{f.deletions}</span>
                    <div style={{ width: 60, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                      <div style={{ height: '100%', width: `${f.additions + f.deletions > 0 ? (f.additions / (f.additions + f.deletions)) * 100 : 0}%`, background: '#059669' }} />
                    </div>
                    <span className="text-dim" style={{ fontSize: 10 }}>{expandedFiles[f.filename] ? '\u25B2 collapse' : '\u25BC expand'}</span>
                  </div>
                  {expandedFiles[f.filename] && <DiffView patch={f.patch} />}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* AI Code Review Results */}
      {aiReviewResult && (
        <div className="card mb-4 ai-review-card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{'\u{1F9E0}'}</span>
            AI Code Review
            <span className="badge" style={{ marginLeft: 'auto', background: aiReviewResult.riskLevel === 'none' || aiReviewResult.riskLevel === 'low' ? 'rgba(5,150,105,0.1)' : aiReviewResult.riskLevel === 'critical' || aiReviewResult.riskLevel === 'high' ? 'rgba(220,38,38,0.1)' : 'rgba(217,119,6,0.1)', color: aiReviewResult.riskLevel === 'none' || aiReviewResult.riskLevel === 'low' ? '#059669' : aiReviewResult.riskLevel === 'critical' || aiReviewResult.riskLevel === 'high' ? '#dc2626' : '#d97706' }}>
              Risk: {aiReviewResult.riskLevel || 'unknown'}
            </span>
          </div>
          {aiReviewResult.summary && (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12, lineHeight: 1.6 }}>{aiReviewResult.summary}</div>
          )}
          {(aiReviewResult.findings || []).length > 0 && (
            <div style={{ maxHeight: 250, overflowY: 'auto' }}>
              {aiReviewResult.findings.map((f, i) => {
                const sevColor = { critical: '#dc2626', high: '#d97706', medium: '#eab308', low: '#059669' }[f.severity] || '#6b7280';
                return (
                  <div key={i} className="ai-finding">
                    <span className="badge" style={{ background: `${sevColor}20`, color: sevColor, flexShrink: 0, fontSize: 9 }}>{(f.severity || '').toUpperCase()}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{f.message}</div>
                      {f.file && <div style={{ color: 'var(--text-dim)', fontSize: 10, marginTop: 2 }}><code style={{ fontSize: 10 }}>{f.file}{f.line ? ':' + f.line : ''}</code></div>}
                      {f.suggestion && <div style={{ color: '#059669', fontSize: 10, marginTop: 2 }}>Fix: {f.suggestion}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {(aiReviewResult.findings || []).length === 0 && (
            <div style={{ padding: 12, background: 'rgba(5,150,105,0.08)', borderRadius: 8, fontSize: 12, color: '#059669' }}>
              {'\u2705'} AI found no issues in this code change.
            </div>
          )}
        </div>
      )}

      {/* SCA Scan Results — shown after scan runs */}
      {scaResult && (
        <div className="card mb-4" style={{ borderTop: `3px solid ${scaResult.passed ? '#059669' : '#dc2626'}` }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{scaResult.passed ? '\u2705' : '\u274C'}</span>
            Security Scan Results
            <span className="badge" style={{ marginLeft: 'auto', background: scaResult.passed ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.1)', color: scaResult.passed ? '#059669' : '#dc2626' }}>
              {scaResult.gate}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Critical', count: scaResult.summary?.critical, color: '#dc2626' },
              { label: 'High', count: scaResult.summary?.high, color: '#d97706' },
              { label: 'Medium', count: scaResult.summary?.medium, color: '#eab308' },
              { label: 'Low', count: scaResult.summary?.low, color: '#059669' },
            ].map(s => (
              <div key={s.label} style={{ padding: '8px 16px', borderRadius: 8, background: `${s.color}10`, textAlign: 'center', minWidth: 70 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.count || 0}</div>
                <div style={{ fontSize: 10, color: s.color, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
            <div style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--surface)', textAlign: 'center', minWidth: 70 }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{scaResult.summary?.filesScanned || 0}</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600 }}>Files Scanned</div>
            </div>
          </div>
          {(scaResult.findings || []).length > 0 && (
            <div style={{ maxHeight: 250, overflowY: 'auto' }}>
              {scaResult.findings.map((f, i) => {
                const sevColor = { critical: '#dc2626', high: '#d97706', medium: '#eab308', low: '#059669' }[f.severity] || '#6b7280';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 11 }}>
                    <span className="badge" style={{ background: `${sevColor}20`, color: sevColor, flexShrink: 0, fontSize: 9 }}>{f.severity.toUpperCase()}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{f.message}</div>
                      <div style={{ color: 'var(--text-dim)', fontSize: 10, marginTop: 2 }}>
                        <span style={{ marginRight: 8 }}>{f.scanner}</span>
                        {f.file && <code style={{ fontSize: 10 }}>{f.file}</code>}
                        {f.component && <span style={{ marginLeft: 4 }}>{f.component}@{f.version}</span>}
                      </div>
                    </div>
                    <code style={{ fontSize: 9, color: 'var(--text-dim)', flexShrink: 0 }}>{f.rule}</code>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            Scanners: {(scaResult.scanners || []).join(' • ')} — {scaResult.timestamp ? new Date(scaResult.timestamp).toLocaleString() : ''}
          </div>
        </div>
      )}

      {/* SECTION 4: Merge Actions — always show when both branches selected */}
      {hasBothBranches && comparison && (
        <div className="card mb-4">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Merge Actions
            <span className="badge" style={{ fontSize: 9, background: 'rgba(220,38,38,0.1)', color: 'var(--error)' }}>SCA scan mandatory</span>
          </div>
          {mergeResult?.status === 201 || mergeResult?.status === 200 ? (
            <div style={{ padding: 12, background: 'rgba(5,150,105,0.1)', borderRadius: 8, color: '#059669' }}>
              <strong>{'\u2705'} Merged successfully!</strong>
              <span style={{ marginLeft: 8 }}>Commit: <code>{mergeResult.data?.sha?.substring(0, 7)}</code></span>
            </div>
          ) : hasConflict ? (
            <div style={{ padding: 12, background: 'rgba(220,38,38,0.1)', borderRadius: 8, color: '#dc2626', marginBottom: 12 }}>
              <strong>{'\u26A0\uFE0F'} Merge conflicts detected.</strong> Resolve conflicts on GitHub or push a resolution commit, then retry.
            </div>
          ) : isIdentical ? (
            <div style={{ padding: 12, background: 'rgba(107,114,128,0.1)', borderRadius: 8, fontSize: 12, color: '#6b7280' }}>
              Branches are identical — nothing to merge.
            </div>
          ) : (
            <>
              {canMerge && (
                <div style={{ padding: 8, background: 'rgba(5,150,105,0.08)', borderRadius: 6, marginBottom: 12, fontSize: 12, color: '#059669' }}>
                  {'\u2705'} This branch can be merged automatically ({comparison.ahead_by} commit{comparison.ahead_by !== 1 ? 's' : ''})
                </div>
              )}
              {comparison.behind_by > 0 && (
                <div style={{ padding: 8, background: 'rgba(217,119,6,0.08)', borderRadius: 6, marginBottom: 12, fontSize: 12, color: '#d97706' }}>
                  {'\u26A0\uFE0F'} Source is {comparison.behind_by} commit{comparison.behind_by !== 1 ? 's' : ''} behind target — consider rebasing first
                </div>
              )}
            </>
          )}
          {!isIdentical && !(mergeResult?.status === 201 || mergeResult?.status === 200) && (
            <>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label>Merge commit message</label>
                <textarea value={mergeMessage} onChange={e => setMergeMessage(e.target.value)} rows={2} style={{ fontFamily: 'monospace', fontSize: 12 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={doMerge} disabled={merging || !canMerge}>
                  {scaRunning ? '\uD83D\uDD12 Running SCA scan...' : merging ? 'Merging...' : `\uD83D\uDD12 Scan & Merge into ${targetBranch}`}
                </button>
                {!canMerge && !isIdentical && (
                  <span className="text-dim text-sm" style={{ alignSelf: 'center' }}>
                    Source has no unique commits to merge
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Activity Log */}
      {activityLog.length > 0 && (
        <div className="card mb-4">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ flex: 1 }}>Activity Log</span>
            <button className="btn btn-sm" onClick={() => setActivityLog([])}>Clear</button>
          </div>
          <div style={{ background: '#0d1117', borderRadius: 6, padding: 12, maxHeight: 300, overflowY: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.8 }}>
            {activityLog.map((entry, i) => {
              const icon = entry.status === 'success' ? '\u2705' : entry.status === 'error' ? '\u274C' : entry.status === 'warn' ? '\u26A0\uFE0F' : '\u25B6';
              const color = entry.status === 'success' ? '#7ee787' : entry.status === 'error' ? '#f47067' : entry.status === 'warn' ? '#d29922' : '#8b949e';
              return (
                <div key={i} style={{ color }}>
                  <span style={{ color: '#484f58', marginRight: 8 }}>{entry.time}</span>
                  <span style={{ marginRight: 6 }}>{icon}</span>
                  {entry.msg}
                </div>
              );
            })}
            {merging && (
              <div style={{ color: '#58a6ff' }}>
                <span style={{ color: '#484f58', marginRight: 8 }}>{new Date().toLocaleTimeString()}</span>
                <span className="spinner" style={{ width: 10, height: 10, display: 'inline-block', marginRight: 6 }} />
                Processing...
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 5: Jira Tickets */}
      <div className="card mb-4">
        <div className="card-header">Link Jira Ticket</div>
        <ALMSelector
          compact={true}
          onTicketSelect={(issue) => {
            setSelectedTicket(issue);
            setMergeMessage('[' + displayKey(issue) + '] ' + (issue.fields?.summary || ''));
          }}
        />
      </div>

      {/* Selected ticket + PR title */}
      {selectedTicket && (
        <div className="card mb-4">
          <div className="card-header">Selected Ticket</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
            <span style={{ fontSize: 20 }}>{typeIcon(selectedTicket)}</span>
            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{displayKey(selectedTicket)}</span>
            <span style={{ flex: 1 }}>{selectedTicket.fields?.summary}</span>
            <button className="btn btn-sm" onClick={() => setDetailTicket(selectedTicket)}>Details</button>
            <button className="btn btn-sm" onClick={() => { setSelectedTicket(null); }}>Clear</button>
          </div>
        </div>
      )}

      {detailTicket && <TicketDetailPanel issue={detailTicket} onClose={() => setDetailTicket(null)} />}
    </div>
  );
}
