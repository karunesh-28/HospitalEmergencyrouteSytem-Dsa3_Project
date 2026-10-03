const router = require('express').Router();
const Ambulance = require('../models/Ambulance');

// GET /api/ambulances - Get all ambulances
router.get('/', async (req, res) => {
  try {
    const ambulances = await Ambulance.find();
    res.json(ambulances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
