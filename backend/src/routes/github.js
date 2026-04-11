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

module.exports = router;
