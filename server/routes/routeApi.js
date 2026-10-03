const router      = require('express').Router();
const { findRoute } = require('../services/pathfinder');
const DispatchLog = require('../models/DispatchLog');
const Ambulance   = require('../models/Ambulance');

// POST /api/route/dispatch
// Body: { ambulance_id, origin_node, destination_node, incident_id }
router.post('/dispatch', async (req, res) => {
  try {
    const { ambulance_id, origin_node, destination_node, incident_id } = req.body;
    
    // Find the route using the C++ binary
    const result = await findRoute(origin_node, destination_node);

    // Create a log entry
    const log = await DispatchLog.create({
      ambulance_id,
      incident_id: incident_id || null,
      origin_node,
      destination_node,
      route_taken: result.path,
      eta_min: result.eta_min,
      dispatch_time: new Date(),
      closed_roads_encountered: result.closed_skipped,
      operator_id: req.headers['x-operator-id'] || 'unknown'
    });

    // Update ambulance status and current node
    await Ambulance.findByIdAndUpdate(ambulance_id, { 
      status: 'dispatched',
      current_node: origin_node 
    });

    // Broadcast the dispatch event
    const broadcast = req.app.get('broadcast');
    if (broadcast) {
      broadcast('dispatch', { log, route: result });
    }

    res.json({ log, route: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/route/arrive/:logId  — mark arrival, compute actual response time
router.patch('/arrive/:logId', async (req, res) => {
  try {
    const arrival_time = new Date();
    const log = await DispatchLog.findById(req.params.logId);
    if (!log) {
      return res.status(404).json({ error: 'Dispatch log not found' });
    }

    const actual_sec = (arrival_time - log.dispatch_time) / 1000;
    const eta_sec    = log.eta_min * 60;
    
    log.arrival_time = arrival_time;
    log.actual_response_sec = actual_sec;
    log.traffic_delay_min = (actual_sec - eta_sec) / 60;
    log.eta_accuracy_pct = eta_sec > 0 ? (Math.abs(actual_sec - eta_sec) / eta_sec) * 100 : 0;
    await log.save();

    // Mark ambulance as available/returning
    await Ambulance.findByIdAndUpdate(log.ambulance_id, { 
      status: 'available', // Let's set to 'available' or 'returning'
      current_node: log.destination_node 
    });

    // Broadcast update
    const broadcast = req.app.get('broadcast');
    if (broadcast) {
      broadcast('arrival', { logId: log._id, actual_response_sec: actual_sec });
    }

    res.json({ ok: true, log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
