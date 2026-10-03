const cluster = require('cluster');
const os      = require('os');

if (cluster.isPrimary) {
  const WORKERS = Math.min(os.cpus().length, 4); // limit to max 4 to not overload locally
  console.log(`Primary ${process.pid}: forking ${WORKERS} workers`);
  
  const lastPing = {};

  for (let i = 0; i < WORKERS; i++) {
    const worker = cluster.fork({ WORKER_INDEX: i });
    lastPing[worker.id] = Date.now();
  }

  cluster.on('fork', (worker) => {
    worker.on('message', msg => { 
      if (msg === 'ping') {
        lastPing[worker.id] = Date.now(); 
      }
    });
  });

  cluster.on('exit', (worker, code, signal) => {
    console.warn(`Worker ${worker.process.pid} (id: ${worker.id}) died (${signal || code}). Restarting…`);
    delete lastPing[worker.id];
    // Find the next available index or reuse the exited one
    // Fork a new worker
    const newWorker = cluster.fork({ WORKER_INDEX: '0' }); // Fallback worker
    lastPing[newWorker.id] = Date.now();
  });

  // Heartbeat monitor
  let lastMonitorTick = Date.now();
  setInterval(() => {
    const now = Date.now();
    // If the monitor tick took more than 20 seconds (expected 10 seconds), the system likely slept.
    // Reset all heartbeat timestamps to prevent killing healthy workers.
    if (now - lastMonitorTick > 20_000) {
      console.log(`System sleep/suspend detected (tick interval: ${now - lastMonitorTick}ms). Resetting pings.`);
      for (const id in lastPing) {
        lastPing[id] = now;
      }
    }
    lastMonitorTick = now;

    for (const [id, ts] of Object.entries(lastPing)) {
      if (now - ts > 15_000) {
        console.error(`Worker ${id} unresponsive for ${now - ts}ms — killing`);
        if (cluster.workers[id]) {
          cluster.workers[id].kill('SIGKILL');
        }
      }
    }
  }, 10_000);

  // Graceful shutdown on Primary SIGTERM
  process.on('SIGTERM', () => {
    console.log('Primary SIGTERM received. Killing all workers...');
    for (const id in cluster.workers) {
      cluster.workers[id].kill('SIGTERM');
    }
    process.exit(0);
  });

} else {
  // Worker: send keepalive every 5 s
  setInterval(() => {
    if (process.send) {
      process.send('ping');
    }
  }, 5_000);

  // Run the Express app
  require('./index.js');
}
