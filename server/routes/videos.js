const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { getSignedUrl } = require('../config/s3');

const router = express.Router();

// Get all sections (public for authenticated users)
router.get('/sections', authenticate, async (req, res) => {
  try {
    const pool = db.getPool();
    const [sections] = await pool.query(
      'SELECT id, name, description FROM sections ORDER BY name'
    );

    res.json({ sections });
  } catch (error) {
        console.error('Get sections error:', error);
    res.status(500).json({ message: 'Failed to get sections' });
  }
});

module.exports = router;
