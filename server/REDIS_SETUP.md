# Redis Setup Guide

## Current Status

✅ **MongoDB**: Connected successfully  
❌ **Redis**: Not connected (required for queue processing)

## Why Redis is Needed

Redis is required for:
- **Queue Processing**: BullMQ uses Redis to manage job queues
- **Background Workers**: Workers process jobs from Redis queues
- **Job Import**: Jobs are queued in Redis before being processed

## Solution Options

### Option 1: Install Redis Locally (Recommended for Development)

#### Windows (Using WSL or Docker)

**Using WSL (Windows Subsystem for Linux):**
```bash
# In WSL terminal
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

**Using Docker:**
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

**Using Chocolatey:**
```bash
choco install redis-64
redis-server
```

#### macOS
```bash
brew install redis
brew services start redis
```

#### Linux
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

### Option 2: Use Redis Cloud (Recommended for Production)

1. **Sign up for Redis Cloud**: https://redis.com/try-free/
2. **Create a database**
3. **Get connection details** (host, port, password)
4. **Update `.env` file**:

```env
REDIS_HOST=your-redis-host.redis.cloud
REDIS_PORT=12345
REDIS_PASSWORD=your-redis-password
```

### Option 3: Use Upstash Redis (Free Tier Available)

1. **Sign up**: https://upstash.com/
2. **Create Redis database**
3. **Copy connection string**
4. **Update `.env` file** with connection details

## Verify Redis is Running

### Test Redis Connection

```bash
# If Redis is installed locally
redis-cli ping
```

Should return: `PONG`

### Check Redis Status

```bash
# Windows (if installed)
redis-cli --version

# Linux/Mac
redis-cli info server
```

## Update .env File

After installing Redis, your `.env` file should have:

```env
# Redis Configuration (Local)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# OR for Redis Cloud
REDIS_HOST=your-redis-host.redis.cloud
REDIS_PORT=12345
REDIS_PASSWORD=your-password
```

## Restart Server

After setting up Redis:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

You should see:
```
Redis connected successfully
Redis is ready
```

## Troubleshooting

### Redis Connection Refused

**Problem**: `ECONNREFUSED 127.0.0.1:6379`

**Solutions**:
1. Make sure Redis is running: `redis-cli ping`
2. Check Redis is listening on port 6379
3. Verify firewall isn't blocking port 6379
4. Try restarting Redis service

### Redis Not Found

**Problem**: `redis-server: command not found`

**Solution**: Install Redis (see Option 1 above)

### Redis Cloud Connection Issues

**Problem**: Can't connect to Redis Cloud

**Solutions**:
1. Verify connection details in `.env`
2. Check IP whitelist in Redis Cloud dashboard
3. Verify password is correct
4. Check if database is active

## Quick Start (Docker)

If you have Docker installed:

```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

This starts Redis on port 6379. No configuration needed!

## Current Behavior

The server will start even without Redis, but:
- ⚠️ Queue functionality won't work
- ⚠️ Job imports will fail when trying to queue jobs
- ⚠️ Workers won't be able to process jobs

**To fully use the application, Redis must be running.**

