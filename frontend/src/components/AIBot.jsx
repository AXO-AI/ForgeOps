import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { chatWithBot, createTicket } from '../api';

const STORAGE_KEY = 'fg_bot_history';
const MAX_HISTORY = 50;

const INITIAL_MSG = {
  role: 'bot',
  text: `Hi! I'm ForgeBot, your AI assistant. I can help you with:\n\n- **Getting started** with ForgeOps\n- **Troubleshooting** pipeline issues\n- **Training** on DevSecOps concepts\n- **Creating support tickets**\n\nWhat can I help you with?`,
  time: new Date().toISOString(),
};

const ONBOARDING_STEPS = [
  "Welcome! Let's get you set up. First, have you connected your GitHub account? Go to **Settings** to configure.",
  "Next, set up your Jira integration in **Settings** -- you'll need your Jira URL, email, and API token.",
  "Now try the **Pipelines** page -- run a Discovery Scan to find which repos have CI/CD.",
  "Ready to merge code? Go to **Merge** -- select a repo, branches, and ForgeOps will run SCA + AI review.",
  "Need help anytime? Just click this chat icon. You can also create a support ticket from here.",
];

const CONTEXT_HINTS = {
  '/pull-requests': "I see you're on the Merge page. Having trouble with a merge?",
  '/pipelines': "You're viewing Pipelines. Need help with repo discovery?",
  '/security': "You're on the Security page. Questions about scan findings?",
  '/deploy': "You're on CI/CD. Need help with deployments?",
  '/alm-jira': "You're on the ALM/Jira page. Need help with ticket management?",
  '/meetings': "You're on Meetings. Want to analyze a transcript?",
  '/support': "You're on the Support page. I can also help create tickets from here!",
};

const CATEGORY_MAP = {
  Pipeline: 'Pipeline Issue',
  Security: 'Security Scan',
  Jira: 'Jira Integration',
  Merge: 'Merge Conflict',
  Access: 'Access Request',
  Deployment: 'Deployment Failure',
  Bug: 'Bug Report',
  Feature: 'Feature Request',
  General: 'General Question',
};

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- /gm, '&bull; ')
    .replace(/^(\d+)\. /gm, '$1. ')
    .replace(/\n/g, '<br/>');
  return html;
}

export default function AIBot() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return stored && stored.length > 0 ? stored : [INITIAL_MSG];
    } catch { return [INITIAL_MSG]; }
  });
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [onboarding, setOnboarding] = useState(null); // step index or null
  const [ticketFlow, setTicketFlow] = useState(null); // { stage, category, priority, description }
  const [firstVisit] = useState(() => !localStorage.getItem(STORAGE_KEY));
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Persist messages
  useEffect(() => {
    const trimmed = messages.slice(-MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const addMsg = (role, text) => {
    setMessages(prev => [...prev, { role, text, time: new Date().toISOString() }]);
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    addMsg('user', text);
    setInput('');

    // Check for onboarding trigger
    if (/onboarding|get started|getting started/i.test(text) && onboarding === null) {
      setOnboarding(0);
      setTimeout(() => addMsg('bot', ONBOARDING_STEPS[0]), 300);
      return;
    }

    // Check for ticket creation trigger
    if (/create.*ticket|new.*ticket|submit.*ticket/i.test(text) && !ticketFlow) {
      setTicketFlow({ stage: 'category' });
      setTimeout(() => addMsg('bot', "I'll help you create a support ticket. What category best describes your issue?"), 300);
      return;
    }

    // Normal AI chat
    setThinking(true);
    try {
      const ctx = { page: location.pathname, previousMessages: messages.slice(-6).map(m => ({ role: m.role, text: m.text })) };
      const res = await chatWithBot(text, ctx);
      addMsg('bot', res.response || 'Sorry, I could not process that request.');
    } catch {
      addMsg('bot', 'Sorry, I encountered an error. Please try again or create a support ticket for assistance.');
    }
    setThinking(false);
  };

  const handleOnboardingNext = () => {
    const next = (onboarding || 0) + 1;
    if (next >= ONBOARDING_STEPS.length) {
      setOnboarding(null);
      addMsg('bot', "You're all set! Feel free to ask me anything anytime.");
    } else {
      setOnboarding(next);
      addMsg('bot', ONBOARDING_STEPS[next]);
    }
  };

  const handleOnboardingSkip = () => {
    setOnboarding(null);
    addMsg('bot', "No problem! Feel free to ask me anything whenever you need help.");
  };

  const handleTicketCategory = (cat) => {
    addMsg('user', cat);
    setTicketFlow(prev => ({ ...prev, category: CATEGORY_MAP[cat] || cat, stage: 'priority' }));
    setTimeout(() => addMsg('bot', "What's the priority?"), 300);
  };

  const handleTicketPriority = (pri) => {
    addMsg('user', pri);
    setTicketFlow(prev => ({ ...prev, priority: pri, stage: 'description' }));
    setTimeout(() => addMsg('bot', 'Describe the issue:'), 300);
  };

  const handleTicketDescription = async (desc) => {
    addMsg('user', desc);
    setInput('');
    addMsg('bot', 'Got it. Creating ticket...');
    setThinking(true);
    try {
      const ticket = await createTicket({
        userName: 'ForgeBot User',
        employeeId: '',
        email: localStorage.getItem('fg_user_email') || '',
        category: ticketFlow.category,
        priority: ticketFlow.priority,
        subject: desc.substring(0, 80),
        description: desc,
      });
      setThinking(false);
      addMsg('bot', `Ticket **${ticket.id}** created! You can track it in the Support page.`);
    } catch {
      setThinking(false);
      addMsg('bot', 'Sorry, there was an error creating the ticket. Please try the Support page directly.');
    }
    setTicketFlow(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (ticketFlow?.stage === 'description') {
        handleTicketDescription(input);
      } else {
        sendMessage(input);
      }
    }
  };

  const clearChat = () => {
    setMessages([INITIAL_MSG]);
    setOnboarding(null);
    setTicketFlow(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const quickAction = (text) => {
    if (text === 'Create support ticket') {
      setTicketFlow({ stage: 'category' });
      addMsg('user', text);
      setTimeout(() => addMsg('bot', "I'll help you create a support ticket. What category best describes your issue?"), 300);
    } else if (text === 'Onboarding guide') {
      setOnboarding(0);
      addMsg('user', text);
      setTimeout(() => addMsg('bot', ONBOARDING_STEPS[0]), 300);
    } else {
      sendMessage(text);
    }
  };

  // Context-aware greeting on first open per page
  const [shownHints, setShownHints] = useState(new Set());
  useEffect(() => {
    if (open && CONTEXT_HINTS[location.pathname] && !shownHints.has(location.pathname)) {
      setShownHints(prev => new Set(prev).add(location.pathname));
      setTimeout(() => addMsg('bot', CONTEXT_HINTS[location.pathname]), 500);
    }
  }, [open, location.pathname]);

  return (
    <>
      <button className="bot-trigger" onClick={() => setOpen(!open)} title="ForgeBot AI Assistant">
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        )}
        {firstVisit && !open && (
          <span style={{ position:'absolute', top:-4, right:-4, background:'var(--error)', color:'#fff', width:20, height:20, borderRadius:'50%', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>?</span>
        )}
      </button>

      {open && (
        <div className="bot-panel">
          <div className="bot-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            <span className="bot-title">ForgeBot -- AI Assistant</span>
            <button onClick={clearChat} title="Clear chat" style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:12, fontWeight:600 }}>Clear</button>
            <button onClick={() => setOpen(false)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:18, lineHeight:1 }}>x</button>
          </div>

          <div className="bot-messages">
            {messages.map((m, i) => (
              <div key={i} className={`bot-msg ${m.role}`}>
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
                <div className="msg-time">{formatTime(m.time)}</div>
              </div>
            ))}

            {/* Onboarding buttons */}
            {onboarding !== null && (
              <div style={{ display:'flex', gap:6, marginTop:4 }}>
                <button className="btn btn-sm btn-primary" onClick={handleOnboardingNext}>
                  {onboarding >= ONBOARDING_STEPS.length - 1 ? 'Done' : 'Next'}
                </button>
                <button className="btn btn-sm" onClick={handleOnboardingSkip}>Skip</button>
              </div>
            )}

            {/* Ticket flow: category selection */}
            {ticketFlow?.stage === 'category' && (
              <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:4 }}>
                {Object.keys(CATEGORY_MAP).map(c => (
                  <button key={c} className="btn btn-sm" onClick={() => handleTicketCategory(c)}>{c}</button>
                ))}
              </div>
            )}

            {/* Ticket flow: priority selection */}
            {ticketFlow?.stage === 'priority' && (
              <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:4 }}>
                {['Critical','High','Medium','Low'].map(p => (
                  <button key={p} className="btn btn-sm" onClick={() => handleTicketPriority(p)}>{p}</button>
                ))}
              </div>
            )}

            {thinking && (
              <div className="bot-typing">
                <span /><span /><span />
                <span style={{ fontSize:11, color:'var(--text-dim)', marginLeft:4 }}>ForgeBot is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="bot-quick">
            {['Create support ticket','How to merge','What is SCA?','Onboarding guide'].map(q => (
              <button key={q} onClick={() => quickAction(q)}>{q}</button>
            ))}
          </div>

          <div className="bot-input">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask anything about ForgeOps..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="btn btn-sm btn-primary" onClick={() => {
              if (ticketFlow?.stage === 'description') handleTicketDescription(input);
              else sendMessage(input);
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
