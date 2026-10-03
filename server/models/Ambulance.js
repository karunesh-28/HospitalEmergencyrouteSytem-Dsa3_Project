const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema({
  callsign: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['available', 'dispatched', 'returning'], 
    default: 'available' 
  },
  current_node: { type: String, required: true }, // graph Node ID
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  }
});

module.exports = mongoose.model('Ambulance', ambulanceSchema);
