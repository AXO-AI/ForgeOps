import { useState } from 'react';
import TicketRow from './TicketRow';

export default function ReleaseGroup({ release, stories, defects, selectedKey, onSelect }) {
  const [open, setOpen] = useState(true);
  const total = (stories?.length || 0) + (defects?.length || 0);

  return (
    <div className="release-group">
      <div className="release-group-header" onClick={() => setOpen(!open)}>
        <span className="toggle">{open ? '\u25BC' : '\u25B6'}</span>
        <span className="release-name">{release}</span>
        <span className="release-count">{total} ticket{total !== 1 ? 's' : ''}</span>
      </div>

      {open && (
        <>
          {stories && stories.length > 0 && (
            <>
              <div className="release-group-section-label">Stories</div>
              {stories.map((issue) => (
                <TicketRow
                  key={issue.key}
                  issue={issue}
                  selected={issue.key === selectedKey}
                  onClick={onSelect}
                />
              ))}
            </>
          )}
          {defects && defects.length > 0 && (
            <>
              <div className="release-group-section-label">Defects</div>
              {defects.map((issue) => (
                <TicketRow
                  key={issue.key}
                  issue={issue}
                  selected={issue.key === selectedKey}
                  onClick={onSelect}
                />
              ))}
            </>
          )}
          {total === 0 && (
            <div className="empty-state">No tickets in this release</div>
          )}
        </>
      )}
    </div>
  );
}
