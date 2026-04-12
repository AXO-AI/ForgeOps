const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const DATA_FILE = path.join(__dirname, '../../data/tickets.json');

function readTickets() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeTickets(tickets) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(tickets, null, 2));
}

function nextId(tickets) {
  if (tickets.length === 0) return 'SUP-001';
  const nums = tickets.map(t => parseInt(t.id.replace('SUP-', ''), 10)).filter(n => !isNaN(n));
  const max = Math.max(0, ...nums);
  return `SUP-${String(max + 1).padStart(3, '0')}`;
}

// GET /tickets — list all, with optional filters
router.get('/tickets', (req, res) => {
  try {
    let tickets = readTickets();
    const { status, priority, category, search } = req.query;

    if (status) tickets = tickets.filter(t => t.status === status);
    if (priority) tickets = tickets.filter(t => t.priority === priority);
    if (category) tickets = tickets.filter(t => t.category === category);
    if (search) {
      const q = search.toLowerCase();
      tickets = tickets.filter(t =>
        (t.subject || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.id || '').toLowerCase().includes(q)
      );
    }

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /tickets/:id
router.get('/tickets/:id', (req, res) => {
  try {
    const tickets = readTickets();
    const ticket = tickets.find(t => t.id === req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /tickets — create
router.post('/tickets', (req, res) => {
  try {
    const tickets = readTickets();
    const id = nextId(tickets);
    const now = new Date().toISOString();

    const ticket = {
      id,
      userName: req.body.userName || '',
      employeeId: req.body.employeeId || '',
      email: req.body.email || '',
      category: req.body.category || 'General Question',
      subcategory: req.body.subcategory || '',
      priority: req.body.priority || 'Medium',
      status: 'Open',
      subject: req.body.subject || '',
      description: req.body.description || '',
      environment: req.body.environment || 'N/A',
      repository: req.body.repository || '',
      branch: req.body.branch || '',
      screenshots: req.body.screenshots || [],
      attachments: req.body.attachments || [],
      comments: [],
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      assignee: req.body.assignee || 'Unassigned',
      tags: req.body.tags || [],
    };

    tickets.push(ticket);
    writeTickets(tickets);
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /tickets/:id — partial update
router.put('/tickets/:id', (req, res) => {
  try {
    const tickets = readTickets();
    const idx = tickets.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Ticket not found' });

    const updates = req.body;
    const ticket = tickets[idx];

    for (const key of Object.keys(updates)) {
      if (key !== 'id' && key !== 'createdAt') {
        ticket[key] = updates[key];
      }
    }

    ticket.updatedAt = new Date().toISOString();

    if (updates.status === 'Resolved' || updates.status === 'Closed') {
      ticket.resolvedAt = ticket.resolvedAt || new Date().toISOString();
    }

    tickets[idx] = ticket;
    writeTickets(tickets);
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /tickets/:id/comment
router.post('/tickets/:id/comment', (req, res) => {
  try {
    const tickets = readTickets();
    const idx = tickets.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Ticket not found' });

    const comment = {
      author: req.body.author || 'Anonymous',
      text: req.body.text || '',
      timestamp: new Date().toISOString(),
    };

    tickets[idx].comments.push(comment);
    tickets[idx].updatedAt = new Date().toISOString();
    writeTickets(tickets);
    res.json(tickets[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /stats
router.get('/stats', (req, res) => {
  try {
    const tickets = readTickets();
    const byStatus = {};
    const byPriority = {};
    const byCategory = {};

    for (const t of tickets) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    }

    res.json({ total: tickets.length, byStatus, byPriority, byCategory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
