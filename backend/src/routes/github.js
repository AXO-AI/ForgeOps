const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const GITHUB_API = 'https://api.github.com';

function getHeaders() {
  return {
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function getOrg() {
  return process.env.GITHUB_ORG || 'askboppana';
}

// GET /api/github/repos — paginated fetch ALL repos from org
router.get('/repos', async (req, res) => {
  try {
    const org = req.query.org || getOrg();
    const allRepos = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await fetch(
        `${GITHUB_API}/orgs/${org}/repos?per_page=${perPage}&page=${page}`,
        { headers: getHeaders() }
      );

      if (!response.ok) {
        // Try user repos if org fails
        const userResponse = await fetch(
          `${GITHUB_API}/users/${org}/repos?per_page=${perPage}&page=${page}`,
          { headers: getHeaders() }
        );
        if (!userResponse.ok) {
          const data = await userResponse.json();
          return res.status(userResponse.status).json(data);
        }
        const repos = await userResponse.json();
        allRepos.push(...repos);
        if (repos.length < perPage) break;
        page++;
        continue;
      }

      const repos = await response.json();
      allRepos.push(...repos);
      if (repos.length < perPage) break;
      page++;
    }

    res.json(allRepos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/github/repos/:owner/:repo/branches
router.get('/repos/:owner/:repo/branches', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/branches?per_page=100`,
      { headers: getHeaders() }
    );
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/github/repos/:owner/:repo/runs — list workflow runs
router.get('/repos/:owner/:repo/runs', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const queryParams = new URLSearchParams();
    if (req.query.per_page) queryParams.set('per_page', req.query.per_page);
    if (req.query.page) queryParams.set('page', req.query.page);
    if (req.query.status) queryParams.set('status', req.query.status);
    if (req.query.created) queryParams.set('created', req.query.created);
    if (req.query.branch) queryParams.set('branch', req.query.branch);

    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/actions/runs?${queryParams}`,
      { headers: getHeaders() }
    );
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/github/build-history — aggregated build/deploy history across repos
// Query: months (default 3), environment (optional: int/qa/stage/prod)
router.get('/build-history', async (req, res) => {
  try {
    const org = getOrg();
    const months = parseInt(req.query.months) || 3;
    const envFilter = (req.query.environment || '').toLowerCase();
    const repoFilter = req.query.repo || '';
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    const sinceISO = since.toISOString().split('T')[0];

    // If specific repo, fetch from that repo. Otherwise fetch from forgeopstest repos
    let targetRepos = [];
    if (repoFilter) {
      targetRepos = [repoFilter];
    } else {
      // Fetch repos that have workflows (forgeopstest-* for now, or all with recent runs)
      const repoRes = await fetch(`${GITHUB_API}/users/${org}/repos?per_page=100&sort=updated`, { headers: getHeaders() });
      const repos = await repoRes.json();
      targetRepos = (Array.isArray(repos) ? repos : [])
        .filter(r => !r.archived && !r.fork && r.pushed_at && new Date(r.pushed_at) > since)
        .map(r => r.name)
        .slice(0, 30); // Limit to 30 most recent repos
    }

    const allRuns = [];
    for (const repoName of targetRepos) {
      try {
        const qs = new URLSearchParams({ per_page: '100', created: `>=${sinceISO}` });
        if (envFilter) {
          // Map environment to branch patterns
          const branchMap = { int: 'int', qa: 'qa', stage: 'stage', staging: 'stage', prod: 'main', production: 'main' };
          const branch = branchMap[envFilter] || envFilter;
          qs.set('branch', branch);
        }
        const runRes = await fetch(`${GITHUB_API}/repos/${org}/${repoName}/actions/runs?${qs}`, { headers: getHeaders() });
        if (!runRes.ok) continue;
        const runData = await runRes.json();
        const runs = runData.workflow_runs || [];
        runs.forEach(run => {
          // Determine environment from branch name
          const branch = (run.head_branch || '').toLowerCase();
          let environment = 'development';
          if (branch === 'main' || branch === 'master') environment = 'prod';
          else if (branch === 'stage' || branch === 'staging') environment = 'stage';
          else if (branch === 'qa') environment = 'qa';
          else if (branch === 'int') environment = 'int';

          allRuns.push({
            id: run.id,
            repo: repoName,
            branch: run.head_branch,
            environment,
            status: run.conclusion || run.status,
            workflow: run.name,
            commitSha: run.head_sha?.substring(0, 7),
            commitMessage: run.display_title || '',
            triggeredBy: run.actor?.login || '',
            startedAt: run.run_started_at || run.created_at,
            completedAt: run.updated_at,
            duration: run.run_started_at && run.updated_at
              ? Math.round((new Date(run.updated_at) - new Date(run.run_started_at)) / 1000)
              : null,
            runNumber: run.run_number,
            event: run.event,
          });
        });
      } catch {}
    }

    // Sort by date descending
    allRuns.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

    // Build summary
    const summary = {
      total: allRuns.length,
      byEnvironment: {},
      byStatus: {},
      byRepo: {},
      byMonth: {},
    };
    allRuns.forEach(r => {
      summary.byEnvironment[r.environment] = (summary.byEnvironment[r.environment] || 0) + 1;
      summary.byStatus[r.status] = (summary.byStatus[r.status] || 0) + 1;
      summary.byRepo[r.repo] = (summary.byRepo[r.repo] || 0) + 1;
      const month = r.startedAt ? r.startedAt.substring(0, 7) : 'unknown';
      summary.byMonth[month] = (summary.byMonth[month] || 0) + 1;
    });

    res.json({ runs: allRuns, summary, since: sinceISO, reposScanned: targetRepos.length });
  } catch (err) {
    console.error('Build history error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/github/repos/:owner/:repo/dispatches — trigger workflow
router.post('/repos/:owner/:repo/dispatches', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/dispatches`,
      {
        method: 'POST',
        headers: {
          ...getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      }
    );

    if (response.status === 204) {
      return res.json({ success: true });
    }
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/github/repos/:owner/:repo/commits
router.get('/repos/:owner/:repo/commits', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const qs = new URLSearchParams();
    if (req.query.branch) qs.set('sha', req.query.branch);
    qs.set('per_page', req.query.per_page || '30');
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/commits?${qs}`, { headers: getHeaders() });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/github/repos/:owner/:repo/compare?base=main&head=feature/x
router.get('/repos/:owner/:repo/compare', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { base, head } = req.query;
    if (!base || !head) return res.status(400).json({ error: 'base and head query params required' });
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`, { headers: getHeaders() });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/github/repos/:owner/:repo/merge
router.post('/repos/:owner/:repo/merge', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { base, head, commit_message } = req.body;
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/merges`, {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ base, head, commit_message }),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/github/repos/:owner/:repo/contents/*
router.get('/repos/:owner/:repo/contents/*', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const path = req.params[0];
    const qs = req.query.ref ? `?ref=${req.query.ref}` : '';
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}${qs}`, { headers: getHeaders() });
    const data = await response.json();
    if (data.content) data.decoded = Buffer.from(data.content, 'base64').toString('utf8');
    res.status(response.status).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/github/repos/:owner/:repo/contents/*
router.put('/repos/:owner/:repo/contents/*', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const path = req.params[0];
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/github/repos/:owner/:repo/pulls
router.post('/repos/:owner/:repo/pulls', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/github/repos/:owner/:repo/pulls/:number/files
router.get('/repos/:owner/:repo/pulls/:number/files', async (req, res) => {
  try {
    const { owner, repo, number } = req.params;
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${number}/files`, { headers: getHeaders() });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/github/repos/:owner/:repo/runs/:runId/jobs
router.get('/repos/:owner/:repo/runs/:runId/jobs', async (req, res) => {
  try {
    const { owner, repo, runId } = req.params;
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/actions/runs/${runId}/jobs`, { headers: getHeaders() });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/github/repos/:owner/:repo/jobs/:jobId/logs
router.get('/repos/:owner/:repo/jobs/:jobId/logs', async (req, res) => {
  try {
    const { owner, repo, jobId } = req.params;
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`, {
      headers: getHeaders(),
      redirect: 'follow',
    });
    const logs = await response.text();
    res.status(response.status).json({ logs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/github/repos/:owner/:repo/runs/:runId/artifacts
router.get('/repos/:owner/:repo/runs/:runId/artifacts', async (req, res) => {
  try {
    const { owner, repo, runId } = req.params;
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`, { headers: getHeaders() });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/github/repos/:owner/:repo/pulls — list pull requests
router.get('/repos/:owner/:repo/pulls', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const qs = new URLSearchParams();
    if (req.query.state) qs.set('state', req.query.state);
    qs.set('per_page', req.query.per_page || '30');
    if (req.query.page) qs.set('page', req.query.page);
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls?${qs}`, { headers: getHeaders() });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/github/repos/:owner/:repo/pulls/:number — single PR detail
router.get('/repos/:owner/:repo/pulls/:number', async (req, res) => {
  try {
    const { owner, repo, number } = req.params;
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${number}`, { headers: getHeaders() });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/github/repos/:owner/:repo/pulls/:number/reviews
router.get('/repos/:owner/:repo/pulls/:number/reviews', async (req, res) => {
  try {
    const { owner, repo, number } = req.params;
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${number}/reviews`, { headers: getHeaders() });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/github/repos/:owner/:repo/pulls/:number/comments
router.get('/repos/:owner/:repo/pulls/:number/comments', async (req, res) => {
  try {
    const { owner, repo, number } = req.params;
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${number}/comments`, { headers: getHeaders() });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/github/repos/:owner/:repo/pulls/:number/reviews
router.post('/repos/:owner/:repo/pulls/:number/reviews', async (req, res) => {
  try {
    const { owner, repo, number } = req.params;
    const { event, body } = req.body;
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${number}/reviews`, {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, body }),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/github/repos/:owner/:repo/readme
router.get('/repos/:owner/:repo/readme', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, { headers: getHeaders() });
    const data = await response.json();
    if (data.content) {
      data.decoded = Buffer.from(data.content, 'base64').toString('utf8');
    }
    res.status(response.status).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/github/repos/:owner/:repo/branches/search?q=...
router.get('/repos/:owner/:repo/branches/search', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const query = (req.query.q || '').toLowerCase();
    const allBranches = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/branches?per_page=${perPage}&page=${page}`,
        { headers: getHeaders() }
      );
      if (!response.ok) {
        const data = await response.json();
        return res.status(response.status).json(data);
      }
      const branches = await response.json();
      allBranches.push(...branches);
      if (branches.length < perPage) break;
      page++;
    }

    const filtered = query
      ? allBranches.filter(b => b.name.toLowerCase().includes(query))
      : allBranches;
    res.json(filtered);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/github/repos/:owner/:repo/branches/create
router.post('/repos/:owner/:repo/branches/create', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { branchName, fromBranch = 'main' } = req.body;
    // Get SHA of source branch
    const refRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(fromBranch)}`, { headers: getHeaders() });
    if (!refRes.ok) {
      const err = await refRes.json();
      return res.status(refRes.status).json(err);
    }
    const refData = await refRes.json();
    const sha = refData.object.sha;
    // Create new branch
    const createRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha }),
    });
    const createData = await createRes.json();
    if (!createRes.ok) return res.status(createRes.status).json(createData);
    res.json({ success: true, branch: branchName, sha });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/github/repos/:owner/:repo/tree?ref=branchName
router.get('/repos/:owner/:repo/tree', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const ref = req.query.ref || 'main';
    // Get branch SHA
    const branchRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(ref)}`, { headers: getHeaders() });
    if (!branchRes.ok) {
      const err = await branchRes.json();
      return res.status(branchRes.status).json(err);
    }
    const branchData = await branchRes.json();
    const commitSha = branchData.object.sha;
    // Get commit to find tree SHA
    const commitRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits/${commitSha}`, { headers: getHeaders() });
    const commitData = await commitRes.json();
    const treeSha = commitData.tree.sha;
    // Get tree recursively
    const treeRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`, { headers: getHeaders() });
    const treeData = await treeRes.json();
    res.json({ tree: treeData.tree.map(t => ({ path: t.path, type: t.type, sha: t.sha, size: t.size || 0 })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/github/repos/:owner/:repo/blob/:sha
router.get('/repos/:owner/:repo/blob/:sha', async (req, res) => {
  try {
    const { owner, repo, sha } = req.params;
    const blobRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/blobs/${sha}`, { headers: getHeaders() });
    const blobData = await blobRes.json();
    if (!blobRes.ok) return res.status(blobRes.status).json(blobData);
    const content = blobData.encoding === 'base64' ? Buffer.from(blobData.content, 'base64').toString('utf8') : blobData.content;
    res.json({ content, sha: blobData.sha, size: blobData.size, encoding: blobData.encoding });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/github/repos/:owner/:repo/commit-file
router.put('/repos/:owner/:repo/commit-file', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { path, content, message, branch, sha } = req.body;
    const body = {
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch,
    };
    if (sha) body.sha = sha;
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json({ success: true, commit_sha: data.commit.sha, path });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/github/repos/:owner/:repo/commit-multiple
router.post('/repos/:owner/:repo/commit-multiple', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { files, message, branch } = req.body;
    const hdrs = getHeaders();
    const jsonHdrs = { ...hdrs, 'Content-Type': 'application/json' };

    // 1. Get current commit SHA for branch
    const refRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`, { headers: hdrs });
    if (!refRes.ok) { const e = await refRes.json(); return res.status(refRes.status).json(e); }
    const refData = await refRes.json();
    const currentCommitSha = refData.object.sha;

    // 2. Get tree SHA from current commit
    const commitRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits/${currentCommitSha}`, { headers: hdrs });
    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;

    // 3. Create blobs for each file
    const treeItems = [];
    for (const file of files) {
      const blobRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        headers: jsonHdrs,
        body: JSON.stringify({ content: Buffer.from(file.content, 'utf8').toString('base64'), encoding: 'base64' }),
      });
      const blobData = await blobRes.json();
      if (!blobRes.ok) return res.status(blobRes.status).json(blobData);
      treeItems.push({ path: file.path, mode: '100644', type: 'blob', sha: blobData.sha });
    }

    // 4. Create new tree
    const treeRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: jsonHdrs,
      body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
    });
    const treeData = await treeRes.json();
    if (!treeRes.ok) return res.status(treeRes.status).json(treeData);

    // 5. Create commit
    const newCommitRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: jsonHdrs,
      body: JSON.stringify({ message, tree: treeData.sha, parents: [currentCommitSha] }),
    });
    const newCommitData = await newCommitRes.json();
    if (!newCommitRes.ok) return res.status(newCommitRes.status).json(newCommitData);

    // 6. Update branch ref
    const updateRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: 'PATCH',
      headers: jsonHdrs,
      body: JSON.stringify({ sha: newCommitData.sha }),
    });
    const updateData = await updateRes.json();
    if (!updateRes.ok) return res.status(updateRes.status).json(updateData);

    res.json({ success: true, commit_sha: newCommitData.sha, files_committed: files.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/github/repos/:owner/:repo/revert/:sha
router.post('/repos/:owner/:repo/revert/:sha', async (req, res) => {
  try {
    const { owner, repo, sha } = req.params;
    const { branch } = req.body;
    const hdrs = getHeaders();
    const jsonHdrs = { ...hdrs, 'Content-Type': 'application/json' };

    // Get the commit to revert
    const commitRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits/${sha}`, { headers: hdrs });
    const commitData = await commitRes.json();
    if (!commitRes.ok) return res.status(commitRes.status).json(commitData);

    // Get parent tree (the state before this commit)
    const parentSha = commitData.parents[0].sha;
    const parentRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits/${parentSha}`, { headers: hdrs });
    const parentData = await parentRes.json();

    // Get current branch HEAD
    const refRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`, { headers: hdrs });
    const refData = await refRes.json();
    const currentHead = refData.object.sha;

    // Create revert commit with parent's tree
    const revertRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: jsonHdrs,
      body: JSON.stringify({
        message: `Revert "${commitData.message}"`,
        tree: parentData.tree.sha,
        parents: [currentHead],
      }),
    });
    const revertData = await revertRes.json();
    if (!revertRes.ok) return res.status(revertRes.status).json(revertData);

    // Update branch ref
    await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: 'PATCH',
      headers: jsonHdrs,
      body: JSON.stringify({ sha: revertData.sha }),
    });

    res.json({ success: true, revert_commit_sha: revertData.sha });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/github/repos/:owner/:repo/cherry-pick
router.post('/repos/:owner/:repo/cherry-pick', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { commitSha, targetBranch } = req.body;
    const hdrs = getHeaders();
    const jsonHdrs = { ...hdrs, 'Content-Type': 'application/json' };

    // Get the commit to cherry-pick
    const commitRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits/${commitSha}`, { headers: hdrs });
    const commitData = await commitRes.json();
    if (!commitRes.ok) return res.status(commitRes.status).json(commitData);

    // Get target branch HEAD
    const refRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(targetBranch)}`, { headers: hdrs });
    const refData = await refRes.json();
    if (!refRes.ok) return res.status(refRes.status).json(refData);
    const targetHead = refData.object.sha;

    // Create merge commit using the cherry-picked commit's tree on top of target
    // First, attempt a tree merge
    const targetCommitRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits/${targetHead}`, { headers: hdrs });
    const targetCommitData = await targetCommitRes.json();

    // Create new commit with the cherry-picked commit's tree applied
    const newCommitRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: jsonHdrs,
      body: JSON.stringify({
        message: `Cherry-pick: ${commitData.message}`,
        tree: commitData.tree.sha,
        parents: [targetHead],
      }),
    });
    const newCommitData = await newCommitRes.json();
    if (!newCommitRes.ok) return res.status(newCommitRes.status).json(newCommitData);

    // Update target branch ref
    await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(targetBranch)}`, {
      method: 'PATCH',
      headers: jsonHdrs,
      body: JSON.stringify({ sha: newCommitData.sha }),
    });

    res.json({ success: true, new_commit_sha: newCommitData.sha });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
