import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';
import { MongoClient, Db } from 'mongodb';
import { Connector } from './src/models/connector.model';
import { OrganizationManager } from './src/lib/organizationManager';
import { ApplicationManager } from './src/lib/applicationManager';
import { DeviceManager } from './src/lib/deviceManager';

config({ path: resolve(__dirname, '.env') });

const MONGO_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const ORGANIZATION_ID = 'autentiodemo';
const ORGANIZATION_NAME = 'Autentio Demo';
const CNC_APPLICATION_ID = 'monitoreo-cnc';
const CNC_APPLICATION_NAME = 'Monitoreo CNC';
const ROBOT_APPLICATION_ID = 'robosync';
const ROBOT_APPLICATION_NAME = 'RoboSync';

const CNC_COLLECTIONS = {
  PRODUCTION: {
    used: false,
    variables: {}
  },
  STATE: {
    used: false,
    variables: {}
  },
  AXIS: {
    used: false,
    variables: {}
  },
  SPINDLE: {
    used: false,
    variables: {}
  },
  ALARM: {
    used: false,
    variables: {}
  },
  GCODE: {
    used: false,
    variables: {}
  }
};

const ROBOT_COLLECTIONS = {
  MOTION: {
    used: false,
    variables: {}
  },
  STATUS: {
    used: false,
    variables: {}
  },
  IO: {
    used: false,
    variables: {}
  },
  JOINTS: {
    used: false,
    variables: {}
  },
  TOOL: {
    used: false,
    variables: {}
  },
  ALARM: {
    used: false,
    variables: {}
  }
};

const CNC_CONNECTORS = [
  {
    name: 'Fanuc',
    driver: 'fanuc',
    properties: {}
  },
  {
    name: 'Haas',
    driver: 'haas',
    properties: {}
  },
  {
    name: 'Siemens',
    driver: 'siemens',
    properties: {}
  },
  {
    name: 'Mazak',
    driver: 'mazak',
    properties: {}
  },
  {
    name: 'DMG Mori',
    driver: 'dmg-mori',
    properties: {}
  },
  {
    name: 'Okuma',
    driver: 'okuma',
    properties: {}
  },
  {
    name: 'Rockwell',
    driver: 'rockwell',
    properties: {}
  }
];

const ROBOT_CONNECTORS = [
  {
    name: 'ABB',
    driver: 'abb',
    properties: {}
  },
  {
    name: 'Kuka',
    driver: 'kuka',
    properties: {}
  },
  {
    name: 'Universal Robots',
    driver: 'universal_robots',
    properties: {}
  },
  {
    name: 'Yaskawa',
    driver: 'yaskawa',
    properties: {}
  },
  {
    name: 'Hanwha',
    driver: 'hanwha',
    properties: {}
  }
];

const PROTOCOL_CONNECTORS = [
  {
    name: 'MQTT',
    driver: 'mqtt',
    properties: {
      'output': '',
      'mqtt_topic': '#',
      'mqtt_server': '',
      'mqtt_port': '8883',
      'mqtt_username': '',
      'mqtt_password': '',
      'mqtt_version': '3.1.1'
    }
  },
  {
    name: 'PostgreSQL',
    driver: 'postgresql',
    properties: {
      'input': 'input-data',
      'POSTGRES_HOST': 'postgresql',
      'POSTGRES_PORT': '80',
      'POSTGRES_DBNAME': 'quix',
      'POSTGRES_USER': 'admin',
      'POSTGRES_PASSWORD': '',
      'POSTGRES_TABLE': ''
    }
  },
  {
    name: 'InfluxDB',
    driver: 'influxdb',
    properties: {
      'output': 'influxdbv3-data',
      'task_interval': '5m',
      'INFLUXDB_HOST': '',
      'INFLUXDB_TOKEN': '',
      'INFLUXDB_ORG': '',
      'INFLUXDB_DATABASE': '',
      'INFLUXDB_MEASUREMENT_NAME': ''
    }
  },
  {
    name: 'S3',
    driver: 's3',
    properties: {
      'output': 's3-data',
      'S3_BUCKET': '',
      'S3_REGION': '',
      'S3_SECRET': '',
      'S3_ACCESS_KEY_ID': '',
      'S3_FOLDER_PREFIX': '',
      'POLL_INTERVAL_SECONDS': '30'
    }
  },
  {
    name: 'Redis',
    driver: 'redis',
    properties: {
      'output': 'output',
      'redis_host': '',
      'redis_port': '6379',
      'redis_password': '',
      'redis_username': ''
    }
  },
  {
    name: 'Modbus',
    driver: 'modbus',
    properties: {
      'output': 'modbus_data',
      'modbus_server_url': '',
      'modbus_namespace': '',
      'modbus_parameter_names_to_process': '',
      'modbus_loglevel': 'INFO'
    }
  }
];

const CNC_EVENT_CLASSES = [
  {
    className: 'EXECUTION',
    type: 'STR',
    topic: 'accepted',
    auth_values: ['ACTIVE', 'STOPPED', 'PROGRAM_STOPPED', 'OPTIONAL_STOP', 'FEED_HOLD', 'READY', 'UNAVAILABLE', 'STOP']
  },
  {
    className: 'MODE',
    type: 'STR',
    topic: 'accepted',
    auth_values: ['EDIT', 'MANUAL', 'MANUAL_DATA_INPUT', 'AUTOMATIC', 'UNAVAILABLE', 'REF']
  },
  {
    className: 'PIECES',
    type: 'STR',
    topic: 'accepted',
    auth_values: ['ON', 'OFF']
  },
  {
    className: 'ONLINE',
    type: 'STR',
    topic: 'accepted',
    auth_values: ['TRUE', 'FALSE']
  },
  {
    className: 'OP_CODE',
    type: 'STR',
    topic: 'accepted',
    auth_values: ['ANY']
  },
  {
    className: 'ACTIVITY',
    type: 'STR',
    topic: 'accepted',
    auth_values: ['JOB_SETUP', 'PROGRAM_SETUP', 'PROGRAM_UPDATE', 'MANTEINANCE', 'OPERATOR_BREAK', 'CYCLE_SETUP', 'CYCLE_RUN']
  },
  {
    className: 'OPERATION',
    type: 'STR',
    topic: 'accepted',
    auth_values: ['SETUP', 'PRODUCTION']
  },

];

const ROBOT_EVENT_CLASSES = [
  {
    className: 'MOTION_STATUS',
    type: 'STR',
    topic: 'robot/motion/status',
    auth_values: ['IDLE', 'MOVING', 'STOPPED', 'ERROR', 'PAUSED', 'HOMING']
  },
  {
    className: 'ROBOT_STATE',
    type: 'STR',
    topic: 'robot/state',
    auth_values: ['READY', 'RUNNING', 'STOPPED', 'ERROR', 'EMERGENCY_STOP', 'INITIALIZING']
  },
  {
    className: 'TOOL_STATUS',
    type: 'STR',
    topic: 'robot/tool/status',
    auth_values: ['OPEN', 'CLOSED', 'ERROR', 'UNAVAILABLE']
  },
  {
    className: 'JOINT_POSITION',
    type: 'FLOAT',
    topic: 'robot/joints/position',
    values_range: [-360.0, 360.0]
  },
  {
    className: 'CARTESIAN_POSITION',
    type: 'FLOAT',
    topic: 'robot/cartesian/position',
    values_range: [-10000.0, 10000.0]
  },
  {
    className: 'ALARM',
    type: 'STR',
    topic: 'robot/alarm',
    auth_values: ['NONE', 'SAFETY', 'MOTION', 'COMMUNICATION', 'SYSTEM', 'TOOL']
  },
  {
    className: 'PROGRAM_STATUS',
    type: 'STR',
    topic: 'robot/program/status',
    auth_values: ['IDLE', 'RUNNING', 'PAUSED', 'STOPPED', 'ERROR', 'COMPLETED']
  },
  {
    className: 'IO_STATE',
    type: 'BOOL',
    topic: 'robot/io/state'
  },
];

const CNC_FUNCTIONS = [
  // Counter Functions
  {
    name: 'Contador de piezas',
    type: 'Counter',
    expression: 'pieces_counter',
    variables: [],
    events: [],
    counter: {
      name: 'pieces_counter',
      eventClass: 'PIECES'
    },
    description: 'Cuenta el número de piezas producidas basado en la clase de evento PIECES'
  },

];

const ROBOT_FUNCTIONS = [
  {
    name: 'Magnitud de posición cartesiana',
    type: 'Algebraic',
    expression: 'sqrt(x*x + y*y + z*z)',
    variables: [
      { name: 'x', source: 'CARTESIAN_POSITION', index: 0 },
      { name: 'y', source: 'CARTESIAN_POSITION', index: 1 },
      { name: 'z', source: 'CARTESIAN_POSITION', index: 2 }
    ],
    events: [],
    description: 'Calcula la magnitud del vector de posición cartesiana del robot desde la clase de evento CARTESIAN_POSITION'
  }
];

const CNC_MACHINES = [
  {
    machineId: 'CN4',
    name: 'CN4',
    connectors: ['Fanuc'],
    events: [
      {
        id: "M30",
        class: "PIECES"
      },
      {
        id: "execution",
        class: "EXECUTION"
      },
      {
        id: "PROGRAM",
        class: "EXECUTION"
      },
      {
        id: "ONLINE",
        class: "ONLINE"
      },
      {
        id: "MODE",
        class: "MODE"
      },
      {
        id: "PROGRAM",
        class: "OP_CODE"
      },
      {
        id: "ACTIVITY",
        class: "ACTIVITY"
      },
      {
        id: "OPERATION",
        class: "OPERATION"
      }
    ],
    properties: {
      ip: "192.168.0.34",
      port: 5000,
      imageUrl: "https://gncmak.com/storage/xdnlPgbW4fJpBsTtXQscwJdFzt8j8zqFoa7wWB87.jpeg"
    }
  },
  {
    machineId: 'CN5',
    name: 'CN5',
    connectors: ['Fanuc'],
    events: [
      {
        id: "M30",
        class: "PIECES"
      },
      {
        id: "execution",
        class: "EXECUTION"
      },
      {
        id: "PROGRAM",
        class: "EXECUTION"
      },
      {
        id: "ONLINE",
        class: "ONLINE"
      },
      {
        id: "MODE",
        class: "MODE"
      },
      {
        id: "PROGRAM",
        class: "OP_CODE"
      },
      {
        id: "ACTIVITY",
        class: "ACTIVITY"
      },
      {
        id: "OPERATION",
        class: "OPERATION"
      }
    ],
    properties: {
      ip: "192.168.0.35",
      port: 5000,
      imageUrl: "https://imgs.search.brave.com/jM8th61GEKz9MlyCGXZ-OZuiv8CDwI5_cOjnLutClxA/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93d3cu/dGVjaGVxdWlwLmNv/bS93cC1jb250ZW50/L3VwbG9hZHMvaHl1/bmRhaS1MMzAwTEEt/MS0xMDI0eDU2Ny5w/bmc"
    }
  },
  {
    machineId: 'CM1',
    name: 'CM1',
    connectors: ['Fanuc'],
    events: [
      {
        id: "M30",
        class: "PIECES"
      },
      {
        id: "execution",
        class: "EXECUTION"
      },
      {
        id: "PROGRAM",
        class: "EXECUTION"
      },
      {
        id: "ONLINE",
        class: "ONLINE"
      },
      {
        id: "MODE",
        class: "MODE"
      },
      {
        id: "PROGRAM",
        class: "OP_CODE"
      },
      {
        id: "ACTIVITY",
        class: "ACTIVITY"
      },
      {
        id: "OPERATION",
        class: "OPERATION"
      }
    ],
    properties: {
      ip: "192.168.0.36",
      port: 5000,
      imageUrl: "https://img.interempresas.net/FotosArtProductos/P69348.jpg"
    }
  }
];

const ROBOT_MACHINES = [
  {
    machineId: 'HCR5-01',
    name: 'HCR5-01',
    connectors: ['Hanwha'],
    events: [
      {
        id: "MOTION_STATUS",
        class: "MOTION_STATUS"
      },
      {
        id: "ROBOT_STATE",
        class: "ROBOT_STATE"
      }
    ],
    properties: {
      ip: "192.168.0.37",
      port: 5000,
      imageUrl: "https://imgs.search.brave.com/TcppNdDcOD8xrruPnUEQbQ0MdWls8GiUvWRupoE2wDM/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly91bmNo/YWluZWRyb2JvdGlj/cy5kZS9jZG4tY2dp/L2ltYWdlL3dpZHRo/PTM4NCxxdWFsaXR5/PTgwL2h0dHBzOi8v/dXBsb2Fkcy51bmNo/YWluZWRyb2JvdGlj/cy5kZS9tZWRpYS9m/aWxlX3VwbG9hZC9I/Q1I1LVJTLTNfZTZl/NTliOTcucG5n"
    }
  },
];

async function seedConnector(connectorConfig: any, collections: any, type: string, applicationId?: string) {
  const connectorData: any = {
    name: connectorConfig.name,
    driver: connectorConfig.driver,
    organizationId: ORGANIZATION_ID,
    applicationId: applicationId || '',
    properties: connectorConfig.properties,
    collections: collections
  };

  const existingConnector = await Connector.findOne({ 
    name: connectorConfig.name,
    organizationId: ORGANIZATION_ID
  });
  
  if (existingConnector) {
    console.log(`${type} connector ${connectorConfig.name} already exists. Updating...`);
    const updated = await Connector.findOneAndUpdate(
      { 
        name: connectorConfig.name,
        organizationId: ORGANIZATION_ID
      }, 
      connectorData, 
      { new: true, runValidators: true }
    );
    const collectionsCount = Object.keys(collections || {}).length;
    console.log(`${type} connector ${connectorConfig.name} updated successfully with ${collectionsCount} collections`);
  } else {
    try {
      const connector = new Connector(connectorData);
      await connector.save();
      const collectionsCount = Object.keys(collections || {}).length;
      console.log(`${type} connector ${connectorConfig.name} created successfully with id: ${connector._id} and ${collectionsCount} collections`);
    } catch (error: any) {
      if (error.code === 11000) {
        console.log(`${type} connector ${connectorConfig.name} exists with different applicationId. Updating...`);
        await Connector.findOneAndUpdate(
          { name: connectorConfig.name },
          connectorData,
          { new: true, runValidators: true }
        );
        const collectionsCount = Object.keys(collections || {}).length;
        console.log(`${type} connector ${connectorConfig.name} updated successfully with ${collectionsCount} collections`);
      } else {
        throw error;
      }
    }
  }
}

async function createOrganization() {
  let client: MongoClient | null = null;
  try {
    console.log(`\n=== Creating Organization: ${ORGANIZATION_NAME} ===`);
    client = await MongoClient.connect(MONGO_URL);
    const organizationDb: Db = client.db(ORGANIZATION_ID);
    
    const organizationManager = new OrganizationManager(organizationDb);
    
    const organizationData = {
      organizationId: ORGANIZATION_ID,
      organizationName: ORGANIZATION_NAME,
      name: ORGANIZATION_NAME,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const result = await organizationManager.updateOrganization(organizationData);
    
    if (result) {
      console.log(`Organization "${ORGANIZATION_NAME}" created/updated successfully`);
      console.log(`Organization ID: ${ORGANIZATION_ID}`);
    } else {
      throw new Error('Failed to create organization');
    }
  } catch (error) {
    console.error('Error creating organization:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

async function createApplications() {
  let client: MongoClient | null = null;
  try {
    console.log(`\n=== Creating Applications ===`);
    client = await MongoClient.connect(MONGO_URL);
    const organizationDb: Db = client.db(ORGANIZATION_ID);
    const applicationManager = new ApplicationManager(organizationDb);
    
    // Create CNC Application
    console.log(`Creating application: ${CNC_APPLICATION_NAME} (${CNC_APPLICATION_ID})`);
    const cncApp = await applicationManager.addApplication({
      applicationId: CNC_APPLICATION_ID,
      name: CNC_APPLICATION_NAME,
      description: 'Monitoreo de máquinas CNC',
      status: 'active',
      collections: ['devices', 'config', 'connectors']
    });
    console.log(`Application "${CNC_APPLICATION_NAME}" created/updated successfully`);
    
    // Create Robot Application
    console.log(`Creating application: ${ROBOT_APPLICATION_NAME} (${ROBOT_APPLICATION_ID})`);
    const robotApp = await applicationManager.addApplication({
      applicationId: ROBOT_APPLICATION_ID,
      name: ROBOT_APPLICATION_NAME,
      description: 'Monitoreo de robots industriales',
      status: 'active',
      collections: ['devices', 'config', 'connectors']
    });
    console.log(`Application "${ROBOT_APPLICATION_NAME}" created/updated successfully`);
    
  } catch (error) {
    console.error('Error creating applications:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

async function createUser() {
  let client: MongoClient | null = null;
  try {
    console.log(`\n=== Creating User ===`);
    client = await MongoClient.connect(MONGO_URL);
    const organizationDb: Db = client.db(ORGANIZATION_ID);
    const usersCollection = organizationDb.collection('users');
    
    const userData = {
      name: 'Gabriel Varela',
      email: 'gvarela@autentio.com.ar',
      role: 'admin',
      status: 'active',
      organizationId: ORGANIZATION_ID,
      createdAt: new Date().toISOString(),
    };
    
    // Check if user with same email already exists
    const existingUser = await usersCollection.findOne({ email: userData.email });
    if (existingUser) {
      console.log(`User with email ${userData.email} already exists. Updating...`);
      await usersCollection.updateOne(
        { email: userData.email },
        { $set: userData }
      );
      console.log(`User "${userData.name}" updated successfully`);
    } else {
      const result = await usersCollection.insertOne(userData);
      console.log(`User "${userData.name}" created successfully with id: ${result.insertedId}`);
    }
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

async function seedAllConnectors() {
  try {
    console.log(`\n=== Connecting to MongoDB ===`);
    const dbUrl = `${MONGO_URL}/${ORGANIZATION_ID}`;
    await mongoose.connect(dbUrl);
    console.log(`Connected to MongoDB database: ${ORGANIZATION_ID}`);

    console.log('\n=== Seeding CNC Connectors ===');
    for (const connectorConfig of CNC_CONNECTORS) {
      await seedConnector(connectorConfig, CNC_COLLECTIONS, 'CNC');
    }

    console.log('\n=== Seeding Robot Connectors ===');
    for (const connectorConfig of ROBOT_CONNECTORS) {
      await seedConnector(connectorConfig, ROBOT_COLLECTIONS, 'Robot');
    }

    console.log('\n=== Seeding Protocol Connectors ===');
    for (const connectorConfig of PROTOCOL_CONNECTORS) {
      await seedConnector(connectorConfig, {}, 'Protocol');
    }

    console.log(`\nAll connectors seeded successfully for organization: ${ORGANIZATION_ID}`);
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding connectors:', error);
    await mongoose.disconnect();
    throw error;
  }
}

async function seedEventClasses(applicationId: string, eventClasses: any[]) {
  let client: MongoClient | null = null;
  try {
    console.log(`\n=== Seeding Event Classes for ${applicationId} ===`);
    client = await MongoClient.connect(MONGO_URL);
    const organizationDb: Db = client.db(ORGANIZATION_ID);
    const applicationManager = new ApplicationManager(organizationDb);
    
    const result = await applicationManager.setEventClasses(applicationId, eventClasses);
    console.log(`Successfully seeded ${result.length} event classes for ${applicationId}`);
  } catch (error) {
    console.error(`Error seeding event classes for ${applicationId}:`, error);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

async function seedFunctions(applicationId: string, functions: any[]) {
  let client: MongoClient | null = null;
  try {
    console.log(`\n=== Seeding Functions for ${applicationId} ===`);
    client = await MongoClient.connect(MONGO_URL);
    const organizationDb: Db = client.db(ORGANIZATION_ID);
    const applicationManager = new ApplicationManager(organizationDb);
    
    for (const func of functions) {
      try {
        await applicationManager.addFunction(applicationId, func);
        console.log(`  - Added function: ${func.name} (${func.type})`);
      } catch (error) {
        console.error(`  - Error adding function ${func.name}:`, error);
      }
    }
    console.log(`Successfully seeded ${functions.length} functions for ${applicationId}`);
  } catch (error) {
    console.error(`Error seeding functions for ${applicationId}:`, error);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

async function seedMachines(applicationId: string, machines: any[]) {
  let client: MongoClient | null = null;
  try {
    console.log(`\n=== Seeding Machines for ${applicationId} ===`);
    client = await MongoClient.connect(MONGO_URL);
    const organizationDb: Db = client.db(ORGANIZATION_ID);
    const deviceManager = new DeviceManager(organizationDb);
    const applicationManager = new ApplicationManager(organizationDb);
    
    // Fetch event classes for this application
    const eventClasses = await applicationManager.getEventClasses(applicationId);
    console.log(`  Found ${eventClasses.length} event classes for ${applicationId}`);
    
    // Convert event classes to machine events format
    const machineEvents = eventClasses.map((ec: any) => ({
      id: ec.id || ec.className || ec.class || `ec_${Date.now()}_${Math.random()}`,
      label: ec.className || ec.class || '',
      class: ec.className || ec.class || ''
    }));
    
    for (const machine of machines) {
      try {
        // Use events from event classes if machine doesn't have events specified
        const machineData = {
          ...machine,
          events: machine.events && machine.events.length > 0 ? machine.events : machineEvents
        };
        
        // Check if machine already exists
        const existing = await deviceManager.getDeviceByMachineId(machine.machineId, applicationId);
        if (existing) {
          console.log(`  - Machine ${machine.machineId} already exists. Updating...`);
          await deviceManager.updateDevice(machine.machineId, machineData, applicationId);
          console.log(`  - Machine ${machine.machineId} updated successfully with ${machineData.events.length} events`);
        } else {
          await deviceManager.addDevice(machineData, applicationId);
          console.log(`  - Added machine: ${machine.machineId} (${machine.name || 'Unnamed'}) with ${machineData.events.length} events`);
        }
      } catch (error) {
        console.error(`  - Error adding machine ${machine.machineId}:`, error);
      }
    }
    console.log(`Successfully seeded ${machines.length} machines for ${applicationId}`);
  } catch (error) {
    console.error(`Error seeding machines for ${applicationId}:`, error);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

async function main() {
  try {
    await createOrganization();
    await createUser();
    await createApplications();
    await seedAllConnectors();
    await seedEventClasses(CNC_APPLICATION_ID, CNC_EVENT_CLASSES);
    await seedEventClasses(ROBOT_APPLICATION_ID, ROBOT_EVENT_CLASSES);
    await seedFunctions(CNC_APPLICATION_ID, CNC_FUNCTIONS);
    await seedFunctions(ROBOT_APPLICATION_ID, ROBOT_FUNCTIONS);
    await seedMachines(CNC_APPLICATION_ID, CNC_MACHINES);
    await seedMachines(ROBOT_APPLICATION_ID, ROBOT_MACHINES);
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

main();

