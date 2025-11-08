import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Job from '../models/Job';
import ImportLog from '../models/ImportLog';

dotenv.config();

const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/job_importer';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

const initializeDatabase = async (): Promise<void> => {
  try {
    await connectDatabase();

    console.log('Initializing database indexes...');

    // Create indexes for Job collection
    console.log('Creating indexes for Job collection...');
    await Job.collection.createIndex({ externalId: 1, sourceUrl: 1 }, { unique: true });
    await Job.collection.createIndex({ title: 1 });
    await Job.collection.createIndex({ sourceUrl: 1 });
    console.log('✓ Job indexes created');

    // Create indexes for ImportLog collection
    console.log('Creating indexes for ImportLog collection...');
    await ImportLog.collection.createIndex({ timestamp: -1 });
    await ImportLog.collection.createIndex({ sourceUrl: 1 });
    console.log('✓ ImportLog indexes created');

    console.log('\nDatabase initialization completed successfully!');
    console.log('\nCollections will be created automatically when first document is inserted.');
    console.log('Collections:');
    console.log('  - jobs');
    console.log('  - import_logs');

    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};

initializeDatabase();

