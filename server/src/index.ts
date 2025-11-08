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

app.use(cors());
app.use(express.json());
app.use('/api', routes);

const startServer = async () => {
  try {
    await connectDatabase();
    
    // Redis connection is non-blocking - server will start even if Redis is unavailable
    try {
      await connectRedis();
    } catch (error) {
      console.warn('Redis connection failed, but server will continue...');
    }
    
    startJobFetcherCron();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

