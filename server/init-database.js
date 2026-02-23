const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || '',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || ''
};

const DB_NAME = process.env.DB_NAME || 'luminafly';

const KAZAN_EMBANKMENT = {
  center: { lat: 55.7963, lon: 49.1064 },
  poles: [
    { lat: 55.7965, lon: 49.1045, name: 'Столб #1 - Кремлёвская набережная' },
    { lat: 55.7968, lon: 49.1052, name: 'Столб #2 - Кремлёвская набережная' },
    { lat: 55.7970, lon: 49.1058, name: 'Столб #3 - Кремлёвская набережная' },
    { lat: 55.7972, lon: 49.1065, name: 'Столб #4 - Кремлёвская набережная' },
    { lat: 55.7975, lon: 49.1072, name: 'Столб #5 - Кремлёвская набережная' },
    { lat: 55.7978, lon: 49.1080, name: 'Столб #6 - Кремлёвская набережная' },
    { lat: 55.7980, lon: 49.1088, name: 'Столб #7 - Кремлёвская набережная' },
    { lat: 55.7982, lon: 49.1095, name: 'Столб #8 - Кремлёвская набережная' },
    { lat: 55.7958, lon: 49.1070, name: 'Столб #9 - ул. Московская' },
    { lat: 55.7955, lon: 49.1078, name: 'Столб #10 - ул. Московская' },
    { lat: 55.7952, lon: 49.1085, name: 'Столб #11 - ул. Московская' },
    { lat: 55.7950, lon: 49.1092, name: 'Столб #12 - ул. Московская' },
    { lat: 55.7948, lon: 49.1100, name: 'Столб #13 - ул. Московская' },
    { lat: 55.7945, lon: 49.1108, name: 'Столб #14 - ул. Московская' },
    { lat: 55.7942, lon: 49.1115, name: 'Столб #15 - ул. Московская' }
  ],
  bases: [
    { lat: 55.7985, lon: 49.1050, name: 'База #1 - Кремлёвская', capacity: 20 },
    { lat: 55.7940, lon: 49.1120, name: 'База #2 - Московская', capacity: 15 },
    { lat: 55.7960, lon: 49.1110, name: 'База #3 - Центральная', capacity: 15 }
  ]
};

async function initDatabase() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL server');
    
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`Database ${DB_NAME} created/verified`);
    
    await connection.query(`USE ${DB_NAME}`);
    
    console.log('Creating tables...');
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        role ENUM('admin', 'operator', 'viewer') DEFAULT 'operator',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS bases (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        lat DECIMAL(10, 8) NOT NULL,
        lon DECIMAL(11, 8) NOT NULL,
        capacity INT DEFAULT 20,
        current_drones INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS poles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        lat DECIMAL(10, 8) NOT NULL,
        lon DECIMAL(11, 8) NOT NULL,
        drone_id INT NULL,
        lamp_status ENUM('working', 'burned_out', 'offline') DEFAULT 'working',
        brightness INT DEFAULT 100,
        last_maintenance TIMESTAMP NULL,
        installation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS drones (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50) NOT NULL,
        serial_number VARCHAR(50) UNIQUE NOT NULL,
        status ENUM('active', 'flying', 'maintenance', 'inactive', 'charging') DEFAULT 'active',
        lamp_status ENUM('working', 'burned_out') DEFAULT 'working',
        battery_level INT DEFAULT 100,
        flight_time INT DEFAULT 0,
        current_lat DECIMAL(10, 8),
        current_lon DECIMAL(11, 8),
        current_base_id INT,
        current_pole_id INT,
        total_missions INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS missions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        drone_id INT NOT NULL,
        pole_id INT,
        from_base_id INT,
        to_base_id INT,
        from_pole_id INT,
        to_pole_id INT,
        type ENUM('replacement', 'return', 'inspection', 'emergency') DEFAULT 'replacement',
        status ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
        started_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (drone_id) REFERENCES drones(id) ON DELETE CASCADE,
        FOREIGN KEY (pole_id) REFERENCES poles(id) ON DELETE SET NULL,
        FOREIGN KEY (from_base_id) REFERENCES bases(id) ON DELETE SET NULL,
        FOREIGN KEY (to_base_id) REFERENCES bases(id) ON DELETE SET NULL
      )
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        drone_id INT,
        pole_id INT,
        event_type VARCHAR(50) NOT NULL,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (drone_id) REFERENCES drones(id) ON DELETE SET NULL,
        FOREIGN KEY (pole_id) REFERENCES poles(id) ON DELETE SET NULL
      )
    `);
    
    console.log('Tables created successfully');
    
    const [userRows] = await connection.execute('SELECT COUNT(*) as count FROM users');
    
    if (userRows[0].count === 0) {
      console.log('Inserting initial data...');
      
      await connection.execute(`
        INSERT INTO users (username, password, email, role) VALUES 
        ('admin', 'admin123', 'admin@luminafly.ru', 'admin'),
        ('operator', 'operator123', 'operator@luminafly.ru', 'operator'),
        ('viewer', 'viewer123', 'viewer@luminafly.ru', 'viewer')
      `);
      console.log('Users created');
      
      for (const base of KAZAN_EMBANKMENT.bases) {
        await connection.execute(`
          INSERT INTO bases (name, lat, lon, capacity, current_drones) 
          VALUES (?, ?, ?, ?, ?)
        `, [base.name, base.lat, base.lon, base.capacity, 5]);
      }
      console.log('Bases created');
      
      const [baseRows] = await connection.execute('SELECT id FROM bases');
      const baseIds = baseRows.map(b => b.id);
      
      const droneNames = [
        'Firefly-Alpha', 'Firefly-Beta', 'Firefly-Gamma', 'Firefly-Delta', 'Firefly-Epsilon',
        'Lumina-1', 'Lumina-2', 'Lumina-3', 'Lumina-4', 'Lumina-5',
        'Glow-X1', 'Glow-X2', 'Glow-X3', 'Glow-X4', 'Glow-X5',
        'Beam-Pro-1', 'Beam-Pro-2', 'Beam-Pro-3', 'Beam-Pro-4', 'Beam-Pro-5'
      ];
      
      for (let i = 0; i < droneNames.length; i++) {
        const baseId = baseIds[i % baseIds.length];
        const [baseData] = await connection.execute('SELECT lat, lon FROM bases WHERE id = ?', [baseId]);
        
        const latOffset = (Math.random() - 0.5) * 0.001;
      const lonOffset = (Math.random() - 0.5) * 0.001;
      const droneLat = parseFloat(baseData[0].lat) + latOffset;
      const droneLon = parseFloat(baseData[0].lon) + lonOffset;
      
      await connection.execute(`
          INSERT INTO drones (name, serial_number, status, battery_level, current_lat, current_lon, current_base_id, total_missions) 
          VALUES (?, ?, 'active', 100, ?, ?, ?, ?)
        `, [
          droneNames[i], 
          `LF-${2024}-${String(i + 1).padStart(4, '0')}`,
          droneLat,
          droneLon,
          baseId,
          Math.floor(Math.random() * 50)
        ]);
      }
      console.log('Drones created');
      
      const [droneRows] = await connection.execute('SELECT id FROM drones WHERE status = "active" LIMIT 15');
      const droneIds = droneRows.map(d => d.id);
      
      for (let i = 0; i < KAZAN_EMBANKMENT.poles.length; i++) {
        const pole = KAZAN_EMBANKMENT.poles[i];
        const droneId = i < droneIds.length ? droneIds[i] : null;
        
        await connection.execute(`
          INSERT INTO poles (name, lat, lon, drone_id, lamp_status, brightness, last_maintenance) 
          VALUES (?, ?, ?, ?, 'working', 100, NOW())
        `, [pole.name, pole.lat, pole.lon, droneId]);
        
        if (droneId) {
          await connection.execute(`
            UPDATE drones SET current_lat = ?, current_lon = ?, current_pole_id = ?, current_base_id = NULL WHERE id = ?
          `, [pole.lat, pole.lon, i + 1, droneId]);
        }
      }
      console.log('Poles created');
      
      await connection.execute(`
        INSERT INTO missions (drone_id, pole_id, from_base_id, to_pole_id, type, status, completed_at) 
        SELECT 
          d.id as drone_id,
          p.id as pole_id,
          b.id as from_base_id,
          p.id as to_pole_id,
          'replacement' as type,
          'completed' as status,
          DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 7) DAY) as completed_at
        FROM drones d
        JOIN poles p ON p.drone_id = d.id
        JOIN bases b ON b.id = 1
        LIMIT 10
      `);
      console.log('Sample missions created');
      
      console.log('\n✅ Database initialized successfully!');
      console.log('\nLogin credentials:');
      console.log('  Admin:    admin / admin123');
    } else {
      console.log('Database already contains data, skipping initialization');
    }
    
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
