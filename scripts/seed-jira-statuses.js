const fetch = require('node-fetch');

const JIRA_URL = process.env.JIRA_URL || 'https://askboppana.atlassian.net';
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_TOKEN;
const PROJECT = process.env.JIRA_PROJECT || 'SCRUM';

const auth = Buffer.from(JIRA_EMAIL + ':' + JIRA_TOKEN).toString('base64');
const headers = { 'Authorization': 'Basic ' + auth, 'Content-Type': 'application/json', 'Accept': 'application/json' };

async function searchTickets(jql) {
  const res = await fetch(`${JIRA_URL}/rest/api/3/search/jql`, {
    method: 'POST', headers,
    body: JSON.stringify({ jql, maxResults: 100, fields: ['key', 'status', 'issuetype'] })
  });
  const data = await res.json();
  return data.issues || [];
}

async function getTransitions(key) {
  const res = await fetch(`${JIRA_URL}/rest/api/2/issue/${key}/transitions`, { headers });
  const data = await res.json();
  return data.transitions || [];
}

async function transitionTicket(key, transitionId) {
  await fetch(`${JIRA_URL}/rest/api/2/issue/${key}/transitions`, {
    method: 'POST', headers,
    body: JSON.stringify({ transition: { id: transitionId } })
  });
}

async function seed() {
  console.log('Seeding Jira ticket statuses...\n');

  const tickets = await searchTickets(`project = ${PROJECT} AND status = "To Do" ORDER BY key ASC`);
  if (!tickets.length) { console.log('No "To Do" tickets found.'); return; }

  console.log(`Found ${tickets.length} tickets in "To Do" status`);

  const transitions = await getTransitions(tickets[0].key);
  console.log('Available transitions:', transitions.map(t => `${t.name} (${t.id})`).join(', '));

  const inProgressT = transitions.find(t => t.name.toLowerCase().includes('progress'));
  const doneT = transitions.find(t => t.name.toLowerCase().includes('done'));

  if (!inProgressT) { console.log('No "In Progress" transition found'); return; }

  const total = tickets.length;
  const moveToProgress = Math.floor(total * 0.3);
  const moveToDone = Math.floor(total * 0.2);
  let moved = 0;

  for (let i = 0; i < tickets.length; i++) {
    let target = null;
    if (i < moveToProgress) target = inProgressT;
    else if (i < moveToProgress + moveToDone && doneT) target = doneT;

    if (target) {
      try {
        await transitionTicket(tickets[i].key, target.id);
        moved++;
        process.stdout.write(`  ${tickets[i].key} → ${target.name}\n`);
      } catch (e) { console.log(`  ${tickets[i].key} failed`); }
      await new Promise(r => setTimeout(r, 200));
    }
  }
  console.log(`\nDone! Moved ${moved} tickets.`);
}

seed().catch(console.error);
