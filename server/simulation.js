const mysql = require('mysql2/promise');

let pool;
let connectedClients = new Set();
let activeRepairs = new Map(); 

function setClients(clients) {
  connectedClients = clients;
}

function broadcast(data) {
  const message = JSON.stringify(data);
  connectedClients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

async function initDatabase() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || '',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'luminafly',
    waitForConnections: true,
    connectionLimit: 10
  });
}

async function flyDrone(droneId, fromLat, fromLon, toLat, toLon, duration = 5000) {
  const steps = 100; 
  const stepDuration = duration / steps;
  
  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const lat = parseFloat(fromLat) + (parseFloat(toLat) - parseFloat(fromLat)) * progress;
    const lon = parseFloat(fromLon) + (parseFloat(toLon) - parseFloat(fromLon)) * progress;
    
    await pool.execute(
      'UPDATE drones SET current_lat = ?, current_lon = ? WHERE id = ?',
      [lat.toFixed(6), lon.toFixed(6), droneId]
    );
    
    broadcast({ type: 'drone_position', data: { drone_id: droneId, lat, lon } });
    await new Promise(resolve => setTimeout(resolve, stepDuration));
  }
}

async function repairLamp(pole, newDrone, oldDroneId) {
  try {
    await pool.execute('UPDATE drones SET status = "flying" WHERE id = ?', [newDrone.id]);
    broadcast({ type: 'drone_flying', data: { drone_id: newDrone.id, target: pole.name } });
    
    await flyDrone(newDrone.id, newDrone.current_lat, newDrone.current_lon, pole.lat, pole.lon);
    
    await pool.execute(
      'UPDATE drones SET status = "active", current_pole_id = ?, current_base_id = NULL WHERE id = ?',
      [pole.id, newDrone.id]
    );
    await pool.execute(
      'UPDATE poles SET drone_id = ?, lamp_status = "working" WHERE id = ?',
      [newDrone.id, pole.id]
    );
    
    broadcast({ type: 'lamp_fixed', data: { pole_id: pole.id, pole_name: pole.name, drone_id: newDrone.id } });
    
    if (oldDroneId) {
      (async () => {
        try {
          await pool.execute('UPDATE drones SET status = "flying", current_pole_id = NULL WHERE id = ?', [oldDroneId]);
          
          const [bases] = await pool.execute('SELECT * FROM bases WHERE id = 1');
          const base = bases[0];
          
          await flyDrone(oldDroneId, pole.lat, pole.lon, base.lat, base.lon);
          
          await pool.execute(
            'UPDATE drones SET status = "active", lamp_status = "working", battery_level = 100, current_base_id = 1, current_pole_id = NULL, current_lat = ?, current_lon = ? WHERE id = ?',
            [base.lat, base.lon, oldDroneId]
          );
          broadcast({ type: 'drone_ready', data: { drone_id: oldDroneId } });
          console.log('✓ Drone returned to reserve:', oldDroneId);
        } catch (err) {
          console.error('Error in background drone return:', err.message);
        }
      })();
    }
    
    activeRepairs.delete(pole.id);
    
    broadcast({ 
      type: 'drone_replaced', 
      data: { new_drone_id: newDrone.id, old_drone_id: oldDroneId, pole_id: pole.id, pole_name: pole.name }
    });
    console.log('✓ REPAIRED:', pole.name);
    
  } catch (error) {
    console.error('Repair error:', error.message);
    activeRepairs.delete(pole.id);
  }
}

async function runSimulation() {
  await initDatabase();
  
  await pool.execute('DELETE FROM drones WHERE serial_number LIKE "RSV-%"');
  await pool.execute('UPDATE poles SET drone_id = NULL');
  
  await pool.execute('UPDATE poles SET lamp_status = "working"');
  console.log('=== ALL LAMPS WORKING ===');
  broadcast({ type: 'all_lamps_working' });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const ts = Date.now();
  for (let i = 1; i <= 20; i++) {
    await pool.execute(
      'INSERT INTO drones (name, serial_number, status, lamp_status, battery_level, current_base_id, current_lat, current_lon) VALUES (?, ?, ?, ?, ?, ?, (SELECT lat FROM bases WHERE id = 1), (SELECT lon FROM bases WHERE id = 1))',
      [`Резерв-${i}`, `RSV-${ts}-${i}`, 'active', 'working', 100, 1]
    );
  }
  console.log('Added 20 reserve drones');
  
  const [poles] = await pool.execute('SELECT * FROM poles ORDER BY RAND() LIMIT 4');
  const [drones] = await pool.execute('SELECT * FROM drones WHERE name LIKE "Дрон-Казань%" LIMIT 4');
  
  for (let i = 0; i < poles.length && i < drones.length; i++) {
    await pool.execute('UPDATE drones SET status = "flying" WHERE id = ?', [drones[i].id]);
    await flyDrone(drones[i].id, 55.8040, 49.1170, poles[i].lat, poles[i].lon);
    await pool.execute('UPDATE drones SET status = "active", current_pole_id = ? WHERE id = ?', [poles[i].id, drones[i].id]);
    await pool.execute('UPDATE poles SET drone_id = ? WHERE id = ?', [drones[i].id, poles[i].id]);
  }
  console.log('Initial: 4 drones on poles');
  
  console.log('=== STARTING MAIN CYCLE ===');
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
    
    try {
      const [availableCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM drones WHERE status = "active" AND current_base_id IS NOT NULL'
      );
      console.log(`Available drones in reserve: ${availableCount[0].count}`);
      
      const [workingPoles] = await pool.execute(
        'SELECT p.*, d.id as drone_id FROM poles p JOIN drones d ON p.drone_id = d.id WHERE p.lamp_status = "working" ORDER BY RAND() LIMIT 3'
      );
      
      if (workingPoles.length === 0) {
        console.log('No working poles to burn');
        continue;
      }
      
      console.log(`🔥 Burning ${workingPoles.length} lamps simultaneously`);
      
      for (const pole of workingPoles) {
        await pool.execute('UPDATE poles SET lamp_status = "burned_out" WHERE id = ?', [pole.id]);
        broadcast({ type: 'lamp_burned_out', data: { pole_id: pole.id, pole_name: pole.name } });
        console.log('✗ BURNED:', pole.name);
      }
      
      for (const pole of workingPoles) {
        if (activeRepairs.has(pole.id)) {
          console.log('Already repairing:', pole.name);
          continue;
        }
        
        const [availableDrones] = await pool.execute(
          'SELECT * FROM drones WHERE status = "active" AND current_base_id IS NOT NULL LIMIT 1'
        );
        
        if (availableDrones.length === 0) {
          console.log('❌ No drones available for', pole.name);
          continue;
        }
        
        const newDrone = availableDrones[0];
        const oldDroneId = pole.drone_id;
        
        console.log(`🚁 Starting repair for ${pole.name} with drone ${newDrone.id}`);
        
        activeRepairs.set(pole.id, true);
        
        repairLamp(pole, newDrone, oldDroneId);
      }
      
    } catch (error) {
      console.error('Simulation error:', error.message);
    }
  }
}

module.exports = { startSimulation: runSimulation, setClients };
