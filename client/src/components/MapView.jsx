import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { getRoads } from '../services/api';

// Geolocation of nodes (must match seed.js nodeLocations)
export const nodeLocations = {
  'INT_A': [40.7128, -74.0060],
  'INT_B': [40.7188, -74.0060],
  'INT_C': [40.7188, -73.9960],
  'INT_D': [40.7128, -73.9960],
  'HOSP_1': [40.7088, -74.0100],
  'HOSP_2': [40.7228, -74.0100],
  'HOSP_3': [40.7228, -73.9900],
  'HOSP_4': [40.7088, -73.9900]
};

// Custom SVG Icons using Leaflet divIcon
const createAmbulanceIcon = (status, callsign) => {
  const colorClass = status === 'available' ? 'pulse-ambulance-available' : 'pulse-ambulance-dispatched';
  return L.divIcon({
    className: 'custom-ambulance-icon',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div class="pulse-marker ${colorClass}" style="width: 14px; height: 14px; border: 2px solid white;"></div>
        <div style="background: rgba(0,0,0,0.85); color: #fff; font-size: 9px; padding: 2px 4px; border-radius: 4px; font-weight: bold; border: 1px solid rgba(255,255,255,0.2); white-space: nowrap; margin-top: 4px; font-family: 'JetBrains Mono';">
          🚑 ${callsign}
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 7]
  });
};

const createIncidentIcon = (severity, title) => {
  const pulseColor = severity === 'critical' ? '#ef4444' : severity === 'high' ? '#f97316' : '#eab308';
  return L.divIcon({
    className: 'custom-incident-icon',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div class="pulse-marker" style="background-color: ${pulseColor}; width: 16px; height: 16px; border: 2px solid white; box-shadow: 0 0 10px ${pulseColor};"></div>
        <div style="background: rgba(15, 17, 23, 0.9); color: #f3f4f6; font-size: 8px; padding: 1px 4px; border-radius: 4px; white-space: nowrap; border: 1px solid ${pulseColor}; margin-top: 4px;">
          ⚠️ ${title.split(' ')[0]}
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 8]
  });
};

const createHospitalIcon = (name) => {
  return L.divIcon({
    className: 'custom-hospital-icon',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="background: #10b981; color: white; width: 20px; height: 20px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; border: 1.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
          H
        </div>
        <div style="background: rgba(0,0,0,0.85); color: #10b981; font-size: 9px; padding: 1px 3px; border-radius: 3px; border: 1px solid #10b981; white-space: nowrap; margin-top: 2px; font-weight: 600;">
          ${name}
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 10]
  });
};

const createIntersectionIcon = (name) => {
  return L.divIcon({
    className: 'custom-intersection-icon',
    html: `
      <div style="width: 8px; height: 8px; background: #6b7280; border: 1.5px solid #fff; border-radius: 50%;"></div>
    `,
    iconSize: [8, 8],
    iconAnchor: [4, 4]
  });
};

export default function MapView({ incidents, ambulances, activeRoute }) {
  const [roads, setRoads] = useState([]);
  
  // Center coordinates of our mock city grid
  const center = [40.7158, -74.0000];

  const fetchBaseGraph = () => {
    getRoads()
      .then(setRoads)
      .catch(err => console.error('Failed to load base road network:', err));
  };

  useEffect(() => {
    fetchBaseGraph();
    // Refresh roads every 15s to match traffic update intervals
    const interval = setInterval(fetchBaseGraph, 15000);
    return () => clearInterval(interval);
  }, []);

  // Helper to determine road polyline styling
  const getRoadStyle = (road) => {
    if (road.is_closed) {
      return { color: '#ef4444', dashArray: '5, 8', weight: 4, opacity: 0.8 };
    }
    // Color-code based on congestion level
    const cong = road.congestion || 0;
    if (cong > 0.4) {
      return { color: '#f59e0b', weight: 3.5, opacity: 0.75 }; // High traffic
    } else if (cong > 0.15) {
      return { color: '#3b82f6', weight: 3, opacity: 0.65 }; // Moderate traffic
    }
    return { color: '#6b7280', weight: 2.5, opacity: 0.5 }; // Normal traffic
  };

  // Convert active route nodes path to LatLng points array
  const activeRoutePoints = activeRoute && activeRoute.path
    ? activeRoute.path.map(nodeId => nodeLocations[nodeId]).filter(Boolean)
    : [];

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={14.5}
        zoomControl={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Base Road Network layer */}
        {roads.map((road) => {
          const fromLoc = nodeLocations[road.from];
          const toLoc = nodeLocations[road.to];
          if (!fromLoc || !toLoc) return null;
          
          return (
            <Polyline
              key={road._id}
              positions={[fromLoc, toLoc]}
              pathOptions={getRoadStyle(road)}
            >
              <Popup>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px' }}>
                  <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>Road Segment</p>
                  <p>From: <strong>{road.from}</strong></p>
                  <p>To: <strong>{road.to}</strong></p>
                  <p>Distance: {road.distance_km} km</p>
                  <p>Speed Limit: {road.speed_kmh} km/h</p>
                  <p>Congestion: {(road.congestion * 100).toFixed(0)}%</p>
                  <p style={{ color: road.is_closed ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                    {road.is_closed ? '🛑 CLOSED' : '✅ OPEN'}
                  </p>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Active Route Highlight layer */}
        {activeRoutePoints.length > 0 && (
          <>
            {/* Outer neon glow */}
            <Polyline
              positions={activeRoutePoints}
              pathOptions={{ color: '#3b82f6', weight: 10, opacity: 0.35 }}
            />
            {/* Inner solid path */}
            <Polyline
              positions={activeRoutePoints}
              pathOptions={{ color: '#60a5fa', weight: 4.5, opacity: 0.95 }}
            />
          </>
        )}

        {/* Render Grid Node markers */}
        {Object.entries(nodeLocations).map(([nodeId, pos]) => {
          const isHospital = nodeId.startsWith('HOSP');
          const icon = isHospital ? createHospitalIcon(nodeId) : createIntersectionIcon(nodeId);
          return (
            <Marker key={nodeId} position={pos} icon={icon} zIndexOffset={isHospital ? 500 : 100}>
              <Popup>
                <div style={{ fontSize: '11px' }}>
                  <strong>{nodeId}</strong>
                  <br />
                  Lat: {pos[0]}, Lng: {pos[1]}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Active Incidents */}
        {incidents.map((incident) => {
          if (!incident.location) return null;
          return (
            <Marker
              key={incident._id}
              position={[incident.location.lat, incident.location.lng]}
              icon={createIncidentIcon(incident.severity, incident.title)}
              zIndexOffset={1000}
            >
              <Popup>
                <div style={{ minWidth: '150px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className={`badge badge-${incident.severity}`}>{incident.severity}</span>
                    <span style={{ fontSize: '10px', color: '#9ca3af' }}>Incident</span>
                  </div>
                  <h4 style={{ fontSize: '13px', margin: '0 0 6px 0', color: '#f3f4f6' }}>{incident.title}</h4>
                  <p style={{ fontSize: '11px', margin: '0 0 4px 0', color: '#9ca3af' }}>Type: {incident.type}</p>
                  <p style={{ fontSize: '11px', margin: 0, color: '#9ca3af' }}>Status: <strong style={{ color: '#ef4444' }}>{incident.status}</strong></p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Ambulances */}
        {ambulances.map((amb) => {
          if (!amb.location) return null;
          return (
            <Marker
              key={amb.id || amb._id}
              position={[amb.location.lat, amb.location.lng]}
              icon={createAmbulanceIcon(amb.status, amb.callsign)}
              zIndexOffset={2000}
            >
              <Popup>
                <div style={{ minWidth: '130px' }}>
                  <h4 style={{ fontSize: '13px', margin: '0 0 4px 0', color: '#f3f4f6' }}>{amb.callsign}</h4>
                  <p style={{ fontSize: '11px', margin: '0 0 2px 0' }}>Status: 
                    <span style={{ marginLeft: '4px', fontWeight: 'bold', color: amb.status === 'available' ? '#10b981' : '#3b82f6' }}>
                      {amb.status.toUpperCase()}
                    </span>
                  </p>
                  <p style={{ fontSize: '11px', margin: 0, color: '#9ca3af' }}>Current Node: <strong>{amb.current_node}</strong></p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
