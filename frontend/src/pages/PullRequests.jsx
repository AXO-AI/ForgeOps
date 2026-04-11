import { useState, useEffect } from 'react';
import { getRepos, getBranches, jiraSearch, groupByRelease, displayKey, typeIcon } from '../api';
import ReleaseGroup from '../components/ReleaseGroup';
import TicketDetailPanel from '../components/TicketDetailPanel';

export default function PullRequests() {
  // Repo / branch state
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [branches, setBranches] = useState([]);
  const [sourceBranch, setSourceBranch] = useState('');
  const [targetBranch, setTargetBranch] = useState('');

  // Jira state
  const [releases, setReleases] = useState([]);
  const [selectedRelease, setSelectedRelease] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [search, setSearch] = useState('');
  const [issues, setIssues] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailTicket, setDetailTicket] = useState(null);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Load repos on mount
  useEffect(() => {
    getRepos()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setRepos(list);
        if (list.length > 0) {
          setSelectedRepo(`${list[0].owner?.login || list[0].owner}/${list[0].name}`);
        }
      })
      .catch(() => setRepos([]))
      .finally(() => setLoadingRepos(false));
  }, []);

  // Load branches when repo changes
  useEffect(() => {
    if (!selectedRepo) return;
    const [owner, repo] = selectedRepo.split('/');
    getBranches(owner, repo)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setBranches(list);
        const main = list.find((b) => b.name === 'main') || list.find((b) => b.name === 'master') || list[0];
        if (main) setTargetBranch(main.name);
        setSourceBranch('');
      })
      .catch(() => setBranches([]));
  }, [selectedRepo]);

  // Load Jira tickets
  useEffect(() => {
    loadTickets();
  }, [selectedRelease, selectedType]);

  async function loadTickets() {
    setLoadingTickets(true);
    try {
      let jql = 'project != "" ORDER BY fixVersion ASC, issuetype ASC, priority DESC';
      const clauses = [];
      if (selectedRelease) clauses.push(`fixVersion = "${selectedRelease}"`);
      if (selectedType) clauses.push(`issuetype = "${selectedType}"`);
      if (clauses.length > 0) {
        jql = clauses.join(' AND ') + ' ORDER BY fixVersion ASC, priority DESC';
      }

      const data = await jiraSearch(
        jql,
        ['summary', 'status', 'issuetype', 'priority', 'fixVersions', 'assignee'],
        100
      );
      const allIssues = data?.issues || [];
      setIssues(allIssues);
      setGrouped(groupByRelease(allIssues));

      // Extract unique releases
      const rels = new Set();
      allIssues.forEach((i) =>
        (i.fields?.fixVersions || []).forEach((v) => rels.add(v.name))
      );
      setReleases([...rels].sort());
    } catch (e) {
      console.error('loadTickets failed', e);
      setIssues([]);
      setGrouped({});
    }
    setLoadingTickets(false);
  }

  // Filter by search text
  const filteredGrouped = {};
  for (const [rel, group] of Object.entries(grouped)) {
    const filter = (arr) =>
      arr.filter((i) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          displayKey(i).toLowerCase().includes(s) ||
          (i.fields?.summary || '').toLowerCase().includes(s)
        );
      });
    const stories = filter(group.stories);
    const defects = filter(group.defects);
    if (stories.length > 0 || defects.length > 0) {
      filteredGrouped[rel] = { stories, defects };
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Pull Requests</h1>
        <p>Create pull requests linking Jira tickets to GitHub branches</p>
      </div>

      {/* Repo and branch dropdowns */}
      <div className="card mb-4">
        <div className="card-header">Repository & Branches</div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label>Repository</label>
            <select value={selectedRepo} onChange={(e) => setSelectedRepo(e.target.value)}>
              {loadingRepos && <option>Loading...</option>}
              {repos.map((r) => {
                const full = `${r.owner?.login || r.owner}/${r.name}`;
                return <option key={full} value={full}>{full}</option>;
              })}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Source Branch</label>
            <select value={sourceBranch} onChange={(e) => setSourceBranch(e.target.value)}>
              <option value="">Select source...</option>
              {branches.map((b) => (
                <option key={b.name} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Target Branch</label>
            <select value={targetBranch} onChange={(e) => setTargetBranch(e.target.value)}>
              {branches.map((b) => (
                <option key={b.name} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Jira tickets section */}
      <div className="card mb-4">
        <div className="card-header">Link Jira Tickets</div>

        <div className="form-row">
          <div className="form-group">
            <label>Release</label>
            <select value={selectedRelease} onChange={(e) => setSelectedRelease(e.target.value)}>
              <option value="">All Releases</option>
              {releases.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              <option value="">All Types</option>
              <option value="Story">Story</option>
              <option value="Bug">Bug / Defect</option>
              <option value="Task">Task</option>
              <option value="Epic">Epic</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Search</label>
            <input
              type="search"
              className="search-input"
              placeholder="Filter tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loadingTickets ? (
          <div className="loading-center"><span className="spinner" /> Loading tickets...</div>
        ) : Object.keys(filteredGrouped).length === 0 ? (
          <div className="empty-state">No tickets found</div>
        ) : (
          Object.entries(filteredGrouped).map(([rel, group]) => (
            <ReleaseGroup
              key={rel}
              release={rel}
              stories={group.stories}
              defects={group.defects}
              selectedKey={selectedTicket?.key}
              onSelect={(issue) => setSelectedTicket(issue)}
            />
          ))
        )}
      </div>

      {/* Selected ticket preview */}
      {selectedTicket && (
        <div className="card mb-4">
          <div className="card-header">Selected Ticket</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
            <span style={{ fontSize: 20 }}>{typeIcon(selectedTicket)}</span>
            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{displayKey(selectedTicket)}</span>
            <span>{selectedTicket.fields?.summary}</span>
            <button
              className="btn btn-sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => setDetailTicket(selectedTicket)}
            >
              View Details
            </button>
          </div>
        </div>
      )}

      {/* Create PR button */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          className="btn btn-primary"
          disabled={!sourceBranch || !targetBranch || !selectedRepo}
          onClick={() => {
            const [owner, repo] = selectedRepo.split('/');
            const url = `https://github.com/${owner}/${repo}/compare/${targetBranch}...${sourceBranch}`;
            window.open(url, '_blank');
          }}
        >
          Create on GitHub
        </button>
        {(!sourceBranch || !targetBranch) && (
          <span className="text-dim text-sm" style={{ alignSelf: 'center' }}>
            Select source and target branches to create a PR
          </span>
        )}
      </div>

      {/* Detail panel */}
      {detailTicket && (
        <TicketDetailPanel
          issue={detailTicket}
          onClose={() => setDetailTicket(null)}
          onUpdate={() => loadTickets()}
        />
      )}
    </div>
  );
}
