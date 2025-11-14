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
    
    // Optimize connection pool for better performance
    const connectionOptions = {
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2, // Minimum number of connections to maintain
      serverSelectionTimeoutMS: 5000, // How long to try selecting a server
      socketTimeoutMS: 45000, // How long a send or receive on a socket can take before timeout
    };
    
    // Disable mongoose buffering at the connection level
    mongoose.set('bufferCommands', false);
    
    await mongoose.connect(connectionUri, connectionOptions);
  } catch (error) {
    throw error;
  }
};

