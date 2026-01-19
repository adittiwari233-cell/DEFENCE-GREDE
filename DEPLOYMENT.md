# Deployment Guide - AWS Free Tier

This guide provides step-by-step instructions for deploying the Secure Defense Learning Portal on AWS Free Tier.

## Prerequisites

- AWS Account (Free Tier eligible)
- Domain name (optional, can use EC2 public IP)
- Basic knowledge of AWS services

## Architecture Overview

```
┌─────────────┐
│   AWS S3    │  ← Video Storage
└─────────────┘
       ↑
       │
┌─────────────┐      ┌─────────────┐
│   AWS RDS   │ ←───│   AWS EC2   │
│   MySQL     │      │   Backend   │
└─────────────┘      └─────────────┘
                            ↑
                            │
                     ┌─────────────┐
                     │AWS Amplify  │
                     │  Frontend   │
                     └─────────────┘
```

## Step 1: AWS RDS Setup (Database)

### 1.1 Create RDS Instance

1. Log in to AWS Console
2. Navigate to **RDS** service
3. Click **Create database**
4. Select **MySQL**
5. Choose **Free tier** template
6. Configure:
   - **DB instance identifier**: `learning-portal-db`
   - **Master username**: `admin` (or your choice)
   - **Master password**: Create a strong password (save it!)
   - **DB instance class**: `db.t2.micro` (Free tier)
   - **Storage**: 20 GB (Free tier limit)
   - **Public access**: Yes (for initial setup)
   - **VPC security group**: Create new or use existing
7. Click **Create database**

### 1.2 Configure Security Group

1. Go to **EC2** → **Security Groups**
2. Find the security group attached to your RDS instance
3. Edit **Inbound rules**:
   - Type: MySQL/Aurora
   - Port: 3306
   - Source: Your IP address (or EC2 security group)

### 1.3 Get Connection Details

1. In RDS console, click on your database instance
2. Note down:
   - **Endpoint**: `learning-portal-db.xxxxx.us-east-1.rds.amazonaws.com`
   - **Port**: `3306`
   - **Username**: `admin`
   - **Password**: (the one you created)

## Step 2: AWS S3 Setup (Video Storage)

### 2.1 Create S3 Bucket

1. Navigate to **S3** service
2. Click **Create bucket**
3. Configure:
   - **Bucket name**: `learning-portal-videos-{unique-id}` (must be globally unique)
   - **Region**: Same as your RDS (e.g., `us-east-1`)
   - **Block Public Access**: Keep all checked (private bucket)
   - **Versioning**: Disable (to save space)
   - **Encryption**: Enable (optional but recommended)
4. Click **Create bucket**

### 2.2 Create IAM User for S3 Access

1. Navigate to **IAM** service
2. Click **Users** → **Create user**
3. Username: `learning-portal-s3-user`
4. Select **Programmatic access**
5. Attach policy: `AmazonS3FullAccess` (or create custom policy)
6. Click **Create user**
7. **IMPORTANT**: Save the **Access Key ID** and **Secret Access Key** (shown only once!)

### 2.3 (Optional) Create Custom S3 Policy

For better security, create a custom policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::learning-portal-videos-*/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::learning-portal-videos-*"
    }
  ]
}
```

## Step 3: AWS EC2 Setup (Backend Server)

### 3.1 Launch EC2 Instance

1. Navigate to **EC2** service
2. Click **Launch Instance**
3. Configure:
   - **Name**: `learning-portal-backend`
   - **AMI**: Amazon Linux 2 (Free Tier eligible)
   - **Instance type**: `t2.micro` (Free Tier)
   - **Key pair**: Create new or use existing (download `.pem` file!)
   - **Network settings**: 
     - Create security group: `learning-portal-sg`
     - Allow SSH (22) from your IP
     - Allow HTTP (80) from anywhere
     - Allow HTTPS (443) from anywhere
     - Allow Custom TCP (5000) from anywhere (or restrict to frontend)
4. Click **Launch Instance**

### 3.2 Connect to EC2

```bash
# On Windows (PowerShell)
ssh -i your-key.pem ec2-user@your-ec2-public-ip

# On Mac/Linux
chmod 400 your-key.pem
ssh -i your-key.pem ec2-user@your-ec2-public-ip
```

### 3.3 Install Dependencies

```bash
# Update system
sudo yum update -y

# Install Node.js using NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
node --version  # Verify installation

# Install Git
sudo yum install git -y

# Install MySQL client (optional, for testing)
sudo yum install mysql -y
```

### 3.4 Deploy Backend Code

```bash
# Clone repository
git clone <your-repository-url>
cd secure-defense-learning-portal

# Install dependencies
cd server
npm install --production

# Create .env file
nano .env
```

Add your production environment variables:

```env
PORT=5000
NODE_ENV=production
JWT_SECRET=your-very-strong-random-secret-key-here
DB_HOST=learning-portal-db.xxxxx.us-east-1.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=your-rds-password
DB_NAME=learning_portal
DB_PORT=3306
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-s3-access-key-id
AWS_SECRET_ACCESS_KEY=your-s3-secret-access-key
S3_BUCKET_NAME=learning-portal-videos-{your-unique-id}
CLIENT_URL=https://your-frontend-domain.com
```

### 3.5 Setup PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
cd ~/secure-defense-learning-portal/server
pm2 start index.js --name learning-portal-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown

# Check status
pm2 status
pm2 logs learning-portal-api
```

### 3.6 Configure Security Group

1. Go to **EC2** → **Security Groups**
2. Select your security group
3. Edit **Inbound rules**:
   - Allow TCP port 5000 from anywhere (or restrict to frontend IP)

### 3.7 (Optional) Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo yum install nginx -y

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Configure Nginx
sudo nano /etc/nginx/nginx.conf
```

Add server block:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Step 4: AWS Amplify Setup (Frontend)

### 4.1 Build Frontend Locally

```bash
cd client
npm install
npm run build
```

### 4.2 Deploy to Amplify

1. Navigate to **AWS Amplify** service
2. Click **New app** → **Host web app**
3. Connect your Git repository (GitHub, GitLab, Bitbucket)
4. Configure build settings:

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

5. Add environment variables:
   - `REACT_APP_API_URL`: `http://your-ec2-ip:5000` or `https://your-domain.com/api`

6. Click **Save and deploy**

### 4.3 Alternative: Deploy Frontend to EC2

If you prefer to host frontend on EC2:

```bash
# On EC2 instance
cd ~/secure-defense-learning-portal/client
npm install
npm run build

# Install Nginx (if not already installed)
sudo yum install nginx -y

# Copy build files
sudo cp -r build/* /usr/share/nginx/html/

# Configure Nginx
sudo nano /etc/nginx/nginx.conf
```

Add configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /usr/share/nginx/html;
    index index.html;

    location / {
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

```bash
# Restart Nginx
sudo systemctl restart nginx
```

## Step 5: SSL/HTTPS Setup (Optional but Recommended)

### Using Let's Encrypt (Free)

```bash
# Install Certbot
sudo yum install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Step 6: Domain Configuration

1. **Point Domain to EC2**:
   - Create A record: `@` → EC2 Public IP
   - Create CNAME record: `www` → your-domain.com

2. **Update Environment Variables**:
   - Update `CLIENT_URL` in backend `.env`
   - Update `REACT_APP_API_URL` in frontend

## Step 7: Monitoring and Maintenance

### Monitor AWS Usage

1. **AWS Cost Explorer**: Monitor spending
2. **CloudWatch**: Monitor EC2 and RDS metrics
3. **S3 Metrics**: Monitor storage and requests

### Backup Strategy

1. **RDS Automated Backups**: Enabled by default (7 days retention)
2. **Manual Snapshots**: Create before major changes
3. **S3 Versioning**: Enable if needed (uses more storage)

### Logs

```bash
# Backend logs (PM2)
pm2 logs learning-portal-api

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx
```

## Troubleshooting

### Database Connection Issues

```bash
# Test connection from EC2
mysql -h your-rds-endpoint -u admin -p

# Check security group rules
# Verify RDS endpoint is correct
```

### S3 Upload Issues

- Verify IAM user credentials
- Check bucket name matches `.env`
- Verify bucket region matches configuration

### Frontend Can't Connect to Backend

- Check CORS configuration
- Verify `CLIENT_URL` in backend `.env`
- Check security group allows traffic
- Verify API URL in frontend environment variables

## Cost Optimization Tips

1. **Stop EC2 when not in use** (if development)
2. **Use RDS snapshots** instead of running 24/7 (for dev)
3. **Monitor S3 storage** - delete old videos
4. **Use CloudFront** for video delivery (optional, has free tier)
5. **Set up billing alerts** in AWS

## Security Checklist

- [ ] Changed default admin password
- [ ] Using strong JWT secret
- [ ] HTTPS enabled
- [ ] Database not publicly accessible (restrict to EC2)
- [ ] S3 bucket is private
- [ ] Security groups are restrictive
- [ ] Environment variables are secure
- [ ] Regular backups configured
- [ ] Monitoring enabled

## Support

For issues:
1. Check CloudWatch logs
2. Check PM2 logs: `pm2 logs`
3. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
4. Verify all environment variables
5. Check AWS service health dashboard
