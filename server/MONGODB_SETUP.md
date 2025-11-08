# MongoDB Atlas Setup Guide

## Your MongoDB Atlas Connection String

Your MongoDB Atlas connection string is:
```
mongodb+srv://lokesh:<db_password>@cluster1.wcyq2sb.mongodb.net/?appName=Cluster1
```

## Setup Steps

### 1. Replace the Password

Replace `<db_password>` with your actual MongoDB Atlas database password.

**Example:**
If your password is `MyPassword123`, your connection string should be:
```
mongodb+srv://lokesh:MyPassword123@cluster1.wcyq2sb.mongodb.net/?appName=Cluster1
```

### 2. Add Database Name (Recommended)

Add the database name to the connection string. The application will use `job_importer` as the database name.

**Recommended format:**
```
mongodb+srv://lokesh:<db_password>@cluster1.wcyq2sb.mongodb.net/job_importer?appName=Cluster1
```

### 3. Update .env File

Create a `.env` file in the `server` directory with:

```env
MONGODB_URI=mongodb+srv://lokesh:YOUR_ACTUAL_PASSWORD@cluster1.wcyq2sb.mongodb.net/job_importer?appName=Cluster1
```

**Important**: 
- Replace `YOUR_ACTUAL_PASSWORD` with your actual password
- The database name `job_importer` will be created automatically
- Collections (`jobs` and `import_logs`) will be created automatically when you insert the first document

### 4. Verify Network Access

Make sure your MongoDB Atlas cluster allows connections from your IP address:

1. Go to MongoDB Atlas Dashboard
2. Click on "Network Access"
3. Add your IP address (or use `0.0.0.0/0` for all IPs - **not recommended for production**)

### 5. Test Connection

Run the initialization script to test the connection:

```bash
cd server
npm run init-db
```

If successful, you'll see:
```
MongoDB connected successfully
✓ Job indexes created
✓ ImportLog indexes created
Database initialization completed successfully!
```

## Connection String Format

### Without Database Name (will auto-add):
```
mongodb+srv://lokesh:<password>@cluster1.wcyq2sb.mongodb.net/?appName=Cluster1
```

### With Database Name (recommended):
```
mongodb+srv://lokesh:<password>@cluster1.wcyq2sb.mongodb.net/job_importer?appName=Cluster1
```

## Troubleshooting

### Connection Error: "Authentication failed"
- Check that your password is correct
- Make sure you're using the correct username (`lokesh`)

### Connection Error: "IP not whitelisted"
- Add your IP address to MongoDB Atlas Network Access
- Or temporarily allow all IPs (not recommended for production)

### Connection Error: "Timeout"
- Check your internet connection
- Verify MongoDB Atlas cluster is running
- Check firewall settings

### Collections Not Created
- Collections are created automatically on first insert
- Trigger an import: `curl -X POST http://localhost:3001/api/import/trigger`
- Check MongoDB Atlas dashboard to verify collections exist

## Security Best Practices

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use environment variables** in production
3. **Restrict IP access** - Only allow specific IPs in Network Access
4. **Use strong passwords** - Use a strong, unique password for your database user
5. **Rotate passwords** - Regularly update your database password

## Next Steps

After setting up MongoDB Atlas:

1. ✅ Update `.env` file with your connection string
2. ✅ Test connection: `npm run init-db`
3. ✅ Start the server: `npm run dev`
4. ✅ Trigger an import to create collections

