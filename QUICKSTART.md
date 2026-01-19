# Quick Start Guide

Get the Secure Defense Learning Portal up and running in minutes!

## Prerequisites Check

- [ ] Node.js installed (v14+)
- [ ] MySQL database available (local or AWS RDS)
- [ ] AWS account with S3 access

## Step 1: Install Dependencies

```bash
# Install all dependencies
npm run install-all
```

This will install dependencies for:
- Root project
- Backend server
- Frontend client

## Step 2: Database Setup

### Option A: Local MySQL

1. Start MySQL service
2. Create database:
```sql
CREATE DATABASE learning_portal;
```

### Option B: AWS RDS

1. Create RDS MySQL instance (Free Tier)
2. Note down: endpoint, port, username, password

## Step 3: AWS S3 Setup

1. Create S3 bucket (e.g., `learning-portal-videos-12345`)
2. Keep bucket **private**
3. Create IAM user with S3 access
4. Save Access Key ID and Secret Access Key

## Step 4: Configure Environment

1. Copy environment template:
```bash
cd server
# Create .env file manually or copy from example
```

2. Create `server/.env` file with:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=change-this-to-a-random-secret-key
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=learning_portal
DB_PORT=3306
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=learning-portal-videos-12345
CLIENT_URL=http://localhost:3000
```

## Step 5: Start the Application

### Development Mode (Both Frontend & Backend)

```bash
npm run dev
```

This starts:
- Backend on http://localhost:5000
- Frontend on http://localhost:3000

### Or Run Separately

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

## Step 6: First Login

1. Open http://localhost:3000
2. Login with default admin credentials:
   - **Email**: `admin@learningportal.com`
   - **Password**: `Admin@123`

3. **⚠️ IMPORTANT**: Change the admin password immediately!

## Step 7: Initial Setup (Admin)

1. **Create Sections** (if needed):
   - Default sections (Physics, Chemistry, Biology) are created automatically
   - You can add more via API or database

2. **Add Students**:
   - Go to Students tab
   - Fill in student details
   - Assign sections
   - Click "Create Student"

3. **Upload Videos**:
   - Go to Videos tab
   - Enter title
   - Select section
   - Choose video file
   - Click "Upload Video"

## Troubleshooting

### Database Connection Error

- Verify database credentials in `.env`
- Check if MySQL is running (local)
- Check RDS security group (AWS)
- Test connection: `mysql -h HOST -u USER -p`

### S3 Upload Error

- Verify AWS credentials
- Check bucket name matches `.env`
- Verify bucket region
- Check IAM user permissions

### Port Already in Use

- Change `PORT` in `server/.env`
- Or kill process using port 5000:
  ```bash
  # Windows
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  
  # Mac/Linux
  lsof -ti:5000 | xargs kill
  ```

### CORS Errors

- Update `CLIENT_URL` in `server/.env`
- Ensure it matches your frontend URL exactly

## Next Steps

- Read [README.md](README.md) for detailed documentation
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- Review API endpoints in README
- Set up monitoring and backups

## Default Credentials

**Admin User:**
- Email: `admin@learningportal.com`
- Password: `Admin@123`

**⚠️ SECURITY WARNING:**
- Change default password immediately!
- Use strong JWT_SECRET in production
- Never commit `.env` files to git

## Support

For issues:
1. Check server console logs
2. Check browser console (F12)
3. Verify all environment variables
4. Check database and S3 connectivity

Happy Learning! 🎓
