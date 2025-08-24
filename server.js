import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './config/db.js';
import jobsRouter from './routes/jobs.js';
import {
  limiter,
  sanitizeInput,
  preventParameterPollution
} from './middleware/security.js';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors());
app.use(limiter);
app.use(express.json({ limit: '5mb' }));
app.use(sanitizeInput);
app.use(preventParameterPollution);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health check endpoint
app.get('/health', (_req, res) => res.json({ 
  status: 'ok', 
  timestamp: new Date().toISOString(),
  service: 'job-service'
}));

// API routes
app.use('/api/jobs', jobsRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Job service listening on :${PORT}`));
  })
  .catch(err => {
    console.error("Failed to connect to DB", err);
    process.exit(1);
  });