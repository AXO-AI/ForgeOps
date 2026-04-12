import { useState, useEffect } from 'react';

const STORAGE_KEY = 'fg_team_members';

function loadMembers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveMembers(members) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
}

const ROLES = ['Admin', 'Tech Lead', 'Release Engineer', 'Developer', 'QA'];

const PERMISSIONS = [
  { action: 'Create/merge PRs', Admin: true, 'Tech Lead': true, 'Release Engineer': true, Developer: true, QA: false },
  { action: 'Trigger pipelines', Admin: true, 'Tech Lead': true, 'Release Engineer': true, Developer: true, QA: true },
  { action: 'Deploy to DEV/SIT', Admin: true, 'Tech Lead': true, 'Release Engineer': true, Developer: false, QA: false },
  { action: 'Deploy to UAT/PROD', Admin: true, 'Tech Lead': false, 'Release Engineer': true, Developer: false, QA: false },
  { action: 'Manage Jira tickets', Admin: true, 'Tech Lead': true, 'Release Engineer': true, Developer: true, QA: true },
  { action: 'Run security scans', Admin: true, 'Tech Lead': true, 'Release Engineer': true, Developer: false, QA: false },
  { action: 'View audit logs', Admin: true, 'Tech Lead': true, 'Release Engineer': false, Developer: false, QA: false },
  { action: 'Manage team members', Admin: true, 'Tech Lead': false, 'Release Engineer': false, Developer: false, QA: false },
  { action: 'Modify settings', Admin: true, 'Tech Lead': true, 'Release Engineer': false, Developer: false, QA: false },
];

function roleClass(role) {
  if (role === 'Admin') return 'role-admin';
  if (role === 'Tech Lead') return 'role-lead';
  if (role === 'Release Engineer') return 'role-release';
  if (role === 'Developer') return 'role-developer';
  if (role === 'QA') return 'role-qa';
  return 'badge-dim';
}

export default function Team() {
  const [members, setMembers] = useState([]);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Developer');
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState('members');

  useEffect(() => {
    setMembers(loadMembers());
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleInvite = () => {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    const newMember = {
      id: Date.now(),
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      status: 'Active',
      lastActive: new Date().toISOString(),
    };
    const updated = [...members, newMember];
    setMembers(updated);
    saveMembers(updated);
    setInviteName('');
    setInviteEmail('');
    setInviteRole('Developer');
    showToast(`Invitation sent to ${inviteEmail}`);
  };

  const handleDeactivate = (id) => {
    const updated = members.map(m =>
      m.id === id ? { ...m, status: m.status === 'Active' ? 'Inactive' : 'Active' } : m
    );
    setMembers(updated);
    saveMembers(updated);
  };

  const handleSaveRole = (id) => {
    const updated = members.map(m => m.id === id ? { ...m, role: editRole } : m);
    setMembers(updated);
    saveMembers(updated);
    setEditingId(null);
    showToast('Role updated successfully');
  };

  const formatLastActive = (t) => {
    if (!t) return '';
    try {
      const d = new Date(t);
      if (isNaN(d.getTime())) return t;
      const now = Date.now();
      const diff = now - d.getTime();
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
      return `${Math.floor(diff / 86400000)} days ago`;
    } catch { return t; }
  };

  return (
    <div>
      {toast && <div className="toast toast-success">{toast}</div>}

      <div className="page-header">
        <h1>Team Management</h1>
        <p>Manage team members, roles, and permissions</p>
      </div>

      {/* Invite Form */}
      <div className="card mb-4">
        <div className="card-header">Invite Member</div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>Full Name</label>
            <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="John Doe" />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Email</label>
            <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="john.doe@company.com" />
          </div>
          <div className="form-group" style={{ minWidth: 160 }}>
            <label>Role</label>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button className="btn btn-primary" onClick={handleInvite} disabled={!inviteName.trim() || !inviteEmail.trim()}>
              Send Invite
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>
          Members ({members.length})
        </button>
        <button className={`tab-btn ${tab === 'permissions' ? 'active' : ''}`} onClick={() => setTab('permissions')}>
          Role Permissions
        </button>
      </div>

      {tab === 'members' && (
        <div className="card">
          {members.length === 0 ? (
            <div className="empty-state-box">
              <div className="empty-icon">&#x1F465;</div>
              <div className="empty-title">No team members added yet</div>
              <div className="empty-desc">Invite your first team member using the form above.</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 8,
                          background: 'var(--primary-bg)', color: 'var(--primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700,
                        }}>
                          {m.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        {m.name}
                      </div>
                    </td>
                    <td className="text-dim text-sm">{m.email}</td>
                    <td>
                      {editingId === m.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={{ width: 140, padding: '4px 8px', fontSize: 12 }}>
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button className="btn btn-sm btn-primary" onClick={() => handleSaveRole(m.id)}>Save</button>
                          <button className="btn btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      ) : (
                        <span className={`badge ${roleClass(m.role)}`}>{m.role}</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${m.status === 'Active' ? 'badge-ok' : 'badge-dim'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="text-dim text-sm">{formatLastActive(m.lastActive)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-sm"
                          onClick={() => { setEditingId(m.id); setEditRole(m.role); }}
                          disabled={editingId === m.id}
                        >
                          Edit Role
                        </button>
                        <button
                          className={`btn btn-sm ${m.status === 'Active' ? 'btn-err' : 'btn-ok'}`}
                          onClick={() => handleDeactivate(m.id)}
                        >
                          {m.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'permissions' && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Permission</th>
                {ROLES.map(r => <th key={r} style={{ textAlign: 'center' }}>{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map(p => (
                <tr key={p.action}>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{p.action}</td>
                  {ROLES.map(r => (
                    <td key={r} style={{ textAlign: 'center' }}>
                      {p[r] ? (
                        <span style={{ color: 'var(--success)', fontSize: 16 }}>&#x2713;</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: 14, opacity: 0.4 }}>&mdash;</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
