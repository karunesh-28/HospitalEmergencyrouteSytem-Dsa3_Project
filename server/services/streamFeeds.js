const Road      = require('../models/Road');
const Incident  = require('../models/Incident');
const Ambulance = require('../models/Ambulance');

module.exports = function startFeeds(broadcast) {

  // Feed 1 — Traffic congestion update (every 15 s)
  setInterval(async () => {
    try {
      const roads = await Road.find({ is_closed: false });
      for (const r of roads) {
        r.congestion = parseFloat((Math.random() * 0.6).toFixed(2));
        await r.save();
      }
      broadcast('traffic_update', { updated: roads.length, ts: Date.now() });
    } catch (err) {
      console.error('Error updating traffic feed:', err.message);
    }
  }, 15_000);

  // Feed 2 — Incident alert (every 15 s for quicker UI demo updates)
  setInterval(async () => {
    try {
      const active = await Incident.find({ status: 'active' }).populate('road_ids');
      broadcast('incident_feed', active);
    } catch (err) {
      console.error('Error streaming incident feed:', err.message);
    }
  }, 15_000);

  // Feed 3 — Ambulance GPS ping (every 5 s)
  setInterval(async () => {
    try {
      const units = await Ambulance.find();
      // Let's also simulate minor position noise or movement if dispatched
      for (const unit of units) {
        if (unit.status === 'dispatched') {
          // Add small random perturbation to simulate movement
          unit.location.lat += (Math.random() - 0.5) * 0.001;
          unit.location.lng += (Math.random() - 0.5) * 0.001;
          await unit.save();
        }
      }
      broadcast('ambulance_positions', units.map(a => ({
        id: a._id,
        callsign: a.callsign,
        location: a.location,
        status: a.status,
        current_node: a.current_node
      })));
    } catch (err) {
      console.error('Error streaming ambulance positions:', err.message);
    }
  }, 5_000);
};
