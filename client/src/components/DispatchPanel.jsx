import { useState, useEffect } from 'react';
import { getAmbulances, getIncidents, dispatchAmbulance, arriveAmbulance } from '../services/api';
import { nodeLocations } from './MapView';
import { Navigation, Bell, CheckCircle, ShieldAlert, Clock } from 'lucide-react';

export default function DispatchPanel({ onDispatched, activeRoute, setActiveRoute }) {
  const [ambulances, setAmbulances] = useState([]);
  const [incidents, setIncidents] = useState([]);
  
  const [selectedAmbulance, setSelectedAmbulance] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [selectedIncident, setSelectedIncident] = useState('');
  const [operatorId, setOperatorId] = useState('OPERATOR_01');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Track ongoing dispatches (stored in local state or fetched from active log)
  const [activeLog, setActiveLog] = useState(null);

  const loadData = async () => {
    try {
      const ambData = await getAmbulances();
      setAmbulances(ambData);
      
      const incData = await getIncidents({ status: 'active' });
      setIncidents(incData.filter(i => i.status === 'active'));
    } catch (err) {
      console.error('Error fetching dispatch form data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Set destination node automatically if an incident is selected
  useEffect(() => {
    if (selectedIncident) {
      const incident = incidents.find(i => i._id === selectedIncident);
      if (incident) {
        // Find closest hospital or node if relevant, or default to some node
        // Let's find nodes and calculate Euclidean distance to find the closest node for destination
        let closestNode = '';
        let minDist = Infinity;
        
        Object.entries(nodeLocations).forEach(([nodeId, coords]) => {
          const latDiff = coords[0] - incident.location.lat;
          const lngDiff = coords[1] - incident.location.lng;
          const dist = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
          if (dist < minDist) {
            minDist = dist;
            closestNode = nodeId;
          }
        });
        
        if (closestNode) {
          setSelectedDestination(closestNode);
        }
      }
    }
  }, [selectedIncident, incidents]);

  const handleCalculateAndDispatch = async (e) => {
    e.preventDefault();
    if (!selectedAmbulance || !selectedDestination) {
      setError('Please select an ambulance and destination node.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    // Find selected ambulance origin node
    const ambulance = ambulances.find(a => a._id === selectedAmbulance);
    if (!ambulance) {
      setError('Selected ambulance not found.');
      setLoading(false);
      return;
    }

    try {
      const response = await dispatchAmbulance({
        ambulance_id: selectedAmbulance,
        origin_node: ambulance.current_node,
        destination_node: selectedDestination,
        incident_id: selectedIncident || undefined
      });
      
      setActiveLog(response.log);
      onDispatched(response.route);
      
      // Reset selections
      setSelectedAmbulance('');
      setSelectedIncident('');
      setSelectedDestination('');
      
      // Refresh options
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Dispatch routing failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkArrived = async () => {
    if (!activeLog) return;
    setLoading(true);
    try {
      await arriveAmbulance(activeLog._id);
      setActiveLog(null);
      setActiveRoute(null);
      loadData();
    } catch (err) {
      setError('Failed to log arrival event.');
    } finally {
      setLoading(false);
    }
  };

  // Filter available units
  const availableAmbulances = ambulances.filter(a => a.status === 'available');

  return (
    <div className="glass-panel" style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Navigation style={{ color: 'var(--accent-blue)', width: '20px', height: '20px' }} />
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Emergency Dispatch Console</h2>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert style={{ width: '16px', height: '16px', flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {activeLog ? (
        <div className="fade-in" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '12px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span className="badge badge-medium" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>Active Run</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <Clock style={{ width: '12px', height: '12px' }} />
              <span>ETA: <strong>{activeLog.eta_min ? activeLog.eta_min.toFixed(1) : '-'} min</strong></span>
            </div>
          </div>
          
          <div style={{ fontSize: '0.85rem', marginBottom: '12px', display: 'grid', gap: '4px', fontFamily: 'var(--font-mono)' }}>
            <div>Unit: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{ambulances.find(a => a._id === activeLog.ambulance_id)?.callsign || 'Ambulance'}</span></div>
            <div>Route: <span style={{ color: 'var(--accent-blue)' }}>{activeLog.route_taken.join(' ➔ ')}</span></div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Encountered closed roads: {activeLog.closed_roads_encountered}</div>
          </div>

          <button
            onClick={handleMarkArrived}
            disabled={loading}
            style={{ width: '100%', background: 'var(--accent-green)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.9rem', transition: 'all 0.2s' }}
          >
            <CheckCircle style={{ width: '16px', height: '16px' }} />
            Mark Ambulance Arrived
          </button>
        </div>
      ) : (
        <form onSubmit={handleCalculateAndDispatch} style={{ display: 'grid', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Operator Call ID</label>
            <input 
              type="text" 
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              placeholder="Operator ID"
              style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Link Incident (Auto-Destination)</label>
            <select
              value={selectedIncident}
              onChange={(e) => setSelectedIncident(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }}
            >
              <option value="">-- Manual Node Selection --</option>
              {incidents.map(inc => (
                <option key={inc._id} value={inc._id}>
                  [{inc.severity.toUpperCase()}] {inc.title}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Ambulance Unit</label>
              <select
                value={selectedAmbulance}
                onChange={(e) => setSelectedAmbulance(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }}
                required
              >
                <option value="">Select unit</option>
                {availableAmbulances.map(a => (
                  <option key={a._id} value={a._id}>
                    {a.callsign} ({a.current_node})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Destination Node</label>
              <select
                value={selectedDestination}
                onChange={(e) => setSelectedDestination(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }}
                required
              >
                <option value="">Select target</option>
                {Object.keys(nodeLocations).map(nodeId => (
                  <option key={nodeId} value={nodeId}>{nodeId}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedAmbulance || !selectedDestination}
            style={{ width: '100%', background: 'var(--accent-blue)', border: 'none', color: 'white', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.9rem', opacity: (loading || !selectedAmbulance || !selectedDestination) ? 0.6 : 1, transition: 'all 0.2s', marginTop: '4px' }}
          >
            {loading ? 'Routing (C++)...' : 'Calculate & Dispatch Route'}
          </button>
        </form>
      )}
    </div>
  );
}
