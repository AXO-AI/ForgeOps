export default function Team() {
  const members = [
    { name: 'Ashwin Boppana', role: 'Lead Engineer', status: 'active' },
    { name: 'CI Bot', role: 'Automation', status: 'active' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Team</h1>
        <p>Team members and roles</p>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{m.name}</td>
                <td className="text-dim">{m.role}</td>
                <td><span className="badge badge-ok">{m.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
