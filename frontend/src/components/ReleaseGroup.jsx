import { useState } from 'react';
import TicketRow from './TicketRow';

export default function ReleaseGroup({ release, stories, defects, defaultOpen, selectedKey, onSelect, onViewDetail, onRefresh }) {
  const [open, setOpen] = useState(defaultOpen !== undefined ? defaultOpen : false);
  const storyCount = stories?.length || 0;
  const defectCount = defects?.length || 0;
  const total = storyCount + defectCount;

  return (
    <div className="release-group">
      <div className="release-group-header" onClick={() => setOpen(!open)}>
        <span className="toggle">{open ? '\u25BC' : '\u25B6'}</span>
        <span style={{ fontSize: 14 }}>{'\u{1F4E6}'}</span>
        <span className="release-name">{release}</span>
        <span className="text-dim text-sm" style={{ marginLeft: 'auto' }}>
          {storyCount > 0 && <span style={{ marginRight: 8 }}>{'\u{1F4D7}'} {storyCount} stories</span>}
          {defectCount > 0 && <span style={{ color: 'var(--error)' }}>{'\u{1F41B}'} {defectCount} defects</span>}
          {total === 0 && <span>0 tickets</span>}
        </span>
      </div>

      {open && (
        <div className="release-group-body">
          {storyCount > 0 && (
            <>
              <div className="release-group-section-label">{'\u{1F4D7}'} Stories ({storyCount})</div>
              {stories.map((issue) => (
                <TicketRow
                  key={issue.key}
                  issue={issue}
                  selected={issue.key === selectedKey}
                  onClick={onSelect}
                  onViewDetail={onViewDetail}
                  onRefresh={onRefresh}
                />
              ))}
            </>
          )}
          {storyCount > 0 && defectCount > 0 && (
            <div style={{ borderTop: '1px dashed var(--border)', margin: '8px 0' }} />
          )}
          {defectCount > 0 && (
            <>
              <div className="release-group-section-label">{'\u{1F41B}'} Defects ({defectCount})</div>
              {defects.map((issue) => (
                <TicketRow
                  key={issue.key}
                  issue={issue}
                  selected={issue.key === selectedKey}
                  onClick={onSelect}
                  onViewDetail={onViewDetail}
                  onRefresh={onRefresh}
                />
              ))}
            </>
          )}
          {total === 0 && (
            <div className="empty-state">No tickets in this release</div>
          )}
        </div>
      )}
    </div>
  );
}
