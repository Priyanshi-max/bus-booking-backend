require("dotenv").config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const bookingRoutes = require('./routes/bookingRoutes');

const app = express(); // ✅ define first

// 🔥 FIX: trust proxy (VERY IMPORTANT)
app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS (FIXED)
app.use(cors({
  origin: [
    "http://localhost:3000", "http://localhost:8000",
    "https://your-vercel-app.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));


// Rate limiter (general)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// JSON parser
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api', bookingRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});