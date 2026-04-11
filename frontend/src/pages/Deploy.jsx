import { useState } from 'react';

const ENVIRONMENTS = ['INT', 'QA', 'STAGE', 'PROD'];

export default function Deploy() {
  const [target, setTarget] = useState('INT');
  const [branch, setBranch] = useState('main');
  const [deploying, setDeploying] = useState(false);
  const [history, setHistory] = useState([
    { id: 1, env: 'INT', branch: 'main', status: 'success', time: '2 hours ago', user: 'CI Bot' },
    { id: 2, env: 'QA', branch: 'main', status: 'success', time: '1 day ago', user: 'CI Bot' },
    { id: 3, env: 'STAGE', branch: 'release/1.2', status: 'failed', time: '3 days ago', user: 'CI Bot' },
  ]);

  const handleDeploy = () => {
    setDeploying(true);
    setTimeout(() => {
      setHistory([
        { id: Date.now(), env: target, branch, status: 'success', time: 'just now', user: 'You' },
        ...history,
      ]);
      setDeploying(false);
    }, 2000);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Deploy</h1>
        <p>Deploy builds to environments</p>
      </div>

      <div className="card mb-4">
        <div className="card-header">New Deployment</div>
        <div className="form-row">
          <div className="form-group">
            <label>Target Environment</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              {ENVIRONMENTS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Branch / Tag</label>
            <input type="text" value={branch} onChange={(e) => setBranch(e.target.value)} />
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleDeploy} disabled={deploying}>
              {deploying ? 'Deploying...' : 'Deploy'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Deployment History</div>
        <table>
          <thead>
            <tr>
              <th>Environment</th>
              <th>Branch</th>
              <th>Status</th>
              <th>Time</th>
              <th>User</th>
            </tr>
          </thead>
          <tbody>
            {history.map((d) => (
              <tr key={d.id}>
                <td style={{ fontWeight: 600 }}>{d.env}</td>
                <td className="text-dim">{d.branch}</td>
                <td>
                  <span className={`badge ${d.status === 'success' ? 'badge-ok' : 'badge-err'}`}>
                    {d.status}
                  </span>
                </td>
                <td className="text-dim text-sm">{d.time}</td>
                <td className="text-dim">{d.user}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
