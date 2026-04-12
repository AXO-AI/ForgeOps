const fetch = require('node-fetch');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

function respond(code, data) {
  return { statusCode: code, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}

function getToken() {
  return process.env.GITHUB_TOKEN;
}

function getOrg() {
  return process.env.GITHUB_ORG;
}

async function ghFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `https://api.github.com${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return { data, headers: res.headers };
}

async function paginateAll(path) {
  let allItems = [];
  let page = 1;
  while (true) {
    const sep = path.includes('?') ? '&' : '?';
    const { data, headers } = await ghFetch(`${path}${sep}per_page=100&page=${page}`);
    if (!Array.isArray(data) || data.length === 0) break;
    allItems = allItems.concat(data);
    const link = headers.get('link') || '';
    if (!link.includes('rel="next"')) break;
    page++;
  }
  return allItems;
}

function generateMockBuilds(count = 50) {
  const repos = ['spring-auth','react-portal','node-gateway','py-analytics','dotnet-api','sf-sales','rpa-invoicing','spring-payments','react-dashboard','node-orders'];
  const users = ['ashwin','priya','raj','sarah','marcus','system'];
  const envs = ['INT','INT','QA','QA','STAGE','PROD'];
  const builds = [];
  for (let i = 0; i < count; i++) {
    const status = Math.random() > 0.15 ? 'success' : (Math.random() > 0.5 ? 'failure' : 'cancelled');
    const env = envs[Math.floor(Math.random() * envs.length)];
    const startedAt = new Date(Date.now() - Math.random() * 7 * 86400000).toISOString();
    const duration = Math.floor(30 + Math.random() * 270);
    const failStage = status === 'failure' ? Math.floor(2 + Math.random() * 4) : -1;
    builds.push({
      id: 1000 + i, repo: repos[i % repos.length],
      branch: Math.random() > 0.3 ? 'feature/us-' + (300 + i) : 'main',
      status, environment: env, commitSha: Math.random().toString(36).substring(2,9),
      commitMessage: ['fix: auth timeout','feat: add dashboard','chore: update deps','fix: null pointer','feat: new API endpoint','test: add coverage'][i % 6],
      triggeredBy: users[Math.floor(Math.random() * users.length)],
      startedAt, duration,
      stages: [
        { name: 'Checkout', status: failStage === 0 ? 'failure' : 'success', duration: 3 },
        { name: 'Build', status: failStage <= 1 && failStage >= 0 ? 'failure' : (failStage > 1 || failStage < 0 ? 'success' : 'pending'), duration: Math.floor(15 + Math.random() * 45) },
        { name: 'Test', status: failStage === 2 ? 'failure' : (failStage > 2 ? 'pending' : failStage < 0 ? 'success' : 'pending'), duration: Math.floor(20 + Math.random() * 70) },
        { name: 'SAST', status: failStage === 3 ? 'failure' : (failStage > 3 || (failStage >= 0 && failStage < 3) ? 'pending' : 'success'), duration: Math.floor(10 + Math.random() * 20) },
        { name: 'SCA', status: failStage === 4 ? 'failure' : (failStage >= 0 ? 'pending' : 'success'), duration: Math.floor(5 + Math.random() * 10) },
        { name: 'Deploy', status: failStage === 5 ? 'failure' : (failStage >= 0 ? 'pending' : 'success'), duration: Math.floor(10 + Math.random() * 20) },
        { name: 'Notify', status: failStage >= 0 ? 'pending' : 'success', duration: 2 },
      ].map((s, idx) => ({ ...s, status: idx < failStage ? 'success' : idx === failStage ? 'failure' : idx > failStage && failStage >= 0 ? 'pending' : s.status })),
      runNumber: 200 + i
    });
  }
  builds.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  return builds;
}

const MOCK_ENVS = [
  { name: 'INT', status: 'healthy', version: 'v2.0.0', build: 247, deployed_at: new Date(Date.now() - 7200000).toISOString(), branch: 'main', commit: 'a3de5b2' },
  { name: 'QA', status: 'healthy', version: 'v1.9.3', build: 244, deployed_at: new Date(Date.now() - 259200000).toISOString(), branch: 'main', commit: '78177ed' },
  { name: 'STAGE', status: 'healthy', version: 'v1.9.0', build: 230, deployed_at: new Date(Date.now() - 604800000).toISOString(), branch: 'main', commit: 'f4a2c81' },
  { name: 'PROD', status: 'healthy', version: 'v1.0.0', build: 200, deployed_at: '2026-04-11T00:00:00Z', branch: 'main', commit: 'b8e3d92' },
];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };

  const method = event.httpMethod;
  const fullPath = event.path || '';
  const parts = fullPath.split('/').filter(Boolean);
  let route = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'github') { route = parts.slice(i + 1); break; }
  }
  const body = event.body ? JSON.parse(event.body) : {};
  const query = event.queryStringParameters || {};

  try {
    const owner = route[1] || '';
    const repo = route[2] || '';

    // GET /repos — list all org repos
    if (route[0] === 'repos' && route.length === 1) {
      const org = getOrg();
      let repos;
      try {
        repos = await paginateAll(`/orgs/${org}/repos`);
      } catch {
        repos = await paginateAll(`/users/${org}/repos`);
      }
      return respond(200, repos);
    }

    // GET /repos/:owner/:repo/branches
    if (route[0] === 'repos' && route[3] === 'branches' && route.length === 4) {
      const { data } = await ghFetch(`/repos/${owner}/${repo}/branches?per_page=100`);
      return respond(200, data);
    }

    // POST /repos/:owner/:repo/branches/create
    if (route[0] === 'repos' && route[3] === 'branches' && route[4] === 'create' && method === 'POST') {
      const newBranch = body.branchName || body.branch;
      const baseBranch = body.fromBranch || body.from || 'main';
      // Get base branch SHA
      const { data: refData } = await ghFetch(`/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`);
      const sha = refData?.object?.sha;
      if (!sha) return respond(404, { error: `Base branch "${baseBranch}" not found` });
      // Create new ref
      const { data } = await ghFetch(`/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha })
      });
      return respond(201, { success: true, branch: newBranch, sha });
    }

    // GET /repos/:owner/:repo/commits
    if (route[0] === 'repos' && route[3] === 'commits') {
      const params = new URLSearchParams({ per_page: '30' });
      if (query.branch) params.set('sha', query.branch);
      const { data } = await ghFetch(`/repos/${owner}/${repo}/commits?${params}`);
      return respond(200, data);
    }

    // GET /repos/:owner/:repo/compare
    if (route[0] === 'repos' && route[3] === 'compare') {
      const base = query.base || 'main';
      const head = query.head || 'develop';
      const { data } = await ghFetch(`/repos/${owner}/${repo}/compare/${base}...${head}`);
      return respond(200, data);
    }

    // GET /repos/:owner/:repo/runs
    if (route[0] === 'repos' && route[3] === 'runs' && route.length === 4) {
      const params = new URLSearchParams({ per_page: '30' });
      if (query.branch) params.set('branch', query.branch);
      if (query.status) params.set('status', query.status);
      const { data } = await ghFetch(`/repos/${owner}/${repo}/actions/runs?${params}`);
      return respond(200, data);
    }

    // GET/POST /repos/:owner/:repo/pulls
    if (route[0] === 'repos' && route[3] === 'pulls') {
      if (method === 'POST') {
        const { data } = await ghFetch(`/repos/${owner}/${repo}/pulls`, {
          method: 'POST',
          body: JSON.stringify(body)
        });
        return respond(201, data);
      }
      const params = new URLSearchParams({ per_page: '30', state: query.state || 'open' });
      const { data } = await ghFetch(`/repos/${owner}/${repo}/pulls?${params}`);
      return respond(200, data);
    }

    // POST /repos/:owner/:repo/merge
    if (route[0] === 'repos' && route[3] === 'merge' && method === 'POST') {
      const { data } = await ghFetch(`/repos/${owner}/${repo}/merges`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      return respond(200, data);
    }

    // GET /repos/:owner/:repo/tree
    if (route[0] === 'repos' && route[3] === 'tree') {
      const ref = query.ref || 'main';
      const { data } = await ghFetch(`/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`);
      return respond(200, data);
    }

    // GET /repos/:owner/:repo/blob
    if (route[0] === 'repos' && route[3] === 'blob') {
      const sha = query.sha;
      const { data } = await ghFetch(`/repos/${owner}/${repo}/git/blobs/${sha}`);
      if (data.encoding === 'base64' && data.content) {
        data.decoded_content = Buffer.from(data.content, 'base64').toString('utf-8');
      }
      return respond(200, data);
    }

    // GET /repos/:owner/:repo/readme
    if (route[0] === 'repos' && route[3] === 'readme') {
      const { data } = await ghFetch(`/repos/${owner}/${repo}/readme`);
      if (data.encoding === 'base64' && data.content) {
        data.decoded_content = Buffer.from(data.content, 'base64').toString('utf-8');
      }
      return respond(200, data);
    }

    // POST /repos/:owner/:repo/commit-multiple
    if (route[0] === 'repos' && route[3] === 'commit-multiple' && method === 'POST') {
      const { branch, message, files } = body;

      // Get the latest commit SHA on the branch
      const { data: refData } = await ghFetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`);
      const latestCommitSha = refData.object.sha;

      // Get the tree SHA of the latest commit
      const { data: commitData } = await ghFetch(`/repos/${owner}/${repo}/git/commits/${latestCommitSha}`);
      const baseTreeSha = commitData.tree.sha;

      // Create blobs for each file
      const treeItems = [];
      for (const file of files) {
        const { data: blobData } = await ghFetch(`/repos/${owner}/${repo}/git/blobs`, {
          method: 'POST',
          body: JSON.stringify({ content: file.content, encoding: 'utf-8' })
        });
        treeItems.push({
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha
        });
      }

      // Create a new tree
      const { data: treeData } = await ghFetch(`/repos/${owner}/${repo}/git/trees`, {
        method: 'POST',
        body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems })
      });

      // Create a new commit
      const { data: newCommit } = await ghFetch(`/repos/${owner}/${repo}/git/commits`, {
        method: 'POST',
        body: JSON.stringify({
          message,
          tree: treeData.sha,
          parents: [latestCommitSha]
        })
      });

      // Update the branch reference
      const { data: updatedRef } = await ghFetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: newCommit.sha })
      });

      return respond(200, { commit: newCommit, ref: updatedRef });
    }

    // GET /repos/:owner/:repo/runs/:runId/jobs
    if (route[0] === 'repos' && route[4] === 'jobs') {
      const runId = route[3];
      const { data } = await ghFetch(`/repos/${owner}/${repo}/actions/runs/${runId}/jobs`);
      return respond(200, data);
    }

    // GET /build-history
    if (route[0] === 'build-history') {
      try {
        const org = getOrg();
        let repos;
        try {
          repos = await paginateAll(`/orgs/${org}/repos`);
        } catch {
          repos = await paginateAll(`/users/${org}/repos`);
        }

        const results = [];
        for (const r of repos) {
          try {
            const { data: runs } = await ghFetch(`/repos/${r.full_name}/actions/runs?per_page=5`);
            if (runs.workflow_runs && runs.workflow_runs.length > 0) {
              for (const run of runs.workflow_runs) {
                let environment = 'unknown';
                const branch = (run.head_branch || '').toLowerCase();
                if (branch === 'main' || branch === 'master') environment = 'production';
                else if (branch === 'staging' || branch === 'stage') environment = 'staging';
                else if (branch === 'develop' || branch === 'dev') environment = 'development';

                results.push({
                  repo: r.name,
                  full_name: r.full_name,
                  run_id: run.id,
                  name: run.name,
                  status: run.status,
                  conclusion: run.conclusion,
                  branch: run.head_branch,
                  environment,
                  created_at: run.created_at,
                  updated_at: run.updated_at,
                  html_url: run.html_url
                });
              }
            }
          } catch {
            // Skip repos with no actions access
          }
        }

        results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return respond(200, { builds: results, total: results.length });
      } catch {
        return respond(200, { runs: generateMockBuilds(), summary: { total: 50, byEnvironment: { INT: 15, QA: 15, STAGE: 12, PROD: 8 }, byStatus: { success: 42, failure: 6, cancelled: 2 } }, mock: true });
      }
    }

    // GET /environments
    if (route[0] === 'environments') {
      return respond(200, { environments: MOCK_ENVS });
    }

    return respond(404, { error: 'Route not found', route });
  } catch (err) {
    return respond(500, { error: err.message });
  }
};
