const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

function getAuth() {
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_TOKEN;
  return 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');
}

function getBaseUrl() {
  return process.env.JIRA_URL;
}

function getProject() {
  return process.env.JIRA_PROJECT || 'SCRUM';
}

// GET /api/jira/myself
router.get('/myself', async (req, res) => {
  try {
    const response = await fetch(`${getBaseUrl()}/rest/api/2/myself`, {
      headers: {
        'Authorization': getAuth(),
        'Accept': 'application/json',
      },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jira/search
router.post('/search', async (req, res) => {
  try {
    const { jql, maxResults, fields, nextPageToken } = req.body;
    const fieldArray = Array.isArray(fields) ? fields : (fields || 'summary,status').split(',').map(f => f.trim());
    const body = {
      jql: jql || 'project=' + getProject(),
      maxResults: parseInt(maxResults) || 100,
      fields: fieldArray,
    };
    if (nextPageToken) body.nextPageToken = nextPageToken;
    console.log('Jira search:', body.jql.substring(0, 80), 'max:', body.maxResults);
    const response = await fetch(`${getBaseUrl()}/rest/api/3/search/jql`, {
      method: 'POST',
      headers: {
        'Authorization': getAuth(),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Jira search error:', response.status, JSON.stringify(data).substring(0, 200));
    }
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jira/search-all
router.get('/search-all', async (req, res) => {
  try {
    const { jql, fields } = req.query;
    const allIssues = [];
    const fieldArray = fields ? fields.split(',').map(f => f.trim()) : ['summary', 'status', 'priority', 'issuetype', 'fixVersions', 'assignee'];
    let nextPageToken = null;

    do {
      const body = { jql, maxResults: 100, fields: fieldArray };
      if (nextPageToken) body.nextPageToken = nextPageToken;

      const response = await fetch(`${getBaseUrl()}/rest/api/3/search/jql`, {
        method: 'POST',
        headers: {
          'Authorization': getAuth(),
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      allIssues.push(...(data.issues || []));
      nextPageToken = data.nextPageToken || null;
    } while (nextPageToken);

    res.json({ issues: allIssues, total: allIssues.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jira/issue/:key
router.get('/issue/:key', async (req, res) => {
  try {
    const response = await fetch(`${getBaseUrl()}/rest/api/2/issue/${req.params.key}`, {
      headers: {
        'Authorization': getAuth(),
        'Accept': 'application/json',
      },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jira/issue/:key/transitions
router.get('/issue/:key/transitions', async (req, res) => {
  try {
    const response = await fetch(`${getBaseUrl()}/rest/api/2/issue/${req.params.key}/transitions`, {
      headers: {
        'Authorization': getAuth(),
        'Accept': 'application/json',
      },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jira/issue/:key/transition
router.post('/issue/:key/transition', async (req, res) => {
  try {
    const { transitionId } = req.body;
    const response = await fetch(`${getBaseUrl()}/rest/api/2/issue/${req.params.key}/transitions`, {
      method: 'POST',
      headers: {
        'Authorization': getAuth(),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transition: { id: transitionId } }),
    });

    if (response.status === 204) {
      return res.json({ success: true });
    }
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jira/issue — create issue
router.post('/issue', async (req, res) => {
  try {
    const { project, summary, issuetype, priority, fixVersion, description, labels } = req.body;
    const fields = {
      project: { key: project || getProject() },
      summary,
      issuetype: { name: issuetype || 'Task' },
    };

    if (priority) fields.priority = { name: priority };
    if (fixVersion) fields.fixVersions = [{ name: fixVersion }];
    if (description) fields.description = description;
    if (labels) fields.labels = labels;

    const response = await fetch(`${getBaseUrl()}/rest/api/2/issue`, {
      method: 'POST',
      headers: {
        'Authorization': getAuth(),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/jira/issue/:key — update issue
router.put('/issue/:key', async (req, res) => {
  try {
    const response = await fetch(`${getBaseUrl()}/rest/api/2/issue/${req.params.key}`, {
      method: 'PUT',
      headers: {
        'Authorization': getAuth(),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (response.status === 204) {
      return res.json({ success: true });
    }
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jira/issue/:key/comment
router.get('/issue/:key/comment', async (req, res) => {
  try {
    const response = await fetch(`${getBaseUrl()}/rest/api/2/issue/${req.params.key}/comment`, {
      headers: {
        'Authorization': getAuth(),
        'Accept': 'application/json',
      },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jira/issue/:key/comment
router.post('/issue/:key/comment', async (req, res) => {
  try {
    const { body: commentBody } = req.body;
    const response = await fetch(`${getBaseUrl()}/rest/api/2/issue/${req.params.key}/comment`, {
      method: 'POST',
      headers: {
        'Authorization': getAuth(),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: commentBody }),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jira/versions
router.get('/versions', async (req, res) => {
  try {
    const project = req.query.project || getProject();
    const response = await fetch(`${getBaseUrl()}/rest/api/2/project/${project}/versions`, {
      headers: {
        'Authorization': getAuth(),
        'Accept': 'application/json',
      },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
