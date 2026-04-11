require('dotenv').config();
const express = require('express');
const cors = require('cors');

const jiraRoutes = require('./routes/jira');
const githubRoutes = require('./routes/github');
const aiRoutes = require('./routes/ai');
const teamsRoutes = require('./routes/teams');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/jira', jiraRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/teams', teamsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`ForgeOps backend running on port ${PORT}`);
});
