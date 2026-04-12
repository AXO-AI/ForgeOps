import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

const capabilities = [
  {
    icon: '\u{1F504}',
    title: 'CI/CD Pipeline Management',
    bullets: [
      'Reusable workflow templates for 6 tech stacks',
      'SCA security scan mandatory before every merge',
      'Branch comparison with inline diff viewer',
    ],
    screen: { title: 'Command Center Dashboard', desc: 'Real-time overview of pipelines, deployments, security posture, and team velocity across all repositories.' },
  },
  {
    icon: '\u{1F4CB}',
    title: 'Jira ALM Integration',
    bullets: [
      'Cascading dropdown: Release \u2192 Type \u2192 Status \u2192 Tickets',
      'Inline status transitions without leaving ForgeOps',
      'Auto-transition tickets on merge/deploy events',
    ],
    screen: { title: 'Jira ALM Board', desc: 'Cascading release-driven ticket management with inline status transitions and sprint tracking.' },
  },
  {
    icon: '\u{1F9E0}',
    title: 'AI-Powered Intelligence',
    bullets: [
      'Meeting transcript \u2192 Jira ticket extraction',
      'AI code review on every merge request',
      'Auto-generated PR descriptions and changelogs',
    ],
    screen: { title: 'AI Code Review', desc: 'Claude analyzes every diff for bugs, security issues, and code quality before merge is allowed.' },
  },
  {
    icon: '\u{1F6E1}\uFE0F',
    title: 'Security & Compliance',
    bullets: [
      'Black Duck SCA + OWASP Dependency Check',
      'Gitleaks secret detection on every commit',
      'Merge blocked on Critical/High findings',
    ],
    screen: { title: 'SCA Scan Results', desc: 'Mandatory security gate with Black Duck, OWASP DC, Gitleaks, and license compliance on every merge.' },
  },
  {
    icon: '\u{1F4E6}',
    title: 'Repository Discovery',
    bullets: [
      'Auto-discover DevSecOps activity across 2500+ repos',
      '4-pattern ForgeOps detection',
      'One-click CI template onboarding for new repos',
    ],
    screen: { title: 'Pipeline Discovery', desc: 'Smart deep scan classifies repos by ForgeOps patterns — active, configured, candidates, or inactive.' },
  },
  {
    icon: '\u{1F500}',
    title: 'Merge',
    bullets: [
      'Full branch diff viewer with line-by-line changes',
      'AI + SCA mandatory scan before merge',
      'Auto Jira transition and comment on merge',
    ],
    screen: { title: 'Merge', desc: 'Compare branches, review diffs, run security scans, and merge — all with a live activity log.' },
  },
];

const roadmapBuilt = [
  { name: 'AI Meeting Transcript Analysis', desc: 'Upload transcript, Claude extracts stories and defects' },
  { name: 'AI Code Review on Merge', desc: 'Every diff reviewed for bugs and security before merge' },
  { name: 'AI PR Description Generator', desc: 'Auto-generates PR title and body from diff and commits' },
  { name: 'AI Root Cause Analysis', desc: 'Analyzes pipeline failure logs and suggests fixes' },
];

const roadmapSoon = [
  { name: 'AI Sprint Planning Assistant', desc: 'Suggests sprint plan based on backlog and velocity' },
  { name: 'AI Security Findings Triage', desc: 'Distinguishes real vulnerabilities from false positives' },
  { name: 'AI Deployment Risk Scorer', desc: 'Rates deployment risk based on diff analysis' },
  { name: 'AI Changelog Generator', desc: 'Auto-generates release notes from Jira tickets' },
  { name: 'AI Test Generator', desc: 'Generates unit tests from code diffs' },
];

const roadmapFuture = [
  { name: 'Predictive Pipeline Failures', desc: 'ML model predicts which commits will fail' },
  { name: 'Auto-Remediation Engine', desc: 'Automatically fixes common failure patterns' },
  { name: 'AI Pair Programming', desc: 'Context-aware coding assistant inside ForgeOps' },
  { name: 'Anomaly Detection & Auto-Rollback', desc: 'Detects anomalies post-deploy and rolls back' },
  { name: 'Natural Language Query', desc: 'Ask questions in plain English, get answers from data' },
];

function ScreenCarousel({ screens }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % screens.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [screens.length]);

  const s = screens[current];
  const gradients = [
    'linear-gradient(135deg, #1e1b4b, #312e81)',
    'linear-gradient(135deg, #0c4a6e, #0369a1)',
    'linear-gradient(135deg, #134e4a, #0f766e)',
    'linear-gradient(135deg, #4a1d96, #7c3aed)',
    'linear-gradient(135deg, #78350f, #d97706)',
    'linear-gradient(135deg, #1e3a5f, #3b82f6)',
  ];

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(99,102,241,0.2)',
        background: gradients[current % gradients.length],
        padding: '40px 32px', minHeight: 220,
        transition: 'all 0.6s ease', position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.4))', borderRadius: 16 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
            Product Preview {current + 1}/{screens.length}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 8 }}>{s.title}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, maxWidth: 500 }}>{s.desc}</div>
          <div style={{ display: 'flex', gap: 2, marginTop: 20 }}>
            {screens.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrent(i)}
                style={{
                  width: i === current ? 32 : 8, height: 4, borderRadius: 2,
                  background: i === current ? '#fff' : 'rgba(255,255,255,0.3)',
                  transition: 'all 0.3s', cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
        {/* Mock UI elements */}
        <div style={{ position: 'absolute', top: 20, right: 24, display: 'flex', gap: 6, zIndex: 1 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ width: 50 + i * 20, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 1 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ width: 120 + i * 10, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Landing({ onEnter }) {
  const screens = capabilities.map(c => c.screen);

  return (
    <div className="landing">
      {/* ── HERO ── */}
      <section className="landing-hero">
        <div className="hero-grid-bg" />
        <div className="hero-bolt">
          <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
            <path d="M20 4L8 24h9l-3 12L30 16h-9l3-12z" fill="white" fillOpacity="0.9" />
          </svg>
        </div>
        <h1>ForgeOps</h1>
        <p className="subtitle">Autonomous AI Engine for DevSecOps Pipelines</p>
        <p className="desc">
          The self-contained enterprise platform that unifies CI/CD, security scanning,
          Jira ALM, code review, and AI-powered automation &mdash; all without leaving a single interface.
        </p>
        <div className="hero-actions">
          <Link to="/overview" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: 15 }} onClick={onEnter}>
            Enter Command Center &rarr;
          </Link>
          <a
            href="#roadmap"
            className="btn"
            style={{ padding: '12px 28px', fontSize: 15, color: '#c7d2fe', borderColor: 'rgba(199,210,254,0.3)' }}
            onClick={e => { e.preventDefault(); document.getElementById('roadmap')?.scrollIntoView({ behavior: 'smooth' }); }}
          >
            View Roadmap &darr;
          </a>
        </div>
      </section>

      {/* ── PRODUCT SHOWCASE ── */}
      <section className="landing-section">
        <h2>What ForgeOps Does</h2>
        <p className="section-desc">Everything your DevSecOps team needs in a single pane of glass.</p>

        {/* Rotating carousel */}
        <div style={{ marginBottom: 40 }}>
          <ScreenCarousel screens={screens} />
        </div>

        {/* Capability cards */}
        <div className="landing-grid">
          {capabilities.map(c => (
            <div key={c.title} className="landing-card">
              <div className="card-icon">{c.icon}</div>
              <h3>{c.title}</h3>
              <ul>
                {c.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI VISION / ROADMAP ── */}
      <section className="landing-vision" id="roadmap">
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Vision: Autonomous AI Engine</h2>
          <p style={{ color: '#a5b4fc', fontSize: 14, marginBottom: 40, lineHeight: 1.7 }}>
            ForgeOps is evolving into a fully autonomous DevSecOps platform where AI handles code review,
            sprint planning, incident response, and deployment decisions &mdash; with human oversight.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 32 }}>
            <div>
              <h3 style={{ color: '#34d399', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                Built
              </h3>
              <div className="timeline">
                {roadmapBuilt.map(item => (
                  <div key={item.name} className="timeline-item done">
                    <h4 style={{ color: '#e2e8f0' }}>{'\u2705'} {item.name}</h4>
                    <p>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ color: '#fbbf24', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                Coming Soon &mdash; 2027
              </h3>
              <div className="timeline">
                {roadmapSoon.map(item => (
                  <div key={item.name} className="timeline-item soon">
                    <h4 style={{ color: '#e2e8f0' }}>{'\u{1F51C}'} {item.name}</h4>
                    <p>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ color: '#94a3b8', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                Future &mdash; 2028
              </h3>
              <div className="timeline">
                {roadmapFuture.map(item => (
                  <div key={item.name} className="timeline-item">
                    <h4 style={{ color: '#e2e8f0' }}>{'\u2B1C'} {item.name}</h4>
                    <p>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
          ForgeOps v7.0 &mdash; Autonomous AI Engine for DevSecOps
        </div>
        <div style={{ marginBottom: 12 }}>Built by the Platform Engineering team</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
          <Link to="/overview">Command Center</Link>
          <Link to="/pipelines">Pipelines</Link>
          <Link to="/alm-jira">ALM Board</Link>
          <Link to="/settings">Settings</Link>
        </div>
        <div>&copy; 2026 ForgeOps. All rights reserved.</div>
      </footer>
    </div>
  );
}
