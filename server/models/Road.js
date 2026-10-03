const mongoose = require('mongoose');

const roadSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  distance_km: { type: Number, required: true },
  speed_kmh: { type: Number, required: true },
  congestion: { type: Number, default: 0 }, // 0 to 1 multiplier
  is_closed: { type: Boolean, default: false },
  incident_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', default: null }
});

module.exports = mongoose.model('Road', roadSchema);
