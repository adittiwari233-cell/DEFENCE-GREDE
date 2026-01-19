# Secure Defense Learning Portal

A full-stack web application for managing and delivering educational video content with role-based access control.

## Features

- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **Role-Based Access Control**: Separate admin and student portals
- **Video Management**: Upload, organize, and stream videos via AWS S3
- **Section Management**: Organize videos by subjects (Physics, Chemistry, Biology, etc.)
- **Student Assignment**: Admin can assign students to specific sections
- **Secure Video Streaming**: Videos accessed via signed URLs for security

## Tech Stack

- **Frontend**: React.js with React Router
- **Backend**: Node.js with Express
- **Database**: MySQL (AWS RDS or local)
- **Storage**: AWS S3
- **Authentication**: JWT tokens

## Project Structure

```
.
├── client/                 # React frontend
│   ├── public/
│   └── src/
│       ├── components/    # Reusable components
│       ├── context/       # React context (Auth)
│       ├── pages/         # Page components
│       └── App.js
├── server/                # Node.js backend
│   ├── config/           # Database and S3 configuration
│   ├── middleware/       # Authentication middleware
│   ├── routes/           # API routes
│   └── index.js          # Server entry point
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- MySQL database (local or AWS RDS)
- AWS Account (for S3)
- npm or yarn

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd secure-defense-learning-portal
```

### 2. Install dependencies

```bash
# Install root dependencies
npm install

# Install all dependencies (root, server, client)
npm run install-all
```

### 3. Database Setup

#### Option A: Local MySQL

1. Install MySQL on your machine
2. Create a database:
```sql
CREATE DATABASE learning_portal;
```

#### Option B: AWS RDS (Free Tier)

1. Log in to AWS Console
2. Navigate to RDS service
3. Create a MySQL database instance (Free Tier eligible)
4. Note down the endpoint, port, username, and password

### 4. AWS S3 Setup

1. Log in to AWS Console
2. Navigate to S3 service
3. Create a new bucket (e.g., `learning-portal-videos`)
4. Configure bucket settings:
   - Set bucket to **private**
   - Enable versioning (optional)
   - Configure CORS if needed
5. Create an IAM user with S3 access:
   - Go to IAM → Users → Create User
   - Attach policy: `AmazonS3FullAccess` (or create custom policy)
   - Save Access Key ID and Secret Access Key

### 5. Environment Configuration

1. Copy the example environment file:
```bash
cd server
cp .env.example .env
```

2. Edit `server/.env` with your configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database Configuration
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com  # or localhost
DB_USER=your-db-username
DB_PASSWORD=your-db-password
DB_NAME=learning_portal
DB_PORT=3306

# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
S3_BUCKET_NAME=learning-portal-videos

# CORS Configuration
CLIENT_URL=http://localhost:3000
```

### 6. Initialize Database

The database tables will be automatically created when you start the server for the first time. A default admin user will also be created:

- **Email**: `admin@learningportal.com`
- **Password**: `Admin@123`

**⚠️ IMPORTANT**: Change the default admin password after first login!

## Running the Application

### Development Mode

Run both frontend and backend concurrently:

```bash
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm start
```

- Backend: http://localhost:5000
- Frontend: http://localhost:3000

### Production Build

```bash
# Build frontend
cd client
npm run build

# Start backend
cd server
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (requires auth)

### Admin Routes (requires admin role)
- `POST /api/admin/students` - Create student
- `GET /api/admin/students` - Get all students
- `PUT /api/admin/students/:id/sections` - Update student sections
- `DELETE /api/admin/students/:id` - Delete student
- `POST /api/admin/videos` - Upload video
- `GET /api/admin/videos` - Get all videos
- `DELETE /api/admin/videos/:id` - Delete video

### Student Routes (requires student role)
- `GET /api/students/sections` - Get assigned sections
- `GET /api/students/videos` - Get all assigned videos
- `GET /api/students/sections/:id/videos` - Get videos by section

### Sections
- `GET /api/sections` - Get all sections
- `POST /api/sections` - Create section (admin only)
- `PUT /api/sections/:id` - Update section (admin only)
- `DELETE /api/sections/:id` - Delete section (admin only)

## Deployment

### AWS Free Tier Deployment

#### 1. Backend Deployment (EC2)

1. **Launch EC2 Instance**:
   - Choose Amazon Linux 2 AMI (Free Tier eligible)
   - Instance type: t2.micro
   - Configure security group: Allow HTTP (80), HTTPS (443), SSH (22), and custom TCP (5000)

2. **Connect to EC2**:
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
```

3. **Install Node.js**:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

4. **Install MySQL Client** (if needed):
```bash
sudo yum install mysql -y
```

5. **Clone and Setup**:
```bash
git clone <your-repo>
cd secure-defense-learning-portal/server
npm install --production
```

6. **Configure Environment**:
```bash
nano .env
# Add your production environment variables
```

7. **Use PM2 for Process Management**:
```bash
npm install -g pm2
pm2 start index.js --name learning-portal-api
pm2 save
pm2 startup
```

#### 2. Frontend Deployment (AWS Amplify)

1. **Build Frontend**:
```bash
cd client
npm run build
```

2. **Deploy to Amplify**:
   - Go to AWS Amplify Console
   - Connect your repository
   - Configure build settings:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - cd client
           - npm install
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: client/build
       files:
         - '**/*'
     cache:
       paths:
         - client/node_modules/**/*
   ```
   - Set environment variables:
     - `REACT_APP_API_URL`: Your backend API URL

#### 3. Alternative: Deploy Frontend to EC2

1. **Install Nginx**:
```bash
sudo yum install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

2. **Build and Copy Frontend**:
```bash
cd client
npm run build
sudo cp -r build/* /usr/share/nginx/html/
```

3. **Configure Nginx**:
```bash
sudo nano /etc/nginx/nginx.conf
```

Add proxy configuration for API calls:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Database Migration

The database schema is automatically created on first server start. For production:

1. Ensure your RDS instance is accessible from EC2
2. Update security groups to allow MySQL connections
3. Run the server once to initialize tables

### Environment Variables Security

**Never commit `.env` files to version control!**

For production:
- Use AWS Systems Manager Parameter Store
- Use AWS Secrets Manager
- Use environment variables in your hosting platform

## Security Considerations

1. **Change Default Admin Password**: Immediately after first login
2. **Use Strong JWT Secret**: Generate a random string for production
3. **Enable HTTPS**: Use SSL certificates (Let's Encrypt free)
4. **Database Security**: Use strong passwords, restrict access
5. **S3 Bucket Policy**: Ensure bucket is private
6. **CORS Configuration**: Restrict to your domain in production
7. **Rate Limiting**: Consider adding rate limiting for production

## Free Tier Limits

### AWS RDS
- 750 hours/month of db.t2.micro instance
- 20 GB storage
- 20 GB backup storage

### AWS S3
- 5 GB storage
- 20,000 GET requests
- 2,000 PUT requests

### AWS EC2
- 750 hours/month of t2.micro instance

**Monitor your usage to stay within free tier limits!**

## Troubleshooting

### Database Connection Issues
- Verify database credentials in `.env`
- Check security group rules (RDS)
- Ensure database is publicly accessible (if needed)

### S3 Upload Issues
- Verify AWS credentials
- Check bucket permissions
- Verify bucket name matches `.env`

### CORS Errors
- Update `CLIENT_URL` in `.env`
- Check CORS configuration in `server/index.js`

## License

This project is provided as-is for educational purposes.

## Support

For issues and questions, please check:
- Database logs
- Server logs (console output)
- Browser console for frontend errors
- AWS CloudWatch for AWS service logs
#   D E F E N C E - G R E D E  
 