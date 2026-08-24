import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import apiRouter from './routes/index.js';
import { initBackgroundJobs } from './services/cronService.js';

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'AuraHealth AI API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    concurrencyProtection: 'ENABLED',
    aiTriageFallback: 'ACTIVE',
  });
});

// Mount API routes
app.use('/api', apiRouter);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred',
  });
});

const port = parseInt(ENV.PORT, 10) || 5000;

app.listen(port, () => {
  console.log(`🚀 AuraHealth AI Backend Server running on http://localhost:${port}`);
  console.log(`🏥 Health check at http://localhost:${port}/api/health`);
  
  // Start automated cron workers
  initBackgroundJobs();
});

export default app;
