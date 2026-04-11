const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// POST /api/teams/notify
router.post('/notify', async (req, res) => {
  try {
    const { webhookUrl, card } = req.body;
    const url = webhookUrl || process.env.TEAMS_WEBHOOK_URL;

    if (!url) {
      return res.status(400).json({ error: 'No webhook URL provided. Set TEAMS_WEBHOOK_URL or pass webhookUrl in body.' });
    }

    if (!card) {
      return res.status(400).json({ error: 'card payload is required' });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(card),
    });

    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({ error: text });
    }

    res.json({ success: true, response: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
