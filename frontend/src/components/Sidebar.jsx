import { NavLink } from 'react-router-dom';

const sections = [
  {
    label: 'DELIVERY',
    items: [
      { to: '/',             icon: '\u{1F4CA}', label: 'Overview' },
      { to: '/pipelines',    icon: '\u{1F504}', label: 'Pipelines' },
      { to: '/pull-requests',icon: '\u{1F500}', label: 'Pull Requests' },
      { to: '/deploy',       icon: '\u{1F680}', label: 'Deploy' },
      { to: '/environments', icon: '\u{1F30D}', label: 'Environments' },
    ],
  },
  {
    label: 'QUALITY',
    items: [
      { to: '/security', icon: '\u{1F6E1}\uFE0F', label: 'Security' },
      { to: '/alm-jira',  icon: '\u{1F4CB}', label: 'ALM / Jira' },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { to: '/meetings', icon: '\u{1F399}\uFE0F', label: 'Meetings' },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { to: '/notifications', icon: '\u{1F514}', label: 'Notifications' },
      { to: '/team',          icon: '\u{1F465}', label: 'Team' },
      { to: '/settings',      icon: '\u2699\uFE0F', label: 'Settings' },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">F</span>
        ForgeOps
      </div>

      {sections.map((section) => (
        <div key={section.label}>
          <div className="sidebar-section">{section.label}</div>
          <ul className="sidebar-nav">
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => isActive ? 'active' : ''}
                  end={item.to === '/'}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}
