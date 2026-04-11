import { useState } from 'react';

export default function Settings() {
  const [jiraUrl, setJiraUrl] = useState('');
  const [githubOrg, setGithubOrg] = useState('');
  const [teamsWebhook, setTeamsWebhook] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Platform configuration</p>
      </div>

      <div className="card mb-4">
        <div className="card-header">Integrations</div>

        <div className="form-group mb-4">
          <label>Jira Base URL</label>
          <input type="text" value={jiraUrl} onChange={(e) => setJiraUrl(e.target.value)} placeholder="https://your-org.atlassian.net" />
        </div>

        <div className="form-group mb-4">
          <label>GitHub Organization</label>
          <input type="text" value={githubOrg} onChange={(e) => setGithubOrg(e.target.value)} placeholder="your-org" />
        </div>

        <div className="form-group mb-4">
          <label>Teams Webhook URL</label>
          <input type="text" value={teamsWebhook} onChange={(e) => setTeamsWebhook(e.target.value)} placeholder="https://outlook.office.com/webhook/..." />
        </div>

        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      <div className="card">
        <div className="card-header">Backend</div>
        <div style={{ fontSize: 13 }}>
          <div className="mb-2">
            <span className="text-dim">API Endpoint: </span>
            <code style={{ color: 'var(--primary)' }}>http://localhost:3001/api</code>
          </div>
          <div className="mb-2">
            <span className="text-dim">Frontend: </span>
            <code style={{ color: 'var(--primary)' }}>http://localhost:5173</code>
          </div>
        </div>
      </div>
    </div>
  );
}
