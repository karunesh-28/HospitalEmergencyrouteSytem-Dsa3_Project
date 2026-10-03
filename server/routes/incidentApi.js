const router = require('express').Router();
const Incident = require('../models/Incident');

// GET /api/incidents - Get all incidents
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const incidents = await Incident.find(filter).populate('road_ids');
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/incidents - Create a new incident
router.post('/', async (req, res) => {
  try {
    const incident = await Incident.create(req.body);
    const populated = await Incident.findById(incident._id).populate('road_ids');
    
    const broadcast = req.app.get('broadcast');
    if (broadcast) {
      const active = await Incident.find({ status: 'active' }).populate('road_ids');
      broadcast('incident_feed', active);
    }
    
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
