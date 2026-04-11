import { displayKey, typeIcon, statusColor, priorityColor } from '../api';

export default function TicketRow({ issue, selected, onClick }) {
  if (!issue) return null;
  const status = issue.fields?.status?.name || '';
  const priority = issue.fields?.priority?.name || '';

  return (
    <div
      className={`ticket-row${selected ? ' selected' : ''}`}
      onClick={() => onClick?.(issue)}
    >
      <span className="ticket-type">{typeIcon(issue)}</span>
      <span className="ticket-key">{displayKey(issue)}</span>
      <span className="ticket-summary">{issue.fields?.summary || ''}</span>
      <span
        className="priority-dot"
        style={{ background: priorityColor(priority) }}
        title={priority}
      />
      <span
        className="badge status-badge"
        style={{
          background: `${statusColor(status)}22`,
          color: statusColor(status),
        }}
      >
        {status}
      </span>
    </div>
  );
}
