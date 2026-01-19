# Setup Instructions - Running the Application

## ✅ Dependencies Installed

All npm packages have been installed successfully!

## ⚙️ Configuration Required

Before running the application, you need to configure:

### 1. Database Setup

**SQL Server Configuration**
The application is configured to use SQL Server. Update `server/.env`:
   - `DB_HOST=GULSHAN` (or your SQL Server hostname)
   - `DB_USER=student` (your SQL Server username)
   - `DB_PASSWORD=Student@123` (your SQL Server password)
   - `DB_NAME=learning_portal`
   - `DB_PORT=1433` (default SQL Server port)
   - `DB_ENCRYPT=false` (set to `true` for Azure SQL)

**Note**: The database will be automatically created on first server start if you have permissions. Otherwise, create it manually:
```sql
CREATE DATABASE learning_portal;
```

### 2. AWS S3 Setup

1. Create S3 bucket in AWS Console
2. Create IAM user with S3 access
3. Update `server/.env`:
   - `AWS_ACCESS_KEY_ID=your-access-key`
   - `AWS_SECRET_ACCESS_KEY=your-secret-key`
   - `S3_BUCKET_NAME=your-bucket-name`
   - `AWS_REGION=us-east-1` (or your region)

### 3. Environment File

The `.env` file has been created from template. Edit `server/.env`:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=change-this-to-a-strong-random-string
DB_HOST=GULSHAN
DB_USER=student
DB_PASSWORD=Student@123
DB_NAME=learning_portal
DB_PORT=1433
DB_ENCRYPT=false
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET_NAME=your-bucket-name
CLIENT_URL=http://localhost:3000
```

## 🚀 Running the Application

### Method 1: Using npm scripts (Recommended)

```bash
npm run dev
```

This will start both backend and frontend concurrently.

### Method 2: Run separately

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```

### Method 3: Using PowerShell script

```powershell
.\start-app.ps1
```

## 🌐 Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## 🔐 Default Login

- **Email**: `admin@learningportal.com`
- **Password**: `Admin@123`

**⚠️ IMPORTANT**: Change the admin password immediately after first login!

## 🔍 Troubleshooting

### Database Connection Error

If you see database connection errors:
1. Verify SQL Server is running and accessible
2. Check credentials in `server/.env` (DB_HOST, DB_USER, DB_PASSWORD)
3. Test connection using SQL Server Management Studio or `sqlcmd`
4. Ensure database exists or that the user has CREATE DATABASE permissions
5. Verify SQL Server Authentication is enabled (not just Windows Authentication)
6. Check firewall settings if connecting to remote SQL Server

### S3 Upload Error

If video upload fails:
1. Verify AWS credentials in `server/.env`
2. Check bucket name matches exactly
3. Verify IAM user has S3 permissions
4. Check bucket region matches `AWS_REGION`

### Port Already in Use

If ports 3000 or 5000 are in use:
1. Find process: `netstat -ano | findstr ":5000"`
2. Kill process: `taskkill /PID <pid> /F`
3. Or change PORT in `server/.env`

### CORS Errors

If you see CORS errors:
1. Verify `CLIENT_URL` in `server/.env` matches frontend URL
2. Ensure it's exactly `http://localhost:3000` (no trailing slash)

## 📝 First Steps After Starting

1. **Login** with default admin credentials
2. **Change admin password** (via database or add feature)
3. **Create sections** if needed (defaults: Physics, Chemistry, Biology)
4. **Add students** via Admin Dashboard
5. **Upload videos** to test S3 integration

## 🎯 Quick Test

1. Start the application
2. Open http://localhost:3000
3. Login as admin
4. Go to "Students" tab
5. Try creating a test student
6. Go to "Videos" tab
7. Try uploading a test video

## 📚 Documentation

- **README.md** - Full documentation
- **QUICKSTART.md** - Quick start guide
- **DEPLOYMENT.md** - AWS deployment guide
- **PROJECT_SUMMARY.md** - Project overview

## ⚠️ Important Notes

1. **Database will auto-initialize** on first server start
2. **Default admin user** is created automatically
3. **Default sections** are created automatically
4. **S3 bucket must exist** before uploading videos
5. **Environment variables** are required for full functionality

## 🆘 Need Help?

Check the console output for specific error messages. Common issues:
- Database connection: Check SQL Server is running and credentials are correct
- S3 errors: Verify AWS credentials and bucket name
- Port conflicts: Change ports or kill existing processes
