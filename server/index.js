require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const sosRoutes = require('./routes/sosRoutes');
const contactsRoutes = require('./routes/contactsRoutes');
const evidenceRoutes = require('./routes/evidenceRoutes');
const authRoutes = require('./routes/authRoutes');
const setupSosSockets = require('./sockets/sosSocketHandler');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/evidence', evidenceRoutes);

// Health check & status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'SafeGuard Network-Adaptive Safety Backend',
    timestamp: new Date().toISOString()
  });
});

// Setup WebSockets
setupSosSockets(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` SafeGuard Backend running on port ${PORT}`);
  console.log(` REST API: http://localhost:${PORT}/api/health`);
  console.log(` WebSocket: ws://localhost:${PORT}`);
  console.log(`=========================================`);
});
