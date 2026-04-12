const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

/* ── helper: call Anthropic API ────────────────────────────────── */
async function callClaude(systemPrompt, userMessage, maxTokens = 4096) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw { status: response.status, body: data };

  const text = data.content && data.content[0] && data.content[0].text;
  return { text, usage: data.usage };
}

function parseJSON(text) {
  try {
    // Try to extract JSON from markdown code blocks first
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    return JSON.parse(match ? match[1].trim() : text);
  } catch {
    return null;
  }
}

// POST /api/ai/analyze-transcript
router.post('/analyze-transcript', async (req, res) => {
  try {
    const { transcript, meetingName, participants, model } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'transcript is required' });
    }

    const systemPrompt = `You are a meeting analyst. Analyze the following meeting transcript and provide:
1. **Summary**: A concise summary of the meeting
2. **Key Decisions**: List of decisions made
3. **Action Items**: List of action items with assignees (if mentioned)
4. **Topics Discussed**: Main topics covered
5. **Follow-ups**: Items that need follow-up

Format your response as JSON with keys: summary, keyDecisions, actionItems, topicsDiscussed, followUps.
Each action item should have: description, assignee (or "Unassigned"), priority (High/Medium/Low).`;

    const userMessage = [
      meetingName ? `Meeting: ${meetingName}` : '',
      participants ? `Participants: ${participants.join(', ')}` : '',
      `\nTranscript:\n${transcript}`,
    ].filter(Boolean).join('\n');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // Extract the text content from Anthropic response
    const textContent = data.content && data.content[0] && data.content[0].text;
    res.json({ result: textContent, usage: data.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/code-review
router.post('/code-review', async (req, res) => {
  try {
    const { diff, repo, branch } = req.body;
    if (!diff) return res.status(400).json({ error: 'diff is required' });

    const systemPrompt = `You are an expert code reviewer. Review the provided code diff for bugs, security issues, code smells, and best practices violations. Return your response as JSON with the following structure:
{
  "findings": [
    { "severity": "critical|high|medium|low", "line": <number or null>, "file": "<filename>", "message": "<description>", "suggestion": "<how to fix>" }
  ],
  "summary": "<brief overall assessment>",
  "riskLevel": "critical|high|medium|low|none"
}
If there are no issues, return an empty findings array with riskLevel "none".`;

    const userMessage = `Repository: ${repo || 'unknown'}\nBranch: ${branch || 'unknown'}\n\nDiff:\n${diff.substring(0, 30000)}`;

    const { text, usage } = await callClaude(systemPrompt, userMessage);
    const parsed = parseJSON(text);

    if (parsed) {
      res.json({ ...parsed, usage });
    } else {
      res.json({ findings: [], summary: text, riskLevel: 'unknown', usage });
    }
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/pr-description
router.post('/pr-description', async (req, res) => {
  try {
    const { diff, commits, ticketKey, ticketSummary } = req.body;
    if (!diff && (!commits || commits.length === 0)) {
      return res.status(400).json({ error: 'diff or commits required' });
    }

    const systemPrompt = `You are a technical writer generating pull request descriptions. Generate a clear, professional PR description. Return JSON with:
{
  "title": "<concise PR title, max 72 chars>",
  "body": "<markdown PR body with ## Summary, ## Changes, ## Impact sections>",
  "testSuggestions": ["<test case suggestion 1>", "<test case suggestion 2>"]
}`;

    const parts = [];
    if (ticketKey) parts.push(`Jira Ticket: ${ticketKey} - ${ticketSummary || ''}`);
    if (commits && commits.length > 0) parts.push(`Commits:\n${commits.join('\n')}`);
    if (diff) parts.push(`Diff:\n${diff.substring(0, 25000)}`);

    const { text, usage } = await callClaude(systemPrompt, parts.join('\n\n'));
    const parsed = parseJSON(text);

    if (parsed) {
      res.json({ ...parsed, usage });
    } else {
      res.json({ title: '', body: text, testSuggestions: [], usage });
    }
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/root-cause
router.post('/root-cause', async (req, res) => {
  try {
    const { logs, error, repo, branch } = req.body;
    if (!logs && !error) return res.status(400).json({ error: 'logs or error is required' });

    const systemPrompt = `You are a DevOps incident analyst. Analyze the pipeline failure logs and identify the root cause. Return JSON with:
{
  "rootCause": "<clear description of what caused the failure>",
  "suggestedFix": "<step-by-step instructions to fix>",
  "severity": "critical|high|medium|low",
  "confidence": "<high|medium|low>",
  "similarIssues": ["<description of similar known issue 1>"]
}`;

    const parts = [];
    if (repo) parts.push(`Repository: ${repo}`);
    if (branch) parts.push(`Branch: ${branch}`);
    if (error) parts.push(`Error: ${error}`);
    if (logs) parts.push(`Logs:\n${logs.substring(0, 30000)}`);

    const { text, usage } = await callClaude(systemPrompt, parts.join('\n'));
    const parsed = parseJSON(text);

    if (parsed) {
      res.json({ ...parsed, usage });
    } else {
      res.json({ rootCause: text, suggestedFix: '', severity: 'unknown', confidence: 'low', similarIssues: [], usage });
    }
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/changelog
router.post('/changelog', async (req, res) => {
  try {
    const { tickets, fromVersion, toVersion } = req.body;
    if (!tickets || tickets.length === 0) return res.status(400).json({ error: 'tickets array is required' });

    const systemPrompt = `You are a release manager generating release notes. Generate professional release notes from the provided Jira tickets. Group items by: Features, Bug Fixes, Breaking Changes. Return JSON with:
{
  "changelog": "<full markdown changelog>",
  "features": [{ "key": "<ticket key>", "summary": "<description>" }],
  "bugFixes": [{ "key": "<ticket key>", "summary": "<description>" }],
  "breakingChanges": [{ "key": "<ticket key>", "summary": "<description>" }]
}`;

    const ticketList = tickets.map(t => `- ${t.key} (${t.type || 'Task'}): ${t.summary}`).join('\n');
    const userMessage = `Release: ${fromVersion || '?'} -> ${toVersion || '?'}\n\nTickets:\n${ticketList}`;

    const { text, usage } = await callClaude(systemPrompt, userMessage);
    const parsed = parseJSON(text);

    if (parsed) {
      res.json({ ...parsed, usage });
    } else {
      res.json({ changelog: text, features: [], bugFixes: [], breakingChanges: [], usage });
    }
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/chat — AI Knowledge Bot
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const systemPrompt = `You are ForgeBot, the AI assistant for ForgeOps — an enterprise DevSecOps platform. You help users with:
1. Platform onboarding — how to use ForgeOps features
2. DevSecOps best practices — CI/CD, security scanning, branching strategies
3. Troubleshooting — pipeline failures, merge conflicts, Jira integration issues
4. Training — explaining concepts like SCA, SAST, DAST, SBOM, DORA metrics
5. Support — helping users create support tickets with the right details

ForgeOps modules: Overview, Pipelines (repo discovery), Commit & Merge (branch diff, SCA scan, AI code review), CI/CD (deploy, environments), ALM/Jira (cascading ticket selector), Security, Meetings (AI transcript analysis), Notifications, Settings.

Key features:
- Every merge requires mandatory SCA scan (Black Duck + OWASP + Gitleaks)
- AI code review runs on every merge (Phase 1.5)
- Jira tickets use US-NNN for stories, DEF-NNN for defects
- 4 environments: INT → QA → STAGE → PROD
- Tickets auto-transition on merge events

Be concise, helpful, and always suggest creating a support ticket if the user has an unresolved issue. Format responses with markdown.`;

    const contextInfo = context ? `\n\n[Context: User is on page "${context.page || 'unknown'}"]` : '';
    const userMessage = message + contextInfo;

    const { text, usage } = await callClaude(systemPrompt, userMessage, 2048);

    const suggestTicket = /ticket|issue|problem|error|fail|broken|bug|help/i.test(message);

    res.json({ response: text, suggestTicket, usage });
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
