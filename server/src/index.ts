import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import routes from './routes';
import { startJobFetcherCron } from './cron/jobFetcher';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.CLIENT_URL,
      'https://project-io-six.vercel.app',
      'http://localhost:3000',
    ].filter(Boolean).map(url => url?.replace(/\/$/, '')); // Remove trailing slashes
    
    // Check if origin matches (with or without trailing slash)
    const originWithoutSlash = origin.replace(/\/$/, '');
    if (allowedOrigins.some(allowed => allowed === origin || allowed === originWithoutSlash)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use('/api', routes);

const startServer = async () => {
  try {
    await connectDatabase();
    
    // Redis connection is non-blocking - server will start even if Redis is unavailable
    try {
      await connectRedis();
    } catch (error) {
    }
    
    const enableCron = (process.env.ENABLE_JOB_FETCH_CRON ?? 'true').toLowerCase() === 'true';
    if (enableCron) {
      const cronExpression = process.env.JOB_FETCH_INTERVAL || '0 * * * *';
      /**
       * Automatically fetch jobs on a schedule so new postings appear without
       * requiring a manual trigger. The interval is controlled via
       * JOB_FETCH_INTERVAL (cron syntax).
       */
      startJobFetcherCron();
    } else {
    }
    
    app.listen(PORT, () => {
    });
  } catch (error) {
    process.exit(1);
  }
};

startServer();

