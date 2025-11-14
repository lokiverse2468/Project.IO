import Redis from 'ioredis';

let redisClient: Redis | null = null;

const parseRedisConnectionString = (connectionString?: string) => {
  if (!connectionString) return null;
  
  // Remove redis-cli -u prefix if present
  let cleanString = connectionString.replace(/^redis-cli\s+-u\s+/, '').trim();
  
  // Parse redis:// or rediss:// connection string
  // Format: redis://username:password@host:port
  const match = cleanString.match(/^(?:redis|rediss):\/\/(?:([^:]+):([^@]+)@)?([^@:]+):(\d+)/);
  if (match) {
    return {
      username: match[1] || undefined,
      password: match[2] || undefined,
      host: match[3],
      port: parseInt(match[4]),
    };
  }
  
  return null;
};

export const connectRedis = async (): Promise<void> => {
  try {
    let redisConfig: {
      host: string;
      port: number;
      password?: string;
      username?: string;
    };

    // Check if REDIS_URL or REDIS_CONNECTION_STRING is provided
    const connectionString = process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING || process.env.REDIS_HOST;
    
    if (connectionString && (connectionString.startsWith('redis://') || connectionString.startsWith('rediss://') || connectionString.includes('redis-cli'))) {
      // Parse connection string
      const parsed = parseRedisConnectionString(connectionString);
      if (parsed) {
        redisConfig = {
          host: parsed.host,
          port: parsed.port,
          password: parsed.password,
          username: parsed.username,
        };
      } else {
        throw new Error('Invalid Redis connection string format');
      }
    } else {
      // Use individual environment variables
      redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
      };
    }

    redisClient = new Redis({
      ...redisConfig,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: null, // Required for BullMQ blocking operations
      connectTimeout: 10000,
    });

    redisClient.on('connect', () => {
    });

    redisClient.on('ready', () => {
    });

    redisClient.on('error', (error: Error) => {
    });

    // Test connection
    await redisClient.ping();
  } catch (error) {
    redisClient = null;
  }
};

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

