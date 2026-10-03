const { spawn } = require('child_process');
const path      = require('path');
const Road      = require('../models/Road');

// Build graph JSON from DB and call C++ binary
async function findRoute(sourceNode, targetNode) {
  const roads = await Road.find();

  // Collect all unique node ids
  const nodeSet = new Set();
  roads.forEach(r => { 
    nodeSet.add(r.from); 
    nodeSet.add(r.to); 
  });
  const nodes = [...nodeSet].map(id => ({ id, label: id }));

  const edges = roads.map(r => ({
    from: r.from,
    to: r.to,
    distance_km: r.distance_km,
    speed_kmh:   r.speed_kmh,
    congestion:  r.congestion,
    is_closed:   r.is_closed   // C++ skips these
  }));

  const input = JSON.stringify({ nodes, edges, source: sourceNode, target: targetNode });

  return new Promise((resolve, reject) => {
    const bin = path.resolve(__dirname, '../../cpp/dijkstra');
    const proc = spawn(bin);
    let out = '';
    let err = '';
    
    proc.stdout.on('data', d => { out += d.toString(); });
    proc.stderr.on('data', d => { err += d.toString(); });
    
    proc.on('close', code => {
      if (code !== 0) {
        return reject(new Error(`Dijkstra exited with code ${code}. Error: ${err}`));
      }
      try { 
        resolve(JSON.parse(out)); 
      } catch (e) { 
        reject(new Error(`Bad JSON from C++: ${out}. Details: ${e.message}`)); 
      }
    });

    proc.stdin.write(input);
    proc.stdin.end();
  });
}

module.exports = { findRoute };
