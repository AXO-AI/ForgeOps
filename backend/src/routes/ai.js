const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

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

module.exports = router;
