import 'dotenv/config';
import { InfluxDBClient } from '@influxdata/influxdb3-client'

const host = process.env.INFLUXDB_HOST?.trim()
const token = process.env.INFLUXDB_TOKEN?.trim()
const database = process.env.INFLUXDB_DATABASE?.trim()

console.log('InfluxDB env check - host:', host ? 'set' : 'missing', 'token:', token ? 'set' : 'missing', 'database:', database ? 'set' : 'missing');
if (!host || !token || !database) {
  console.warn("⚠️ Parámetros de InfluxDB incompletos:");
  if (!host) console.warn(" - INFLUXDB_HOST no definido");
  if (!token) console.warn(" - INFLUXDB_TOKEN no definido");
  if (!database) console.warn(" - INFLUXDB_DATABASE no definido");
  throw new Error("Faltan variables de entorno para conectar con InfluxDB");
}

console.debug("InfluxDB config:");
console.debug(" - host:", host);
console.debug(" - token:", token ? "[HIDDEN]" : "MISSING");
console.debug(" - database:", database);

const influxClient = new InfluxDBClient({
  host,
  token,
  database,
});

/**
 * Creates an InfluxDB client for a specific bucket/database
 * @param bucketName - The name of the bucket/database to connect to
 * @returns A new InfluxDBClient instance configured for the specified bucket
 */
export function createInfluxClientForBucket(bucketName: string): InfluxDBClient {
  if (!host || !token) {
    throw new Error("InfluxDB host and token must be configured");
  }
  
  return new InfluxDBClient({
    host,
    token,
    database: bucketName,
  });
}

export default influxClient;
