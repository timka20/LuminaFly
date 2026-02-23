const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const WebSocket = require('ws');
const http = require('http');
const mysql = require('mysql2/promise');
require('dotenv').config();

const simulation = require('./simulation');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

const JWT_SECRET = 'dgdfgfgd';

const dbConfig = {
  host: process.env.DB_HOST || 'timka20.ru',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'timka20',
  password: process.env.DB_PASSWORD || '', 
  database: process.env.DB_NAME || 'luminafly',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

async function initDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = rows[0];
    
    if (password !== user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/poles', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM poles');
    res.json(rows);
  } catch (error) {
    console.error('Get poles error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/drones', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM drones');
    res.json(rows);
  } catch (error) {
    console.error('Get drones error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/bases', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM bases');
    res.json(rows);
  } catch (error) {
    console.error('Get bases error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/statistics', authenticateToken, async (req, res) => {
  try {
    const [droneStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_drones,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_drones,
        SUM(CASE WHEN status = 'flying' THEN 1 ELSE 0 END) as flying_drones,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_drones,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_drones
      FROM drones
    `);
    
    const [poleStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_poles,
        SUM(CASE WHEN lamp_status = 'working' THEN 1 ELSE 0 END) as working_lamps,
        SUM(CASE WHEN lamp_status = 'burned_out' THEN 1 ELSE 0 END) as burned_out_lamps
      FROM poles
    `);
    
    const [missionStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_missions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_missions
      FROM missions
    `);
    
    res.json({
      drones: droneStats[0],
      poles: poleStats[0],
      missions: missionStats[0]
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/drones/:id/details', authenticateToken, async (req, res) => {
  try {
    const [droneRows] = await pool.execute(
      'SELECT * FROM drones WHERE id = ?',
      [req.params.id]
    );
    
    if (droneRows.length === 0) {
      return res.status(404).json({ error: 'Drone not found' });
    }
    
    const [missionRows] = await pool.execute(
      'SELECT * FROM missions WHERE drone_id = ? ORDER BY created_at DESC LIMIT 10',
      [req.params.id]
    );
    
    res.json({
      drone: droneRows[0],
      missions: missionRows
    });
  } catch (error) {
    console.error('Get drone details error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

const connectedClients = new Set();
const activeMissions = new Map();

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function interpolatePosition(startLat, startLon, endLat, endLon, progress) {
  return {
    lat: startLat + (endLat - startLat) * progress,
    lon: startLon + (endLon - startLon) * progress
  };
}

function broadcast(data) {
  const message = JSON.stringify(data);
  let sentCount = 0;
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sentCount++;
    }
  });
  console.log(`Broadcast [${data.type}]: sent to ${sentCount} clients, data:`, data.data);
}

async function simulateDroneFlight(missionId, droneId, fromLat, fromLon, toLat, toLon, targetPoleId = null) {
  const duration = 10000; 
  const steps = 50;
  const stepDuration = duration / steps;
  
  fromLat = parseFloat(fromLat);
  fromLon = parseFloat(fromLon);
  toLat = parseFloat(toLat);
  toLon = parseFloat(toLon);
  
  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const pos = interpolatePosition(fromLat, fromLon, toLat, toLon, progress);
    
    await pool.execute(
      'UPDATE drones SET current_lat = ?, current_lon = ?, battery_level = GREATEST(0, battery_level - 0.5) WHERE id = ?',
      [pos.lat, pos.lon, droneId]
    );
    
    broadcast({
      type: 'drone_position',
      data: { drone_id: droneId, lat: pos.lat, lon: pos.lon, progress }
    });
    
    await new Promise(resolve => setTimeout(resolve, stepDuration));
  }
  
  if (targetPoleId) {
    await pool.execute(
      'UPDATE poles SET drone_id = ?, lamp_status = "working", last_maintenance = NOW() WHERE id = ?',
      [droneId, targetPoleId]
    );
    
    await pool.execute(
      'UPDATE drones SET status = "active", current_pole_id = ? WHERE id = ?',
      [targetPoleId, droneId]
    );
    
    broadcast({
      type: 'lamp_replaced',
      data: { pole_id: targetPoleId, drone_id: droneId }
    });
  } else {
    await pool.execute(
      'UPDATE drones SET status = "active", current_base_id = 1, current_pole_id = NULL WHERE id = ?',
      [droneId]
    );
    
    setTimeout(async () => {
      await pool.execute(
        'UPDATE drones SET lamp_status = "working", battery_level = 100 WHERE id = ?',
        [droneId]
      );
      
      broadcast({
        type: 'drone_repaired',
        data: { drone_id: droneId }
      });
    }, 5000);
  }
  
  activeMissions.delete(missionId);
}

async function checkAndReplaceLamps() {
  try {
    const [burnedOutPoles] = await pool.execute(
      'SELECT * FROM poles WHERE lamp_status = "burned_out" AND drone_id IS NOT NULL'
    );
    
    for (const pole of burnedOutPoles) {
      const [availableDrones] = await pool.execute(
        'SELECT * FROM drones WHERE status = "active" AND lamp_status = "working" AND current_base_id IS NOT NULL LIMIT 1'
      );
      
      if (availableDrones.length > 0) {
        const drone = availableDrones[0];
        
        const [missionResult] = await pool.execute(
          'INSERT INTO missions (drone_id, pole_id, from_base_id, to_pole_id, status, type) VALUES (?, ?, ?, ?, "in_progress", "replacement")',
          [drone.id, pole.id, drone.current_base_id, pole.id]
        );
        
        const missionId = missionResult.insertId;
        activeMissions.set(missionId, { drone_id: drone.id, pole_id: pole.id });
        
        await pool.execute(
          'UPDATE drones SET status = "flying" WHERE id = ?',
          [drone.id]
        );
        
        simulateDroneFlight(missionId, drone.id, drone.current_lat, drone.current_lon, pole.lat, pole.lon, pole.id);
        
        const [oldDroneRows] = await pool.execute(
          'SELECT * FROM drones WHERE id = ?',
          [pole.drone_id]
        );
        
        if (oldDroneRows.length > 0) {
          const oldDrone = oldDroneRows[0];
          
          const [bases] = await pool.execute('SELECT * FROM bases ORDER BY id LIMIT 1');
          const base = bases[0];
          
          setTimeout(async () => {
            await pool.execute(
              'UPDATE drones SET status = "flying", lamp_status = "burned_out" WHERE id = ?',
              [oldDrone.id]
            );
            
            await pool.execute(
              'UPDATE poles SET drone_id = NULL, lamp_status = "burned_out" WHERE id = ?',
              [pole.id]
            );
            
            const [returnMission] = await pool.execute(
              'INSERT INTO missions (drone_id, from_pole_id, to_base_id, status, type) VALUES (?, ?, ?, "in_progress", "return")',
              [oldDrone.id, pole.id, base.id]
            );
            
            simulateDroneFlight(returnMission.insertId, oldDrone.id, pole.lat, pole.lon, base.lat, base.lon);
          }, 10500);
        }
      }
    }
  } catch (error) {
    console.error('Check and replace error:', error);
  }
}

async function randomLampFailure() {
  try {
    const [workingPoles] = await pool.execute(
      'SELECT * FROM poles WHERE lamp_status = "working" AND drone_id IS NOT NULL'
    );
    
    if (workingPoles.length > 0 && Math.random() < 0.1) { 
      const randomPole = workingPoles[Math.floor(Math.random() * workingPoles.length)];
      
      await pool.execute(
        'UPDATE poles SET lamp_status = "burned_out" WHERE id = ?',
        [randomPole.id]
      );
      
      await pool.execute(
        'UPDATE drones SET lamp_status = "burned_out" WHERE id = ?',
        [randomPole.drone_id]
      );
      
      broadcast({
        type: 'lamp_burned_out',
        data: { pole_id: randomPole.id, drone_id: randomPole.drone_id }
      });
      
      console.log(`Lamp burned out at pole ${randomPole.id}`);
    }
  } catch (error) {
    console.error('Random failure error:', error);
  }
}

wss.on('connection', (ws) => {
  console.log('New WebSocket connection, total clients:', connectedClients.size + 1);
  connectedClients.add(ws);
  
  ws.send(JSON.stringify({ type: 'connected', data: { message: 'WebSocket connected successfully' } }));
  
  ws.on('close', () => {
    connectedClients.delete(ws);
    console.log('WebSocket disconnected, remaining:', connectedClients.size);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

async function patrolFlights() {
  try {
    const [drones] = await pool.execute(
      'SELECT * FROM drones WHERE status = "active" AND current_base_id IS NOT NULL AND battery_level > 30 LIMIT 2'
    );
    
    for (const drone of drones) {
      const [poles] = await pool.execute(
        'SELECT * FROM poles ORDER BY RAND() LIMIT 1'
      );
      
      if (poles.length > 0) {
        const pole = poles[0];
        
        const [missionResult] = await pool.execute(
          'INSERT INTO missions (drone_id, pole_id, from_base_id, to_pole_id, status, type) VALUES (?, ?, ?, ?, "in_progress", "replacement")',
          [drone.id, pole.id, drone.current_base_id, pole.id]
        );
        
        const missionId = missionResult.insertId;
        activeMissions.set(missionId, { drone_id: drone.id, pole_id: pole.id });
        
        await pool.execute(
          'UPDATE drones SET status = "flying" WHERE id = ?',
          [drone.id]
        );
        
        await simulateDroneFlight(missionId, drone.id, drone.current_lat, drone.current_lon, pole.lat, pole.lon, pole.id);
        
        setTimeout(async () => {
          const [bases] = await pool.execute('SELECT * FROM bases WHERE id = ?', [drone.current_base_id]);
          if (bases.length > 0) {
            const base = bases[0];
            
            const [returnMission] = await pool.execute(
              'INSERT INTO missions (drone_id, pole_id, from_base_id, to_pole_id, status, type) VALUES (?, ?, ?, ?, "in_progress", "return")',
              [drone.id, pole.id, base.id, base.id]
            );
            
            await pool.execute('UPDATE drones SET status = "flying" WHERE id = ?', [drone.id]);
            await simulateDroneFlight(returnMission.insertId, drone.id, pole.lat, pole.lon, base.lat, base.lon, null);
          }
        }, 3000);
      }
    }
  } catch (error) {
    console.error('Patrol error:', error);
  }
}

app.post('/api/admin/restart-simulation', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    console.log('Restarting simulation via API...');
    simulation.startSimulation();
    res.json({ success: true, message: 'Simulation restarted' });
  } catch (error) {
    console.error('Failed to restart simulation:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/status', authenticateToken, async (req, res) => {
  try {
    const [drones] = await pool.execute('SELECT COUNT(*) as count FROM drones');
    const [active] = await pool.execute('SELECT COUNT(*) as count FROM drones WHERE status = "flying"');
    res.json({ 
      totalDrones: drones[0].count,
      flyingDrones: active[0].count,
      wsClients: connectedClients.size,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

simulation.setClients(connectedClients);

const PORT = process.env.PORT || 27484;

async function start() {
  await initDatabase();
  
  server.listen(PORT, () => {
    console.log(`LuminaFly ${PORT}`);
    console.log(`WebSocket server ready`);
    
    console.log('starting...');
    simulation.startSimulation();
  });
}

start().catch(console.error);
