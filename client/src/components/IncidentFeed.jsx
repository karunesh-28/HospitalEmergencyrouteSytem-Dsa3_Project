import { Bell, Flame, Activity, Waves, Ban } from 'lucide-react';

export default function IncidentFeed({ incidents }) {
  const getIcon = (type) => {
    const style = { width: '16px', height: '16px' };
    switch (type) {
      case 'accident': return <Activity style={{ ...style, color: 'var(--accent-orange)' }} />;
      case 'fire': return <Flame style={{ ...style, color: 'var(--accent-red)' }} />;
      case 'flood': return <Waves style={{ ...style, color: 'var(--accent-blue)' }} />;
      case 'road_closure': return <Ban style={{ ...style, color: 'var(--accent-red)' }} />;
      default: return <Bell style={style} />;
    }
  };

  return (
    <div style={{ padding: '16px', flex: '1', display: 'flex', flexDirection: 'column', minHeight: '220px', borderBottom: '1px solid var(--border-color)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell style={{ color: 'var(--accent-red)', width: '20px', height: '20px' }} />
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Active Incident CAD Feed</h2>
        </div>
        <span style={{ fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
          {incidents.filter(i => i.status === 'active').length} ACTIVE
        </span>
      </div>

      <div style={{ display: 'grid', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
        {incidents.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            No active incidents reported.
          </div>
        ) : (
          incidents.map((incident) => (
            <div 
              key={incident._id} 
              className="glass-panel fade-in" 
              style={{ padding: '10px 12px', borderRadius: '6px', background: 'rgba(26, 29, 38, 0.4)', display: 'flex', gap: '10px', alignItems: 'flex-start', borderLeft: `3px solid ${
                incident.severity === 'critical' ? 'var(--accent-red)' : incident.severity === 'high' ? 'var(--accent-red)' : 'var(--accent-orange)'
              }` }}
            >
              <div style={{ background: 'var(--bg-tertiary)', padding: '6px', borderRadius: '4px', marginTop: '2px' }}>
                {getIcon(incident.type)}
              </div>
              <div style={{ flex: 1, display: 'grid', gap: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{incident.title}</h4>
                  <span className={`badge badge-${incident.severity}`} style={{ fontSize: '0.65rem' }}>{incident.severity}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>Location: {incident.location.lat.toFixed(4)}, {incident.location.lng.toFixed(4)}</span>
                  <span>{new Date(incident.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
