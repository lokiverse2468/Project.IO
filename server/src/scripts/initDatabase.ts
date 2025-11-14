import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Job from '../models/Job';
import ImportLog from '../models/ImportLog';

dotenv.config();

const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/job_importer';
    await mongoose.connect(mongoUri);
  } catch (error) {
    throw error;
  }
};

const initializeDatabase = async (): Promise<void> => {
  try {
    await connectDatabase();


    // Create indexes for Job collection
    await Job.collection.createIndex({ externalId: 1, sourceUrl: 1 }, { unique: true });
    await Job.collection.createIndex({ title: 1 });
    await Job.collection.createIndex({ sourceUrl: 1 });

    // Create indexes for ImportLog collection
    await ImportLog.collection.createIndex({ timestamp: -1 });
    await ImportLog.collection.createIndex({ sourceUrl: 1 });


    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
};

initializeDatabase();

