const mongoose = require('mongoose');

const dispatchLogSchema = new mongoose.Schema({
  ambulance_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance', required: true },
  incident_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', default: null },
  origin_node: { type: String, required: true },
  destination_node: { type: String, required: true },
  route_taken: [{ type: String }],          // ordered list of node ids
  eta_min: { type: Number, required: true },  // algorithm estimate
  dispatch_time: { type: Date, default: Date.now },
  arrival_time: { type: Date, default: null },
  actual_response_sec: { type: Number, default: null }, // calculated in seconds
  eta_accuracy_pct: { type: Number, default: null },    // |actual - eta| / eta * 100
  closed_roads_encountered: { type: Number, default: 0 },
  traffic_delay_min: { type: Number, default: null },   // (actual_sec - eta_sec) / 60
  operator_id: { type: String, default: 'unknown' },
  notes: { type: String, default: '' }
});

module.exports = mongoose.model('DispatchLog', dispatchLogSchema);
