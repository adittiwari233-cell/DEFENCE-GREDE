const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { uploadVideo, s3 } = require('../config/s3');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Register new student
router.post('/students', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('sectionIds').isArray().withMessage('Section IDs must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, sectionIds } = req.body;
    const pool = db.getPool();

    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const [rows, meta] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, 'student']
    );

    const userId = meta.insertId;
    // Assign sections (make assignment non-fatal so user creation succeeds even if assignment fails)
    let assignmentError = false;
    if (sectionIds && sectionIds.length > 0) {
      try {
        for (const sectionId of sectionIds) {
          console.log(`Assigning section ${sectionId} to user ${userId}`);
          await pool.query(
            'INSERT INTO user_sections (user_id, section_id) VALUES (?, ?)',
            [userId, sectionId]
          );
        }
      } catch (assignErr) {
        assignmentError = true;
        console.error('Failed to assign sections for user', userId, assignErr);
      }
    }

    res.status(201).json({
      message: assignmentError ? 'Student created but some section assignments failed' : 'Student created successfully',
      user: { id: userId, name, email, role: 'student' }
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ message: 'Failed to create student' });
  }
});

// Get all students
router.get('/students', async (req, res) => {
  try {
    const pool = db.getPool();
    const [students] = await pool.query(
      `SELECT u.id, u.name, u.email, u.created_at,
       ISNULL(STRING_AGG(s.name, ', ') WITHIN GROUP (ORDER BY s.name), 'None') as assigned_sections
       FROM users u
       LEFT JOIN user_sections us ON u.id = us.user_id
       LEFT JOIN sections s ON us.section_id = s.id
       WHERE u.role = 'student'
       GROUP BY u.id, u.name, u.email, u.created_at
       ORDER BY u.created_at DESC`
    );

    res.json({ students });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Failed to get students' });
  }
});

// Update student sections
router.put('/students/:id/sections', [
  body('sectionIds').isArray().withMessage('Section IDs must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { sectionIds } = req.body;
    const pool = db.getPool();

    // Verify user is a student
    const [users] = await pool.query('SELECT id, role FROM users WHERE id = ?', [id]);
    if (users.length === 0 || users[0].role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Remove existing assignments
    await pool.query('DELETE FROM user_sections WHERE user_id = ?', [id]);

    // Add new assignments
    if (sectionIds && sectionIds.length > 0) {
      for (const sectionId of sectionIds) {
        await pool.query(
          'INSERT INTO user_sections (user_id, section_id) VALUES (?, ?)',
          [id, sectionId]
        );
      }
    }

    res.json({ message: 'Student sections updated successfully' });
  } catch (error) {
    console.error('Update student sections error:', error);
    res.status(500).json({ message: 'Failed to update student sections' });
  }
});

// Delete student
router.delete('/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = db.getPool();

    // Verify user is a student
    const [users] = await pool.query('SELECT id, role FROM users WHERE id = ?', [id]);
    if (users.length === 0 || users[0].role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ message: 'Failed to delete student' });
  }
});

// Upload video
router.post('/videos', uploadVideo.single('video'), [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('sectionId').isInt().withMessage('Valid section ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Video file is required' });
    }

    // Debug: log upload file metadata
    console.log('Upload file metadata:', {
      originalname: req.file.originalname,
      key: req.file.key,
      location: req.file.location,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    const { title, sectionId } = req.body;
    const pool = db.getPool();

    // Verify section exists
    const [sections] = await pool.query('SELECT id FROM sections WHERE id = ?', [sectionId]);
    if (sections.length === 0) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Save video metadata
    const [videoRows, videoMeta] = await pool.query(
      'INSERT INTO videos (title, section_id, s3_key, s3_url, uploaded_by) VALUES (?, ?, ?, ?, ?)',
      [title, sectionId, req.file.key, req.file.location, req.user.id]
    );

    console.log('Inserted video result:', videoMeta);

    res.status(201).json({
      message: 'Video uploaded successfully',
      video: {
        id: videoMeta.insertId,
        title,
        sectionId,
        s3Url: req.file.location
      }
    });
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({ message: 'Failed to upload video' });
  }
});

// Get all videos
router.get('/videos', async (req, res) => {
  try {
    const pool = db.getPool();
    const [videos] = await pool.query(
      `SELECT v.id, v.title, v.section_id, v.s3_key, v.s3_url, v.created_at,
       s.name as section_name, u.name as uploaded_by_name
       FROM videos v
       JOIN sections s ON v.section_id = s.id
       JOIN users u ON v.uploaded_by = u.id
       ORDER BY v.created_at DESC`
    );

    res.json({ videos });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ message: 'Failed to get videos' });
  }
});

// Delete video
router.delete('/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = db.getPool();

    // Get video info
    const [videos] = await pool.query('SELECT s3_key FROM videos WHERE id = ?', [id]);
    if (videos.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Delete from S3
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: videos[0].s3_key
      })
    );

    // Delete from database
    await pool.query('DELETE FROM videos WHERE id = ?', [id]);

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ message: 'Failed to delete video' });
  }
});

module.exports = router;
