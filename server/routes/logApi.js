const router = require('express').Router();
const DispatchLog = require('../models/DispatchLog');

// GET /api/logs?from=ISO&to=ISO&ambulance_id=&severity=
router.get('/', async (req, res) => {
  try {
    const { from, to, ambulance_id } = req.query;
    const filter = {};

    if (from || to) {
      filter.dispatch_time = {};
      if (from) filter.dispatch_time.$gte = new Date(from);
      if (to)   filter.dispatch_time.$lte = new Date(to);
    }

    if (ambulance_id) {
      filter.ambulance_id = ambulance_id;
    }

    // Find and populate
    const logs = await DispatchLog.find(filter)
      .populate('ambulance_id')
      .populate('incident_id')
      .sort('-dispatch_time');

    // Filter by severity if requested after population (incident is nested)
    let finalLogs = logs;
    if (req.query.severity) {
      finalLogs = logs.filter(l => l.incident_id && l.incident_id.severity === req.query.severity);
    }

    // Filter to completed runs to get actual response stats
    const completedLogs = finalLogs.filter(l => l.actual_response_sec !== null);

    const avgResponse = completedLogs.length > 0 
      ? completedLogs.reduce((a, l) => a + l.actual_response_sec, 0) / completedLogs.length
      : 0;
      
    const avgAccuracy = completedLogs.length > 0
      ? completedLogs.reduce((a, l) => a + (l.eta_accuracy_pct || 0), 0) / completedLogs.length
      : 0;

    res.json({
      logs: finalLogs,
      stats: {
        avgResponse,
        avgAccuracy,
        total: finalLogs.length
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
