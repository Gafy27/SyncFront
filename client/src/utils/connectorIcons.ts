const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const CONNECTOR_DRIVERS = ['mqtt', 'postgresql', 'influxdb', 'modbus', 'opcua', 'redis', 's3'];
const DRIVER_DRIVERS = ['fanuc', 'haas', 'siemens', 'abb', 'kuka', 'mazak', 'okuma', 'dmgmori', 'dmg mori', 'dmg-mori', 'yaskawa', 'focas', 'mtconnect', 'mt-connect', 'rockwell', 'universalrobots', 'universal_robots', 'universal-robots'];

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
  };
  
  return iconMap[normalized] || normalized;
};

export const getConnectorIconUrl = (name: string, driver: string): string => {
  const normalizedDriver = normalizeName(driver);
  const normalizedName = normalizeName(name);
  const iconDriver = getIconName(driver);
  const iconName = getIconName(name);
  
  // Prioritize driver over name for icon selection
  if (CONNECTOR_DRIVERS.includes(normalizedDriver)) {
    return `${API_BASE_URL}/api/library/connectors/${iconDriver}/icon`;
  } else if (DRIVER_DRIVERS.includes(normalizedDriver)) {
    return `${API_BASE_URL}/api/library/drivers/${iconDriver}/icon`;
  }
  
  // Fallback to name if driver doesn't match
  if (CONNECTOR_DRIVERS.includes(normalizedName)) {
    return `${API_BASE_URL}/api/library/connectors/${iconName}/icon`;
  } else if (DRIVER_DRIVERS.includes(normalizedName)) {
    return `${API_BASE_URL}/api/library/drivers/${iconName}/icon`;
  }
  
  // Try driver first, then name
  return `${API_BASE_URL}/api/library/drivers/${iconDriver}/icon`;
};

