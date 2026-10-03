const router = require('express').Router();
const Road = require('../models/Road');

// GET /api/roads - Get all roads for MapView base graph
router.get('/', async (req, res) => {
  try {
    const roads = await Road.find().populate('incident_ref');
    res.json(roads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
