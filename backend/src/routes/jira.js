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

// --- In-memory cache for release-counts ---
let releaseCountsCache = { data: null, timestamp: 0 };
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// GET /api/jira/release-counts
router.get('/release-counts', async (req, res) => {
  try {
    // Return cached data if still fresh
    if (releaseCountsCache.data && (Date.now() - releaseCountsCache.timestamp) < CACHE_TTL) {
      return res.json(releaseCountsCache.data);
    }

    const project = getProject();
    const jql = `project=${project} AND status!=Done`;
    const fields = ['issuetype', 'fixVersions', 'status', 'summary', 'labels'];
    const allIssues = [];
    let nextPageToken = null;

    do {
      const body = { jql, maxResults: 100, fields };
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

    // Group and count
    const releaseMap = {}; // name -> { stories, defects, tasks, total }
    const byType = {};
    const byStatus = {};

    for (const issue of allIssues) {
      const typeName = issue.fields?.issuetype?.name || 'Unknown';
      const summary = issue.fields?.summary || '';
      const labels = issue.fields?.labels || [];
      const isDefect = typeName === 'Bug' || summary.startsWith('[Defect]') || labels.includes('defect') || labels.includes('bug');
      const statusName = issue.fields?.status?.name || 'Unknown';
      const versions = issue.fields?.fixVersions || [];

      // Count by effective type
      const effectiveType = isDefect ? 'Defect' : typeName;
      byType[effectiveType] = (byType[effectiveType] || 0) + 1;

      // Count by status
      byStatus[statusName] = (byStatus[statusName] || 0) + 1;

      // Count by release
      if (versions.length === 0) {
        if (!releaseMap['Unassigned']) releaseMap['Unassigned'] = { stories: 0, defects: 0, tasks: 0, total: 0 };
        releaseMap['Unassigned'].total++;
        if (typeName === 'Story') releaseMap['Unassigned'].stories++;
        else if (isDefect) releaseMap['Unassigned'].defects++;
        else releaseMap['Unassigned'].tasks++;
      } else {
        for (const v of versions) {
          const vName = v.name || 'Unknown';
          if (!releaseMap[vName]) releaseMap[vName] = { stories: 0, defects: 0, tasks: 0, total: 0 };
          releaseMap[vName].total++;
          if (typeName === 'Story') releaseMap[vName].stories++;
          else if (isDefect) releaseMap[vName].defects++;
          else releaseMap[vName].tasks++;
        }
      }
    }

    const releases = Object.entries(releaseMap).map(([name, counts]) => ({ name, ...counts }));

    const result = {
      releases,
      totalOpen: allIssues.length,
      byType,
      byStatus,
    };

    // Cache the result
    releaseCountsCache = { data: result, timestamp: Date.now() };

    res.json(result);
  } catch (err) {
    console.error('Release counts error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jira/tickets
router.get('/tickets', async (req, res) => {
  try {
    const { release, type, status, search, maxResults } = req.query;
    const project = getProject();

    let jql = `project=${project} AND status!=Done`;

    if (release) {
      jql += ` AND fixVersion="${release}"`;
    }
    if (type === 'Story') jql += ' AND issuetype=Story';
    else if (type === 'Bug' || type === 'Defect') jql += ' AND (issuetype=Bug OR labels in (defect, bug))';
    else if (type === 'Task') jql += ' AND issuetype=Task AND labels not in (defect, bug)';
    else if (type === 'Epic') jql += ' AND issuetype=Epic';

    if (status && status !== 'all') {
      jql += ` AND status="${status}"`;
    }

    if (search) {
      jql += ` AND (summary~"${search}" OR description~"${search}")`;
    }

    jql += ' ORDER BY priority ASC, updated DESC';

    const fields = ['summary', 'status', 'priority', 'issuetype', 'fixVersions', 'assignee', 'updated'];

    const body = {
      jql,
      maxResults: parseInt(maxResults) || 100,
      fields,
    };

    console.log('Tickets query:', jql.substring(0, 120));

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
      console.error('Tickets error:', response.status, JSON.stringify(data).substring(0, 200));
    }

    res.status(response.status).json(data);
  } catch (err) {
    console.error('Tickets error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
