import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, CheckCircle2, Shield } from 'lucide-react';

const STORAGE_KEY = 'forgeops_settings';

const defaultSettings = {
  jiraUrl: '',
  jiraProject: '',
  githubOrg: '',
  githubToken: '',
  teamsWebhook: '',
  aiModel: 'gpt-4',
  scaBlockCritical: true,
  scaBlockHigh: false,
  scaBlockMedium: false,
  scaLicenseCheck: true,
};

export default function Settings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      setSettings({ ...defaultSettings, ...s });
    } catch {
      setSettings(defaultSettings);
    }
  }, []);

  const update = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Field = ({ label, field, type = 'text', placeholder }) => (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <input
        type={type}
        className="w-full px-3 py-2 rounded-lg text-sm border-none outline-none"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        value={settings[field] || ''}
        onChange={(e) => update(field, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );

  const Toggle = ({ label, field, desc }) => (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{label}</div>
        {desc && <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{desc}</div>}
      </div>
      <button
        onClick={() => update(field, !settings[field])}
        className="w-10 h-5 rounded-full relative cursor-pointer border-none transition-colors"
        style={{ background: settings[field] ? 'var(--accent)' : 'var(--border)' }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
          style={{ left: settings[field] ? 20 : 2 }}
        />
      </button>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <button
          onClick={save}
          className="px-5 py-2 rounded-lg text-sm font-medium border-none cursor-pointer flex items-center gap-2"
          style={{ background: saved ? 'var(--success)' : 'var(--accent)', color: 'white' }}
        >
          {saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
          {saved ? 'Saved' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Integrations */}
        <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="px-4 py-3 text-sm font-semibold flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <SettingsIcon size={14} style={{ color: 'var(--accent)' }} /> Integrations
          </div>
          <div className="p-4 space-y-4">
            <Field label="Jira URL" field="jiraUrl" placeholder="https://your-org.atlassian.net" />
            <Field label="Jira Project Key" field="jiraProject" placeholder="PROJ" />
            <Field label="GitHub Organization" field="githubOrg" placeholder="your-org" />
            <Field label="GitHub Token" field="githubToken" type="password" placeholder="ghp_..." />
            <Field label="Teams Webhook URL" field="teamsWebhook" placeholder="https://outlook.office.com/webhook/..." />
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>AI Model</label>
              <select
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                value={settings.aiModel}
                onChange={(e) => update('aiModel', e.target.value)}
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3">Claude 3</option>
              </select>
            </div>
          </div>
        </div>

        {/* SCA Policy */}
        <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="px-4 py-3 text-sm font-semibold flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <Shield size={14} style={{ color: 'var(--accent)' }} /> SCA Policy
          </div>
          <div className="p-4">
            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
              Configure which vulnerability severity levels should block merges.
            </p>
            <Toggle label="Block on Critical" field="scaBlockCritical" desc="Prevent merges with critical vulnerabilities" />
            <Toggle label="Block on High" field="scaBlockHigh" desc="Prevent merges with high severity issues" />
            <Toggle label="Block on Medium" field="scaBlockMedium" desc="Prevent merges with medium severity issues" />
            <div className="my-3" style={{ borderTop: '1px solid var(--border)' }} />
            <Toggle label="License Compliance" field="scaLicenseCheck" desc="Check for incompatible open source licenses" />
          </div>
        </div>
      </div>
    </div>
  );
}
