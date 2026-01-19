const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { getSignedUrl } = require('../config/s3');

const router = express.Router();

// Debug helper to print key request info without leaking full tokens
const debugRequest = (req) => {
  const authHeader = req.headers.authorization || '';
  const tokenPreview = authHeader.split(' ')[1]
    ? authHeader.split(' ')[1].slice(0, 8) + '...'
    : null;

  return {
    method: req.method,
    path: req.originalUrl || req.url,
    user: req.user ? { id: req.user.id, email: req.user.email, role: req.user.role } : null,
    params: req.params,
    query: req.query,
    body: req.body,
    authPresent: !!authHeader,
    tokenPreview
  };
};
// All student routes require authentication
router.use(authenticate);

// Get assigned sections
router.get('/sections', async (req, res) => {
  try {
    console.log('Request:', debugRequest(req));

    const pool = db.getPool();
    const [sections] = await pool.query(
      `SELECT s.id, s.name, s.description
       FROM sections s
       JOIN user_sections us ON s.id = us.section_id
       WHERE us.user_id = ?
       ORDER BY s.name`,
      [req.user.id]
    );

    res.json({ sections });
  } catch (error) {
    console.error('Get sections error:', error);
    res.status(500).json({ message: 'Failed to get sections' });
  }
});

// Get videos for assigned sections
router.get('/videos', async (req, res) => {
  try {
    console.log('Request:', debugRequest(req));

    const pool = db.getPool();
    const [videos] = await pool.query(
      `SELECT v.id, v.title, v.section_id, v.s3_key, v.s3_url, v.created_at,
       s.name as section_name
       FROM videos v
       JOIN sections s ON v.section_id = s.id
       JOIN user_sections us ON s.id = us.section_id
       WHERE us.user_id = ?
       ORDER BY s.name, v.created_at DESC`,
      [req.user.id]
    );

    // Generate signed URLs for each video
    const videosWithUrls = await Promise.all(
      videos.map(async (video) => {
        try {
          const signedUrl = await getSignedUrl(video.s3_key || video.s3_url);
          return {
            ...video,
            videoUrl: signedUrl
          };
        } catch (error) {
          console.error(`Error generating signed URL for video ${video.id}:`, error);
          return {
            ...video,
            videoUrl: null,
            error: 'Failed to generate video URL'
          };
        }
      })
    );

    res.json({ videos: videosWithUrls });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ message: 'Failed to get videos' });
  }
});

// Get videos by section
router.get('/sections/:sectionId/videos', async (req, res) => {
  try {
    // resolve sectionId from URL param, query string, or request body
    let sectionId = req.params.sectionId || req.query.sectionId || req.body.sectionId;
    const pool = db.getPool();

    // normalize and validate
    if (sectionId !== undefined) {
      sectionId = Number(sectionId);
    }

    console.log('Request:', debugRequest(req), 'resolvedSectionId:', sectionId);

    if (!sectionId || Number.isNaN(sectionId)) {
      return res.status(400).json({ message: 'sectionId is required and must be a number' });
    }
    // Verify user has access to this section
    const [userSections] = await pool.query(
      'SELECT section_id FROM user_sections WHERE user_id = ? AND section_id = ?',
      [req.user.id, sectionId]
    );

    if (userSections.length === 0) {
      return res.status(403).json({ message: 'Access denied to this section' });
    }

    const [videos] = await pool.query(
      `SELECT v.id, v.title, v.section_id, v.s3_key, v.s3_url, v.created_at,
       s.name as section_name
       FROM videos v
       JOIN sections s ON v.section_id = s.id
       WHERE v.section_id = ?
       ORDER BY v.created_at DESC`,
      [sectionId]
    );

    console.log(`section ${sectionId}`);
    // Generate signed URLs
    const videosWithUrls = await Promise.all(
      videos.map(async (video) => {
        try {
          const signedUrl = await getSignedUrl(video.s3_key || video.s3_url);
          return {
            ...video,
            videoUrl: signedUrl
          };
        } catch (error) {
          console.error(`Error generating signed URL for video ${video.id}:`, error);
          return {
            ...video,
            videoUrl: null,
            error: 'Failed to generate video URL'
          };
        }
      })
    );

    res.json({ videos: videosWithUrls });
  } catch (error) {
    console.error('Get section videos error:', error);
    res.status(500).json({ message: 'Failed to get section videos' });
  }
});

module.exports = router;
