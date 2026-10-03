const mongoose = require('mongoose');
const Road = require('./models/Road');
const Incident = require('./models/Incident');
const Ambulance = require('./models/Ambulance');
const DispatchLog = require('./models/DispatchLog');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospital_routes';

// Node locations (centered around a mock city grid)
const nodeLocations = {
  'INT_A': { lat: 40.7128, lng: -74.0060 },
  'INT_B': { lat: 40.7188, lng: -74.0060 },
  'INT_C': { lat: 40.7188, lng: -73.9960 },
  'INT_D': { lat: 40.7128, lng: -73.9960 },
  'HOSP_1': { lat: 40.7088, lng: -74.0100 },
  'HOSP_2': { lat: 40.7228, lng: -74.0100 },
  'HOSP_3': { lat: 40.7228, lng: -73.9900 },
  'HOSP_4': { lat: 40.7088, lng: -73.9900 }
};

const roadsData = [
  { from:'INT_A', to:'HOSP_1', distance_km:1.2, speed_kmh:50, is_closed:false },
  { from:'INT_A', to:'INT_B',  distance_km:0.8, speed_kmh:30, is_closed:true },  // closed by default
  { from:'INT_B', to:'HOSP_2', distance_km:2.0, speed_kmh:60, is_closed:false },
  { from:'INT_B', to:'INT_C',  distance_km:1.5, speed_kmh:40, is_closed:false },
  { from:'INT_C', to:'HOSP_3', distance_km:0.5, speed_kmh:30, is_closed:false },
  { from:'INT_C', to:'INT_D',  distance_km:3.0, speed_kmh:80, is_closed:false },
  { from:'INT_D', to:'HOSP_4', distance_km:1.0, speed_kmh:50, is_closed:false },
  { from:'INT_A', to:'INT_D',  distance_km:4.5, speed_kmh:90, is_closed:false },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await Road.deleteMany({});
    await Incident.deleteMany({});
    await Ambulance.deleteMany({});
    await DispatchLog.deleteMany({});
    console.log('Cleared existing database entries.');

    // Seed roads
    const seededRoads = await Road.insertMany(roadsData);
    console.log(`Seeded ${seededRoads.length} roads.`);

    // Seed incidents
    // Link the closed road A -> B to the road closure incident
    const closedRoad = seededRoads.find(r => r.from === 'INT_A' && r.to === 'INT_B');
    
    const incidentsData = [
      {
        title: 'Major Traffic Collision',
        location: { lat: 40.7158, lng: -74.0060 }, // between INT_A and INT_B
        type: 'road_closure',
        severity: 'critical',
        road_ids: closedRoad ? [closedRoad._id] : [],
        status: 'active',
        reported_at: new Date()
      },
      {
        title: 'Residential Structure Fire',
        location: { lat: 40.7148, lng: -73.9960 }, // near INT_D
        type: 'fire',
        severity: 'high',
        road_ids: [],
        status: 'active',
        reported_at: new Date(Date.now() - 10 * 60000) // 10 mins ago
      }
    ];
    const seededIncidents = await Incident.insertMany(incidentsData);
    console.log(`Seeded ${seededIncidents.length} incidents.`);

    // Update the closed road's incident reference
    if (closedRoad) {
      closedRoad.incident_ref = seededIncidents[0]._id;
      await closedRoad.save();
    }

    // Seed ambulances
    const ambulancesData = [
      {
        callsign: 'MEDIC-1',
        status: 'available',
        current_node: 'HOSP_1',
        location: nodeLocations['HOSP_1']
      },
      {
        callsign: 'MEDIC-2',
        status: 'available',
        current_node: 'HOSP_2',
        location: nodeLocations['HOSP_2']
      },
      {
        callsign: 'MEDIC-3',
        status: 'available',
        current_node: 'HOSP_3',
        location: nodeLocations['HOSP_3']
      }
    ];
    await Ambulance.insertMany(ambulancesData);
    console.log('Seeded 3 ambulances.');

    console.log('Database seeding complete.');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
module.exports = { nodeLocations }; // Export for frontend integration logic
