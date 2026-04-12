const express = require('express');
const router = express.Router();

function generateMockLogs(query, count) {
  const severities = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
  const hosts = ['runner-01', 'runner-02', 'runner-03', 'build-agent-01', 'build-agent-02'];
  const sources = ['forgeops-pipeline', 'github-actions', 'deploy-service', 'test-runner', 'artifact-manager'];
  const messageTemplates = [
    'Pipeline started for {query}',
    'Building artifact for {query}',
    'Running unit tests for {query}',
    'Deploying {query} to staging',
    'Health check passed for {query}',
    'Container image pushed for {query}',
    'Code analysis completed for {query}',
    'Integration tests passed for {query}',
    'Rollback triggered for {query}',
    'Scaling service {query} to 3 replicas',
    'Cache invalidated for {query}',
    'Security scan completed for {query}',
    'Dependency check passed for {query}',
    'Notification sent for {query}',
    'Metrics collected for {query}',
    'Log rotation completed for {query}',
    'Backup snapshot created for {query}',
    'SSL certificate verified for {query}',
    'DNS resolution completed for {query}',
    'Load balancer updated for {query}',
  ];

  const numEntries = Math.min(count || 15, 50);
  const now = Date.now();
  const results = [];

  for (let i = 0; i < numEntries; i++) {
    const timestamp = new Date(now - i * 30000).toISOString();
    const template = messageTemplates[i % messageTemplates.length];
    const message = template.replace('{query}', query || 'unknown-service');
    results.push({
      timestamp,
      source: sources[i % sources.length],
      host: hosts[i % hosts.length],
      message,
      severity: severities[Math.floor(Math.random() * severities.length)],
    });
  }

  return results;
}

// GET /api/splunk/search — query params: query, count
router.get('/search', async (req, res) => {
  try {
    const { query, count } = req.query;
    const results = generateMockLogs(query, parseInt(count, 10) || 15);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/splunk/logs/:runId — mock logs for a specific run
router.get('/logs/:runId', async (req, res) => {
  try {
    const { runId } = req.params;
    const results = generateMockLogs(`run-${runId}`, 20);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
