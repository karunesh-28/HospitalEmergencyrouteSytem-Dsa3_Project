const express = require('express');
const http    = require('http');
const { WebSocketServer } = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors(), express.json());

// Connection helper
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospital_routes')
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Mount REST routes
app.use('/api/route',      require('./routes/routeApi'));
app.use('/api/incidents',  require('./routes/incidentApi'));
app.use('/api/ambulances', require('./routes/ambulanceApi'));
app.use('/api/logs',       require('./routes/logApi'));
app.use('/api/roads',      require('./routes/roadApi'));

// Health check endpoint for failover checks
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', pid: process.pid, db: mongoose.connection.readyState });
});

const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

// Broadcast helper
const broadcast = (type, payload) => {
  const msg = JSON.stringify({ type, payload });
  wss.clients.forEach(c => {
    if (c.readyState === 1) {
      c.send(msg);
    }
  });
};
app.set('broadcast', broadcast);

// WebSocket client connection handling
wss.on('connection', ws => {
  console.log(`WS Client connected (pid ${process.pid})`);
  ws.send(JSON.stringify({ type: 'connected', payload: { pid: process.pid } }));
});

// Start streaming feed simulation ONLY for the first worker in cluster
if (!process.env.WORKER_INDEX || process.env.WORKER_INDEX === '0') {
  console.log(`Starting real-time simulation feeds on worker index ${process.env.WORKER_INDEX || 0}`);
  require('./services/streamFeeds')(broadcast);
}

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} (PID ${process.pid})`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    } catch (err) {
      console.error('Error closing MongoDB connection:', err);
    } finally {
      process.exit(0);
    }
  });
});

