import { API_BASE_URL } from "@/lib/api";

const CONNECTOR_DRIVERS = [
  "mqtt",
  "postgresql",
  "influxdb",
  "modbus",
  "opcua",
  "redis",
  "s3",
  "sqlserver",
  "sql-server",
];
const DRIVER_DRIVERS = [
  "fanuc",
  "haas",
  "siemens",
  "abb",
  "kuka",
  "mazak",
  "okuma",
  "dmgmori",
  "dmg mori",
  "dmg-mori",
  "yaskawa",
  "focas",
  "mtconnect",
  "mt-connect",
  "rockwell",
  "universalrobots",
  "universal_robots",
  "universal-robots",
  "hanwha",
];

const normalizeName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/_/g, "");

const getIconName = (input: string): string => {
  const normalized = normalizeName(input);
  const iconMap: Record<string, string> = {
    dmgmori: "dmgmori",
    mtconnect: "mtconnect",
    universalrobots: "universal_robots",
    universal_robots: "universal_robots",
    sqlserver: "sqlserver",
    "sql-server": "sqlserver",
  };
  return iconMap[normalized] || normalized;
};

export const getConnectorIconUrl = (name: string, driver: string): string => {
  const normalizedDriver = normalizeName(driver);
  const normalizedName = normalizeName(name);
  const iconDriver = getIconName(driver);
  const iconName = getIconName(name);

  if (CONNECTOR_DRIVERS.includes(normalizedDriver)) {
    return `${API_BASE_URL}/api/library/connectors/${iconDriver}/icon`;
  } else if (DRIVER_DRIVERS.includes(normalizedDriver)) {
    return `${API_BASE_URL}/api/library/drivers/${iconDriver}/icon`;
  }

  if (CONNECTOR_DRIVERS.includes(normalizedName)) {
    return `${API_BASE_URL}/api/library/connectors/${iconName}/icon`;
  } else if (DRIVER_DRIVERS.includes(normalizedName)) {
    return `${API_BASE_URL}/api/library/drivers/${iconName}/icon`;
  }

  return `${API_BASE_URL}/api/library/drivers/${iconDriver}/icon`;
};
