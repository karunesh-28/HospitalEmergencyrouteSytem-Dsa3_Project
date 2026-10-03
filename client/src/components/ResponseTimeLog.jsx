import { useState, useEffect } from 'react';
import { getLogs, getAmbulances } from '../services/api';
import { Table, Calendar, Filter, FileSpreadsheet, ShieldAlert, CheckCircle, HelpCircle } from 'lucide-react';

export default function ResponseTimeLog() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ avgResponse: 0, avgAccuracy: 0, total: 0 });
  const [ambulances, setAmbulances] = useState([]);

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedAmbulance, setSelectedAmbulance] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');

  const fetchLogs = async () => {
    try {
      const data = await getLogs({
        from: fromDate || undefined,
        to: toDate || undefined,
        ambulance_id: selectedAmbulance || undefined,
        severity: selectedSeverity || undefined
      });
      setLogs(data.logs);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load response logs:', err);
    }
  };

  const loadAmbulances = async () => {
    try {
      const list = await getAmbulances();
      setAmbulances(list);
    } catch (err) {
      console.error('Failed to load ambulances for log filter:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    loadAmbulances();
  }, [fromDate, toDate, selectedAmbulance, selectedSeverity]);

  // Handle live updates on new dispatch/arrival events
  useEffect(() => {
    const handleBroadcastRefresh = () => {
      fetchLogs();
    };
    
    // We listen indirectly by polling or custom events if needed, but since we update on interval
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fromDate, toDate, selectedAmbulance, selectedSeverity]);

  // Export to CSV helper
  const handleExportCSV = () => {
    if (logs.length === 0) return;
    
    const headers = [
      'Dispatch Time',
      'Ambulance',
      'Incident',
      'Severity',
      'ETA (min)',
      'Actual Response (sec)',
      'Delay (min)',
      'ETA Accuracy %',
      'Closed Roads Encountered',
      'Operator'
    ];

    const rows = logs.map(l => [
      new Date(l.dispatch_time).toLocaleString(),
      l.ambulance_id?.callsign || 'N/A',
      l.incident_id?.title || 'Manual Dispatch',
      l.incident_id?.severity || 'N/A',
      l.eta_min ? l.eta_min.toFixed(2) : '0',
      l.actual_response_sec !== null ? l.actual_response_sec.toFixed(1) : 'En Route',
      l.traffic_delay_min !== null ? l.traffic_delay_min.toFixed(2) : 'En Route',
      l.eta_accuracy_pct !== null ? l.eta_accuracy_pct.toFixed(1) + '%' : 'N/A',
      l.closed_roads_encountered,
      l.operator_id
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ambulance_response_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Row color helper
  const getRowStyle = (log) => {
    if (log.actual_response_sec === null) {
      return { borderLeft: '3px solid var(--accent-blue)', background: 'rgba(59, 130, 246, 0.02)' };
    }
    
    const actual_min = log.actual_response_sec / 60;
    const eta = log.eta_min;
    
    if (actual_min <= eta) {
      return { borderLeft: '3px solid var(--accent-green)', background: 'rgba(16, 185, 129, 0.02)' };
    } else if (actual_min <= eta * 1.2) {
      return { borderLeft: '3px solid var(--accent-orange)', background: 'rgba(245, 158, 11, 0.02)' };
    } else {
      return { borderLeft: '3px solid var(--accent-red)', background: 'rgba(239, 68, 68, 0.02)' };
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: '1.5', overflow: 'hidden' }}>
      
      {/* Header and Export */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Table style={{ color: 'var(--accent-blue)', width: '20px', height: '20px' }} />
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Response Time Analysis Log</h2>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={logs.length === 0}
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', opacity: logs.length === 0 ? 0.5 : 1 }}
        >
          <FileSpreadsheet style={{ width: '14px', height: '14px', color: 'var(--accent-green)' }} />
          Export CSV
        </button>
      </div>

      {/* Aggregate Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <div className="glass-panel" style={{ padding: '10px', borderRadius: '8px', textAlign: 'center', background: 'rgba(18, 20, 26, 0.5)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Avg Response Time</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-blue)', fontFamily: 'var(--font-display)' }}>
            {stats.avgResponse ? `${stats.avgResponse.toFixed(1)}s` : '0s'}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '10px', borderRadius: '8px', textAlign: 'center', background: 'rgba(18, 20, 26, 0.5)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Avg ETA Accuracy</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-green)', fontFamily: 'var(--font-display)' }}>
            {stats.avgAccuracy ? `${(100 - stats.avgAccuracy).toFixed(1)}%` : '100%'}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '10px', borderRadius: '8px', textAlign: 'center', background: 'rgba(18, 20, 26, 0.5)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Total Dispatches</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {stats.total}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel" style={{ padding: '10px', borderRadius: '6px', marginBottom: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px', fontSize: '0.75rem', background: 'rgba(18, 20, 26, 0.3)' }}>
        <div>
          <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '3px' }}>Ambulance</label>
          <select 
            value={selectedAmbulance}
            onChange={(e) => setSelectedAmbulance(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '4px', borderRadius: '4px', outline: 'none' }}
          >
            <option value="">All Units</option>
            {ambulances.map(a => (
              <option key={a._id} value={a._id}>{a.callsign}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '3px' }}>Severity</label>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '4px', borderRadius: '4px', outline: 'none' }}
          >
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '3px' }}>From Date</label>
          <input 
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '3px', borderRadius: '4px', outline: 'none' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '3px' }}>To Date</label>
          <input 
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '3px', borderRadius: '4px', outline: 'none' }}
          />
        </div>
      </div>

      {/* Logs Table */}
      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 1, color: 'var(--text-secondary)' }}>
              <th style={{ padding: '8px 10px' }}>Dispatch</th>
              <th style={{ padding: '8px 10px' }}>Unit</th>
              <th style={{ padding: '8px 10px' }}>Incident</th>
              <th style={{ padding: '8px 10px' }}>Severity</th>
              <th style={{ padding: '8px 10px' }}>ETA</th>
              <th style={{ padding: '8px 10px' }}>Actual</th>
              <th style={{ padding: '8px 10px' }}>Dev</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No logs found.</td>
              </tr>
            ) : (
              logs.map((log) => {
                const response_sec = log.actual_response_sec;
                const response_display = response_sec !== null ? `${response_sec.toFixed(1)}s` : 'En Route';
                const dev_display = log.traffic_delay_min !== null 
                  ? `${log.traffic_delay_min >= 0 ? '+' : ''}${(log.traffic_delay_min * 60).toFixed(0)}s` 
                  : '-';
                  
                return (
                  <tr 
                    key={log._id} 
                    style={{ ...getRowStyle(log), borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                    className="log-row"
                  >
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                      {new Date(log.dispatch_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>{log.ambulance_id?.callsign || 'N/A'}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-primary)' }}>{log.incident_id?.title || 'Manual Route'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      {log.incident_id?.severity ? (
                        <span className={`badge badge-${log.incident_id.severity}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                          {log.incident_id.severity}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)' }}>{log.eta_min ? `${log.eta_min.toFixed(1)}m` : '0m'}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{response_display}</td>
                    <td style={{ 
                      padding: '8px 10px', 
                      fontFamily: 'var(--font-mono)',
                      color: log.traffic_delay_min > 0 ? 'var(--accent-red)' : log.traffic_delay_min < 0 ? 'var(--accent-green)' : 'var(--text-secondary)'
                    }}>
                      {dev_display}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
