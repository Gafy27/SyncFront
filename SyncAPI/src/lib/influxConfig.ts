import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file from SyncAPI directory
config({ path: resolve(__dirname, '../../.env') });

export const influxConfig = {
  host: process.env.INFLUXDB_HOST || '',
  token: process.env.INFLUXDB_TOKEN || '',
  database: process.env.INFLUXDB_DATABASE || ''
};

if (!influxConfig.host || !influxConfig.token || !influxConfig.database) {
  console.warn("⚠️ Parámetros de InfluxDB incompletos:");
  if (!influxConfig.host) console.warn(" - INFLUXDB_HOST no definido");
  if (!influxConfig.token) console.warn(" - INFLUXDB_TOKEN no definido");
  if (!influxConfig.database) console.warn(" - INFLUXDB_DATABASE no definido");
  throw new Error("Faltan variables de entorno para conectar con InfluxDB");
}

console.debug("InfluxDB config:");
console.debug(" - host:", influxConfig.host);
console.debug(" - token:", "[HIDDEN]");
console.debug(" - database:", influxConfig.database);

