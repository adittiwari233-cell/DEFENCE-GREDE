const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all sections
router.get('/', authenticate, async (req, res) => {
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

// Create section (admin only)
router.post('/', authenticate, requireAdmin, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;
    const pool = db.getPool();

    const [rows, meta] = await pool.query(
      'INSERT INTO sections (name, description) VALUES (?, ?)',
      [name, description || null]
    );

    res.status(201).json({
      message: 'Section created successfully',
      section: { id: meta.insertId, name, description }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Section with this name already exists' });
    }
    console.error('Create section error:', error);
    res.status(500).json({ message: 'Failed to create section' });
  }
});

// Update section (admin only)
router.put('/:id', authenticate, requireAdmin, [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description } = req.body;
    const pool = db.getPool();

    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(id);
    await pool.query(
      `UPDATE sections SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Section updated successfully' });
  } catch (error) {
    console.error('Update section error:', error);
    res.status(500).json({ message: 'Failed to update section' });
  }
});

// Delete section (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = db.getPool();

    await pool.query('DELETE FROM sections WHERE id = ?', [id]);
    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    console.error('Delete section error:', error);
    res.status(500).json({ message: 'Failed to delete section' });
  }
});

module.exports = router;
