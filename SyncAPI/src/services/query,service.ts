
import Device from '../models/device.model';
import influxClient, { createInfluxClientForBucket } from '../lib/influxClient';
import { MongoClient, Db } from 'mongodb';

export async function queryEvents(){
    const sql = `
  WITH data AS (

  -- state: execution
  SELECT 
    s.time,
    s.machine_id,
    'execution' AS event_id,
    s.execution AS event_value,
    'execution' AS event_class
  FROM state s
  WHERE s.time >= now() - interval '24 hour'
    AND s.execution IS NOT NULL

  UNION ALL

  -- state: mode
  SELECT 
    s.time,
    s.machine_id,
    'mode' AS event_id,
    s.mode AS event_value,
    'mode' AS event_class
  FROM state s
  WHERE s.time >= now() - interval '24 hour'
    AND s.mode IS NOT NULL

  UNION ALL

  -- production: op_code
  SELECT 
    p2.time,
    p2.machine_id,
    'op_code' AS event_id,
    p2.op_code AS event_value,
    'op_code' AS event_class
  FROM production p2
  WHERE p2.time >= now() - interval '24 hour'
    AND p2.op_code IS NOT NULL

  UNION ALL

  -- production: piece_id
  SELECT 
    p2.time,
    p2.machine_id,
    'piece_id' AS event_id,
    p2.piece_id AS event_value,
    'piece_id' AS event_class
  FROM production p2
  WHERE p2.time >= now() - interval '24 hour'
    AND p2.piece_id IS NOT NULL

  UNION ALL

  -- production: pieces_produced
  SELECT 
    p2.time,
    p2.machine_id,
    'pieces_produced' AS event_id,
    p2.pieces_produced AS event_value,
    'pieces_produced' AS event_class
  FROM production p2
  WHERE p2.time >= now() - interval '24 hour'
    AND p2.pieces_produced IS NOT NULL

  UNION ALL
  SELECT 
    p2.time,
    p2.machine_id,
    'event_id' AS event_id,
    p2.event_value AS event_value,
    'event_class' AS event_class
  FROM events p2
  WHERE p2.time >= now() - interval '24 hour'
    AND p2.event_value IS NOT NULL

)

SELECT *
FROM data 
ORDER BY data.time DESC
LIMIT 20;
    `;
    
    try {
      console.log('Executing SQL query:', sql);
      console.log('InfluxDB client config check - host and database should be set');
      
      const results = await influxClient.query(sql);
  
      const rows: any[] = [];
  
      for await (const row of results) {
        rows.push(row);
      }
  
      console.log(`Query returned ${rows.length} rows`);
      return rows;
    } catch (error) {
      console.error('Error in queryEventsByMachineId:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }
   
export async function queryDevicesConnected(){
    const sql = `
  SELECT COUNT(*) AS total
FROM (
  SELECT
    machine_id,
    power,
    time,
    ROW_NUMBER() OVER (
      PARTITION BY machine_id
      ORDER BY time DESC
    ) AS rn
  FROM "state"
  WHERE time >= now() - interval '1 day'
    AND power = true
)
WHERE rn = 1;
    `;
    
    try {
      console.log('Executing SQL query:', sql);
      console.log('InfluxDB client config check - host and database should be set');
      
      const results = await influxClient.query(sql);
  
      const rows: any[] = [];
  
      for await (const row of results) {
        rows.push(row);
      }
  
      console.log(`Query returned ${rows.length} rows`);
      return rows;
    } catch (error) {
      console.error('Error in queryEventsByMachineId:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

export async function queryEventsProcessed24h(){
    const sql = `
  WITH data AS (

  -- state: execution
  SELECT 
    s.time,
    'execution' AS event_id,
    s.execution AS event_value,
    'execution' AS event_class
  FROM state s
  WHERE s.time >= now() - interval '24 hour'
    AND s.execution IS NOT NULL

  UNION ALL

  -- state: mode
  SELECT 
    s.time,
    'mode' AS event_id,
    s.mode AS event_value,
    'mode' AS event_class
  FROM state s
  WHERE s.time >= now() - interval '24 hour'
    AND s.mode IS NOT NULL

  UNION ALL

  -- production: op_code
  SELECT 
    p2.time,
    'op_code' AS event_id,
    p2.op_code AS event_value,
    'op_code' AS event_class
  FROM production p2
  WHERE p2.time >= now() - interval '24 hour'
    AND p2.op_code IS NOT NULL

  UNION ALL

  -- production: piece_id
  SELECT 
    p2.time,
    'piece_id' AS event_id,
    p2.piece_id AS event_value,
    'piece_id' AS event_class
  FROM production p2
  WHERE p2.time >= now() - interval '24 hour'
    AND p2.piece_id IS NOT NULL

  UNION ALL

  -- production: pieces_produced
  SELECT 
    p2.time,
    'pieces_produced' AS event_id,
    p2.pieces_produced AS event_value,
    'pieces_produced' AS event_class
  FROM production p2
  WHERE p2.time >= now() - interval '24 hour'
    AND p2.pieces_produced IS NOT NULL

  UNION ALL
  SELECT 
    p2.time,
    'event_id' AS event_id,
    p2.event_value AS event_value,
    'event_class' AS event_class
  FROM events p2
  WHERE p2.time >= now() - interval '24 hour'
    AND p2.event_value IS NOT NULL

)

SELECT COUNT(*)
FROM data 
    `;
    
    try {
      console.log('Executing SQL query:', sql);
      console.log('InfluxDB client config check - host and database should be set');
      
      const results = await influxClient.query(sql);
      console.log('Results:', results);
      const rows: any[] = [];
  
      for await (const row of results) {
        // Convert BigInt values to numbers to avoid serialization issues
        const processedRow: any = {};
        for (const [key, value] of Object.entries(row)) {
          if (typeof value === 'bigint') {
            processedRow[key] = Number(value);
          } else {
            processedRow[key] = value;
          }
        }
        rows.push(processedRow);
      }
  
      console.log(`Query returned ${rows.length} rows`);
      console.log('Processed rows:', JSON.stringify(rows, null, 2));
      return rows;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }
export async function queryEventsProcessed(){
    const sql = `
WITH data AS (

  -- state: execution
  SELECT 
    s.time,
    'execution' AS event_id,
    s.execution AS event_value,
    'execution' AS event_class
  FROM state s
  WHERE  s.execution IS NOT NULL

  UNION ALL

  -- state: mode
  SELECT 
    s.time,
    'mode' AS event_id,
    s.mode AS event_value,
    'mode' AS event_class
  FROM state s
  WHERE s.mode IS NOT NULL

  UNION ALL

  -- production: op_code
  SELECT 
    p2.time,
    'op_code' AS event_id,
    p2.op_code AS event_value,
    'op_code' AS event_class
  FROM production p2
  WHERE p2.op_code IS NOT NULL

  UNION ALL

  -- production: piece_id
  SELECT 
    p2.time,
    'piece_id' AS event_id,
    p2.piece_id AS event_value,
    'piece_id' AS event_class
  FROM production p2
  WHERE p2.piece_id IS NOT NULL

  UNION ALL

  -- production: pieces_produced
  SELECT 
    p2.time,
    'pieces_produced' AS event_id,
    p2.pieces_produced AS event_value,
    'pieces_produced' AS event_class
  FROM production p2
  WHERE p2.pieces_produced IS NOT NULL

  UNION ALL
  SELECT 
    p2.time,
    'event_id' AS event_id,
    p2.event_value AS event_value,
    'event_class' AS event_class
  FROM events p2
  WHERE p2.event_value IS NOT NULL

)

SELECT COUNT(*)
FROM data 
    `;
    
    try {
      console.log('Executing SQL query:', sql);
      console.log('InfluxDB client config check - host and database should be set');
      
      const results = await influxClient.query(sql);
      console.log('Results:', results);
      const rows: any[] = [];
  
      for await (const row of results) {
        // Convert BigInt values to numbers to avoid serialization issues
        const processedRow: any = {};
        for (const [key, value] of Object.entries(row)) {
          if (typeof value === 'bigint') {
            processedRow[key] = Number(value);
          } else {
            processedRow[key] = value;
          }
        }
        rows.push(processedRow);
      }
  
      console.log(`Query returned ${rows.length} rows`);
      console.log('Processed rows:', JSON.stringify(rows, null, 2));
      return rows;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }
/**
 * Estimates the storage used by multiplying the number of processed events by a constant representing GB per event.
 * @returns {Promise<number>} Estimated storage used in GB.
 */
export async function queryStorage(): Promise<number> {
  // This constant represents GB of storage per processed event
  const GB_PER_EVENT = 0.00001; // example: each event ~10KB = 0.00001GB, adjust as needed

  try {
    const rows = await queryEventsProcessed();
    let eventsProcessed = 0;
    
    if (Array.isArray(rows) && rows.length > 0) {
      const row = rows[0];
      // Try different possible field names for COUNT(*)
      const countValue = row['COUNT(*)'] !== undefined ? row['COUNT(*)'] : 
                        (row['count(*)'] !== undefined ? row['count(*)'] :
                        (row.count !== undefined ? row.count :
                        (row.total !== undefined ? row.total :
                        (Object.values(row)[0] !== undefined ? Object.values(row)[0] : 0))));
      
      // Convert to number if needed
      eventsProcessed = typeof countValue === 'bigint' 
        ? Number(countValue)
        : (typeof countValue === 'number' 
          ? countValue 
          : (typeof countValue === 'string' 
            ? parseInt(countValue, 10) || 0 
            : 0));
    }

    const estimatedStorageGB = eventsProcessed * GB_PER_EVENT;
    return estimatedStorageGB;
  } catch (error) {
    console.error('Error estimating storage:', error);
    return 0;
  }
}

/**
 * Fetch the amount of registered devices across all applications in a single MongoDB database.
 * @param {Db} db - The MongoDB database connection
 * @returns {Promise<number>} - Total number of registered devices
 */
export async function queryDevicesRegistered(db: Db): Promise<number> {
  try {
    // Fetch organization config holding applications
    const configCollection = db.collection('config');
    const appsConfig = await configCollection.findOne({ key: 'applications' });
    const applications = appsConfig && appsConfig.value && appsConfig.value.applicationSettings
      ? Object.keys(appsConfig.value.applicationSettings)
      : [];

    let totalDevices = 0;
    for (const appId of applications) {
      const devicesCollection = db.collection(`${appId}_devices`);
      const deviceCount = await devicesCollection.countDocuments();
      totalDevices += deviceCount;
    }
    return totalDevices;
  } catch (error) {
    console.error('Error counting registered devices across applications:', error);
    return 0;
  }
}
/**
 * Fetch all applications across all organizations (i.e., across all MongoDB databases).
 * Returns an array of applications with their details.
 * @returns {Promise<any[]>} - Array of applications across all organizations
 */
export async function queryAllApplications(): Promise<any[]> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  let client: MongoClient | null = null;

  try {
    console.log('Connecting to MongoDB to fetch all applications...');
    client = await MongoClient.connect(mongoUri);
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();

    // Filter out system databases
    const organizationDatabases = databases.filter(db =>
      !['admin', 'local', 'config'].includes(db.name)
    );

    const allApplications: any[] = [];

    for (const dbInfo of organizationDatabases) {
      try {
        const db = client.db(dbInfo.name);
        const configCollection = db.collection('config');
        const appsConfig = await configCollection.findOne({ key: 'applications' });

        if (!appsConfig || !appsConfig.value || !appsConfig.value.applicationSettings) {
          console.log(`No applications config found in database: ${dbInfo.name}`);
          continue;
        }

        const applications = Object.keys(appsConfig.value.applicationSettings);
        console.log(`Database ${dbInfo.name} has ${applications.length} applications`);

        // Get device count for each application
        for (const appId of applications) {
          const appData = appsConfig.value.applicationSettings[appId];
          const devicesCollection = db.collection(`${appId}_devices`);
          const deviceCount = await devicesCollection.countDocuments();

          allApplications.push({
            applicationId: appId,
            name: appData.name || appId,
            description: appData.description || '',
            status: appData.status || 'active',
            deviceCount,
            organizationId: dbInfo.name,
          });
        }
      } catch (err) {
        console.error(`Error fetching applications from database ${dbInfo.name}:`, err);
        continue;
      }
    }

    console.log(`Total applications fetched: ${allApplications.length}`);
    return allApplications;
  } catch (error) {
    console.error('Error fetching all applications across organizations:', error);
    return [];
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * Fetch the total count of applications across all organizations (i.e., across all MongoDB databases).
 * Iterates through all databases (excluding system databases), finds the applications in each, and tallies the total.
 * @returns {Promise<number>} - Total number of applications across all organizations
 */
export async function queryApplicationsRegistered(): Promise<number> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  let client: MongoClient | null = null;

  try {
    console.log('Connecting to MongoDB to count all applications...');
    client = await MongoClient.connect(mongoUri);
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();

    // Filter out system databases
    const organizationDatabases = databases.filter(db =>
      !['admin', 'local', 'config'].includes(db.name)
    );

    let totalApplications = 0;

    for (const dbInfo of organizationDatabases) {
      try {
        const db = client.db(dbInfo.name);
        const configCollection = db.collection('config');
        const appsConfig = await configCollection.findOne({ key: 'applications' });

        if (!appsConfig || !appsConfig.value || !appsConfig.value.applicationSettings) {
          console.log(`No applications config found in database: ${dbInfo.name}`);
          continue;
        }

        const applications = Object.keys(appsConfig.value.applicationSettings);
        totalApplications += applications.length;
        console.log(`Database ${dbInfo.name} has ${applications.length} applications`);
      } catch (err) {
        console.error(`Error counting applications in database ${dbInfo.name}:`, err);
        continue;
      }
    }
    console.log(`Total applications across all organizations: ${totalApplications}`);
    return totalApplications;
  } catch (error) {
    console.error('Error fetching total application count across organizations:', error);
    return 0;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * Fetch the amount of registered devices across ALL MongoDB databases.
 * Queries all databases (excluding system databases) and counts devices from all applications.
 * @returns {Promise<number>} - Total number of registered devices across all databases
 */
export async function queryAllDevicesRegistered(): Promise<number> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  let client: MongoClient | null = null;

  try {
    console.log('Connecting to MongoDB to query all databases...');
    client = await MongoClient.connect(mongoUri);
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();

    // Filter out system databases
    const organizationDatabases = databases.filter(db =>
      !['admin', 'local', 'config'].includes(db.name)
    );

    console.log(`Found ${organizationDatabases.length} organization databases`);

    let totalDevices = 0;

    // Query each organization database
    for (const dbInfo of organizationDatabases) {
      try {
        const db = client.db(dbInfo.name);
        const configCollection = db.collection('config');
        const appsConfig = await configCollection.findOne({ key: 'applications' });
        
        if (!appsConfig || !appsConfig.value || !appsConfig.value.applicationSettings) {
          console.log(`No applications found in database: ${dbInfo.name}`);
          continue;
        }

        const applications = Object.keys(appsConfig.value.applicationSettings);
        console.log(`Database ${dbInfo.name} has ${applications.length} applications`);

        // Count devices for each application in this database
        for (const appId of applications) {
          const devicesCollection = db.collection(`${appId}_devices`);
          const deviceCount = await devicesCollection.countDocuments();
          totalDevices += deviceCount;
          console.log(`  Application ${appId}: ${deviceCount} devices`);
        }
      } catch (dbError) {
        console.error(`Error querying database ${dbInfo.name}:`, dbError);
        // Continue with other databases even if one fails
        continue;
      }
    }

    console.log(`Total devices across all databases: ${totalDevices}`);
    return totalDevices;
  } catch (error) {
    console.error('Error counting registered devices across all databases:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

export async function queryCPU(){
    const sql = `
SELECT time,usage_idle as cpu_usage
FROM "cpu"
WHERE
time >= now() - interval '1 minute'
ORDER BY time
LIMIT 1;
    `;
    
    try {
      console.log('Executing CPU query from server_stats bucket');
      // Use the server_stats bucket instead of the default bucket
      const serverStatsClient = createInfluxClientForBucket('server__stats');
      const results = await serverStatsClient.query(sql);
      console.log('Results:', results);
      const rows: any[] = [];
  
      for await (const row of results) {
        rows.push(row);
      }
  
      console.log(`CPU query returned ${rows.length} rows`);
      return rows;
    } catch (error) {
      console.error('Error in queryCPU:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      // Return empty array on error to prevent breaking the UI
      return [];
    }
  }

export async function queryRAM(){
    const sql = `
SELECT (100-available_percent) as ram_usage
FROM "mem"
WHERE
time >= now() - interval '1 minute'
ORDER BY time
LIMIT 1;
    `;
    
    try {
      console.log('Executing CPU query from server_stats bucket');
      // Use the server_stats bucket instead of the default bucket
      const serverStatsClient = createInfluxClientForBucket('server__stats');
      const results = await serverStatsClient.query(sql);
      console.log('Results:', results);
      const rows: any[] = [];
  
      for await (const row of results) {
        rows.push(row);
      }
  
      console.log(`CPU query returned ${rows.length} rows`);
      return rows;
    } catch (error) {
      console.error('Error in queryCPU:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      // Return empty array on error to prevent breaking the UI
      return [];
    }
  }