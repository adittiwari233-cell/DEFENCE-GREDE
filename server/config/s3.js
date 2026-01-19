const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl: presignUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
require('dotenv').config();

// Configure AWS S3 (AWS SDK v3)
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Configure multer for S3 upload
const uploadVideo = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    acl: 'private', // Videos are private, accessed via signed URLs
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `videos/${uniqueSuffix}${ext}`);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, {
        uploadedBy: req.user.id.toString(),
        originalName: file.originalname
      });
    }
  }),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  }
});

// Generate signed URL for video access
const getSignedUrl = async (key, expiresIn = 3600) => {
  // If key is already a full URL, extract the object key robustly
  if (!key) throw new Error('Missing S3 key or URL');

  let s3Key = key;

  try {
    if (key.includes('amazonaws.com') || key.startsWith('http://') || key.startsWith('https://')) {
      // Normalize and parse the URL to extract object key
      const parsed = new URL(key);
      const bucketName = process.env.S3_BUCKET_NAME;

      // Case 1: bucket is in hostname: bucket.s3.amazonaws.com or bucket.s3.<region>.amazonaws.com
      if (parsed.hostname && bucketName && parsed.hostname.startsWith(`${bucketName}.`)) {
        s3Key = parsed.pathname.replace(/^\/+/, '');
      }
      // Case 2: path contains /{bucket}/key... (virtual-hosted vs path-style URLs)
      else if (parsed.pathname && bucketName && parsed.pathname.includes(`/${bucketName}/`)) {
        s3Key = parsed.pathname.split(`/${bucketName}/`).slice(1).join('/');
      }
      // Fallback: use pathname without leading slash
      else {
        s3Key = parsed.pathname.replace(/^\/+/, '');
      }
    }

    return presignUrl(
      s3,
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key
      }),
      { expiresIn } // seconds (default 1 hour)
    );
  } catch (err) {
    console.error('Failed to generate signed URL for key/url:', key, '\nResolved s3Key:', s3Key, '\nError:');
    throw err;
  }
};

module.exports = {
  uploadVideo,
  getSignedUrl,
  s3
};
