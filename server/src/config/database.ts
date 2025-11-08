import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/job_importer';
    
    // If MongoDB Atlas URI doesn't include database name, add it
    let connectionUri = mongoUri;
    if (mongoUri.includes('mongodb+srv://')) {
      // Check if database name is missing (URI ends with /? or just ?)
      if (mongoUri.includes('/?') || mongoUri.endsWith('?')) {
        // Add database name before the query string
        connectionUri = mongoUri.replace('/?', '/job_importer?').replace('?', '/job_importer?');
      } else if (!mongoUri.match(/\/[^/?]+(\?|$)/)) {
        // No database name and no query string
        connectionUri = mongoUri + '/job_importer';
      }
    }
    
    await mongoose.connect(connectionUri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

