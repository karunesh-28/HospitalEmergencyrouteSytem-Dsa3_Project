import { useEffect, useState } from 'react';
import MapView         from './components/MapView';
import DispatchPanel   from './components/DispatchPanel';
import IncidentFeed    from './components/IncidentFeed';
import ResponseTimeLog from './components/ResponseTimeLog';
import { connectSocket, closeSocket } from './services/socket';
import { getAmbulances, getIncidents } from './services/api';
import { Shield, Eye } from 'lucide-react';

export default function App() {
  const [incidents,   setIncidents]   = useState([]);
  const [ambulances,  setAmbulances]  = useState([]);
  const [activeRoute, setActiveRoute] = useState(null);

  const fetchInitialData = async () => {
    try {
      const activeIncidents = await getIncidents();
      setIncidents(activeIncidents);
      const activeAmbulances = await getAmbulances();
      setAmbulances(activeAmbulances);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    // Initial fetch to load data immediately
    fetchInitialData();

    // Connect WebSocket
    connectSocket(msg => {
      if (msg.type === 'incident_feed') {
        setIncidents(msg.payload);
      }
      if (msg.type === 'ambulance_positions') {
        setAmbulances(msg.payload);
      }
      if (msg.type === 'dispatch') {
        setActiveRoute(msg.payload.route);
      }
      if (msg.type === 'arrival') {
        setActiveRoute(null);
      }
    });

    return () => {
      closeSocket();
    };
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', height: '100vh', width: '100vw', background: 'var(--bg-primary)' }}>
      {/* Map View Area */}
      <div style={{ position: 'relative', height: '100%' }}>
        {/* Top Floating Brand HUD Header */}
        <div className="glass-panel" style={{ position: 'absolute', top: '16px', left: '50px', zIndex: 1000, padding: '10px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield style={{ color: 'var(--accent-red)', width: '22px', height: '22px' }} />
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
              AETHER DISPATCH SYSTEM
            </h1>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', background: 'var(--accent-green)', borderRadius: '50%' }}></span>
              Real-time C++ routing console active
            </span>
          </div>
        </div>
        
        <MapView incidents={incidents} ambulances={ambulances} activeRoute={activeRoute} />
      </div>

      {/* Control Panel Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'hidden', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)' }}>
        <DispatchPanel onDispatched={setActiveRoute} activeRoute={activeRoute} setActiveRoute={setActiveRoute} />
        
        {/* Inner Scrollable area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <IncidentFeed incidents={incidents} />
          <ResponseTimeLog />
        </div>
      </div>
    </div>
  );
}
