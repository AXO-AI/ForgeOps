const API = 'http://localhost:3001/api';

/* ── Jira helpers ───────────────────────────────────────────────── */

export async function jiraSearch(jql, fields = [], maxResults = 50, startAt = 0) {
  const res = await fetch(`${API}/jira/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jql, fields, maxResults, startAt }),
  });
  if (!res.ok) throw new Error(`jiraSearch failed: ${res.status}`);
  return res.json();
}

export async function jiraSearchAll(jql, fields = []) {
  const params = new URLSearchParams({ jql, fields: fields.join(',') });
  const res = await fetch(`${API}/jira/search-all?${params}`);
  if (!res.ok) throw new Error(`jiraSearchAll failed: ${res.status}`);
  return res.json();
}

export async function jiraGet(path) {
  const res = await fetch(`${API}/jira${path}`);
  if (!res.ok) throw new Error(`jiraGet ${path} failed: ${res.status}`);
  return res.json();
}

export async function jiraPost(path, body) {
  const res = await fetch(`${API}/jira${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`jiraPost ${path} failed: ${res.status}`);
  return res.json();
}

export async function jiraPut(path, body) {
  const res = await fetch(`${API}/jira${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`jiraPut ${path} failed: ${res.status}`);
  return res.json();
}

/* ── GitHub helpers ─────────────────────────────────────────────── */

export async function getRepos() {
  const res = await fetch(`${API}/github/repos`);
  if (!res.ok) throw new Error(`getRepos failed: ${res.status}`);
  return res.json();
}

export async function getBranches(owner, repo) {
  const res = await fetch(`${API}/github/repos/${owner}/${repo}/branches`);
  if (!res.ok) throw new Error(`getBranches failed: ${res.status}`);
  return res.json();
}

/* ── AI helpers ─────────────────────────────────────────────────── */

export async function analyzeTranscript(data) {
  const res = await fetch(`${API}/ai/analyze-transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`analyzeTranscript failed: ${res.status}`);
  return res.json();
}

/* ── Teams helpers ──────────────────────────────────────────────── */

export async function sendTeamsNotification(card) {
  const res = await fetch(`${API}/teams/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card),
  });
  if (!res.ok) throw new Error(`sendTeamsNotification failed: ${res.status}`);
  return res.json();
}

/* ── Display helpers ────────────────────────────────────────────── */

const TYPE_PREFIX = {
  Story: 'US',
  Bug: 'DEF',
  Task: 'TASK',
  Epic: 'EPIC',
  'Sub-task': 'TASK',
};

export function displayKey(issue) {
  if (!issue) return '';
  const type = issue.fields?.issuetype?.name || '';
  const prefix = TYPE_PREFIX[type] || 'TASK';
  // Extract numeric part from key (e.g. SCRUM-42 -> 42)
  const num = issue.key?.replace(/^[A-Z]+-/, '') || '?';
  return `${prefix}-${num}`;
}

export function typeIcon(issue) {
  const type = issue?.fields?.issuetype?.name || '';
  switch (type) {
    case 'Story':   return '\u{1F4D8}';   // blue book
    case 'Bug':     return '\u{1F41E}';   // lady bug
    case 'Task':    return '\u2705';       // check mark
    case 'Sub-task':return '\u{1F4CB}';   // clipboard
    case 'Epic':    return '\u26A1';       // lightning
    default:        return '\u{1F4CC}';   // pin
  }
}

export function statusColor(status) {
  if (!status) return '#6b7280';
  const s = status.toLowerCase();
  if (s.includes('done') || s.includes('closed') || s.includes('resolved')) return '#059669';
  if (s.includes('progress') || s.includes('review'))                       return '#0284c7';
  if (s.includes('block'))                                                  return '#dc2626';
  if (s.includes('test') || s.includes('qa'))                               return '#d97706';
  return '#6b7280';
}

export function priorityColor(priority) {
  if (!priority) return '#6b7280';
  const p = priority.toLowerCase();
  if (p.includes('highest') || p.includes('critical')) return '#dc2626';
  if (p.includes('high'))                              return '#f97316';
  if (p.includes('medium'))                            return '#d97706';
  if (p.includes('low'))                               return '#059669';
  if (p.includes('lowest'))                            return '#6b7280';
  return '#6b7280';
}

export function groupByRelease(issues) {
  const groups = {};
  for (const issue of issues) {
    const versions = issue.fields?.fixVersions || [];
    const release = versions.length > 0 ? versions[0].name : 'Unscheduled';
    if (!groups[release]) groups[release] = { stories: [], defects: [] };
    const type = issue.fields?.issuetype?.name || '';
    if (type === 'Bug') {
      groups[release].defects.push(issue);
    } else {
      groups[release].stories.push(issue);
    }
  }
  return groups;
}
