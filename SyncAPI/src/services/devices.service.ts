import influxClient from '../lib/influxClient';

export async function queryStatusByMachineId(machineId: string) {
  console.log(`Querying status by machineId: ${machineId}`);
  const sql = `
SELECT power
FROM "state"
WHERE
("power" IS NOT NULL)
AND
"machine_id" IN ('${machineId}')
ORDER BY time DESC
LIMIT 1
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
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error in queryStatusByMachineId:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}


export async function queryEventsByMachineId(machineId: string) {
  console.log(`Querying events by machineId: ${machineId}`);
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
WHERE machine_id = '${machineId}'
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
