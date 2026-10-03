const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  type: { 
    type: String, 
    enum: ['accident', 'fire', 'flood', 'road_closure'], 
    required: true 
  },
  severity: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    required: true 
  },
  road_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Road' }],
  status: { 
    type: String, 
    enum: ['active', 'resolved'], 
    default: 'active' 
  },
  reported_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Incident', incidentSchema);
