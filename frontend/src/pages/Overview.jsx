import { useState, useEffect } from 'react';
import { FolderGit2, Ticket, Activity, Loader2 } from 'lucide-react';
import StatCard from '../components/StatCard';
import TicketRow from '../components/TicketRow';
import { api, displayKey } from '../api';

export default function Overview() {
  const [loading, setLoading] = useState(true);
  const [repoCount, setRepoCount] = useState(null);
  const [ticketCount, setTicketCount] = useState(null);
  const [pipelineHealth, setPipelineHealth] = useState(null);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [discovery, jira, builds] = await Promise.all([
          api.discovery.quick(),
          api.jira.search('status != Done ORDER BY updated DESC', 'summary,status,priority,issuetype,labels,assignee', 10),
          api.github.buildHistory(),
        ]);
        setRepoCount(discovery?.repos?.length ?? discovery?.repoCount ?? 0);
        setTicketCount(jira?.total ?? jira?.issues?.length ?? 0);
        setTickets(jira?.issues || []);

        if (builds && Array.isArray(builds)) {
          const recent = builds.slice(0, 20);
          const passed = recent.filter((b) => b?.conclusion === 'success').length;
          setPipelineHealth(recent.length > 0 ? Math.round((passed / recent.length) * 100) : 0);
        } else {
          setPipelineHealth(builds?.healthPercent ?? 0);
        }
      } catch {
        // fail silently
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Overview</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard value={repoCount} label="ForgeOps Repos" icon={FolderGit2} color="var(--accent)" />
        <StatCard value={ticketCount} label="Open Tickets" icon={Ticket} color="var(--info)" />
        <StatCard value={pipelineHealth != null ? `${pipelineHealth}%` : '--'} label="Pipeline Health" icon={Activity} color="var(--success)" />
      </div>

      {/* Recent tickets */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="px-4 py-3 text-sm font-semibold" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          Recent Activity
        </div>
        {tickets.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
            No recent tickets found
          </div>
        ) : (
          tickets.map((t) => <TicketRow key={t.key} issue={t} />)
        )}
      </div>
    </div>
  );
}
