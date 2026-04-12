import { useState } from 'react';
import ALMSelector from '../components/ALMSelector';
import TicketDetailPanel from '../components/TicketDetailPanel';

const ENVS = [
  { name: 'INT', label: 'Integration', color: 'var(--info)', preSelectedStatus: 'Ready for Unit Testing' },
  { name: 'QA', label: 'Quality Assurance', color: 'var(--warn)', preSelectedStatus: 'Ready for SIT' },
  { name: 'STAGE', label: 'Staging', color: 'var(--primary)', preSelectedStatus: 'Ready for UAT' },
  { name: 'PROD', label: 'Production', color: 'var(--ok)', preSelectedStatus: 'Deployed to Production' },
];

export default function Environments() {
  const [expanded, setExpanded] = useState({});
  const [detailTicket, setDetailTicket] = useState(null);

  return (
    <div>
      <div className="page-header">
        <h1>Environments</h1>
        <p>Track ticket progression across environments</p>
      </div>

      <div className="env-grid">
        {ENVS.map((env) => {
          const isExpanded = expanded[env.name];

          return (
            <div key={env.name} className="env-card">
              <div className="env-card-header">
                <div>
                  <div className="env-name" style={{ color: env.color }}>{env.name}</div>
                  <div className="text-dim text-sm">{env.label}</div>
                </div>
              </div>

              <div className="env-card-body">
                <button
                  className="btn btn-sm w-full mb-2"
                  onClick={() => setExpanded({ ...expanded, [env.name]: !isExpanded })}
                >
                  {isExpanded ? 'Hide' : 'Show'} Tickets
                </button>

                {isExpanded && (
                  <ALMSelector
                    compact={true}
                    preSelectedStatus={env.preSelectedStatus}
                    onTicketSelect={(issue) => setDetailTicket(issue)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {detailTicket && (
        <TicketDetailPanel
          issue={detailTicket}
          onClose={() => setDetailTicket(null)}
        />
      )}
    </div>
  );
}
