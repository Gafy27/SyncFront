const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const CONNECTOR_DRIVERS = ['mqtt', 'postgresql', 'influxdb', 'modbus', 'opcua', 'redis', 's3', 'sqlserver', 'sql-server'];
const DRIVER_DRIVERS = ['fanuc', 'haas', 'siemens', 'abb', 'kuka', 'mazak', 'okuma', 'dmgmori', 'dmg mori', 'dmg-mori', 'yaskawa', 'focas', 'mtconnect', 'mt-connect', 'rockwell', 'universalrobots', 'universal_robots', 'universal-robots', 'hanwha'];

const normalizeName = (name: string): string => {
  return name.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '')
    .replace(/_/g, '');
};

const getIconName = (input: string): string => {
  const normalized = normalizeName(input);
  
  // Map variations to actual icon filenames
  const iconMap: Record<string, string> = {
    'dmgmori': 'dmgmori',
    'mtconnect': 'mtconnect',
    'universalrobots': 'universal_robots',
    'universal_robots': 'universal_robots',
    'sqlserver': 'sqlserver',
    'sql-server': 'sqlserver',
  };
  
  return iconMap[normalized] || normalized;
};

export const getConnectorIconUrl = (name: string, driver: string): string => {
  const normalizedDriver = normalizeName(driver);
  const normalizedName = normalizeName(name);
  const iconDriver = getIconName(driver);
  const iconName = getIconName(name);
  
  // Use relative URL if API_BASE_URL is empty (proxy through frontend server)
  const base = API_BASE_URL || '';
  
  // Prioritize driver over name for icon selection
  if (CONNECTOR_DRIVERS.includes(normalizedDriver)) {
    return `${base}/api/library/connectors/${iconDriver}/icon`;
  } else if (DRIVER_DRIVERS.includes(normalizedDriver)) {
    return `${base}/api/library/drivers/${iconDriver}/icon`;
  }
  
  // Fallback to name if driver doesn't match
  if (CONNECTOR_DRIVERS.includes(normalizedName)) {
    return `${base}/api/library/connectors/${iconName}/icon`;
  } else if (DRIVER_DRIVERS.includes(normalizedName)) {
    return `${base}/api/library/drivers/${iconName}/icon`;
  }
  
  // Try driver first, then name
  return `${base}/api/library/drivers/${iconDriver}/icon`;
};

