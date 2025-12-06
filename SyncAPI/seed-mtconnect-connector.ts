import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';
import { MongoClient, Db } from 'mongodb';
import { Connector } from './src/models/connector.model';
import { OrganizationManager } from './src/lib/organizationManager';

config({ path: resolve(__dirname, '.env') });

const MONGO_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const ORGANIZATION_ID = 'autentiodev';
const ORGANIZATION_NAME = 'Autentio Dev';

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
    name: 'MTConnect',
    driver: 'mtconnect',
    properties: {
      'reporting interval': '10000',
      'get interval': '5000'
    }
  },
  {
    name: 'Focas',
    driver: 'focas',
    properties: {
      'reporting interval': '10000',
      'get interval': '5000'
    }
  },
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
    name: 'OPCUA',
    driver: 'opcua',
    properties: {
      'output': 'opc_ua_data',
      'OPC_SERVER_URL': '',
      'OPC_NAMESPACE': '',
      'PARAMETER_NAMES_TO_PROCESS': '',
      'LOGLEVEL': 'INFO'
    }
  }
];

async function seedConnector(connectorConfig: any, collections: any, type: string) {
  const connectorData: any = {
    name: connectorConfig.name,
    driver: connectorConfig.driver,
    organizationId: ORGANIZATION_ID,
    applicationId: '',
    properties: connectorConfig.properties,
    collections: collections
  };

  const existingConnector = await Connector.findOne({ 
    name: connectorConfig.name,
    organizationId: ORGANIZATION_ID
  });
  
  if (existingConnector) {
    console.log(`${type} connector ${connectorConfig.name} already exists. Updating...`);
    await Connector.findOneAndUpdate(
      { 
        name: connectorConfig.name,
        organizationId: ORGANIZATION_ID
      }, 
      connectorData, 
      { new: true, runValidators: true }
    );
    console.log(`${type} connector ${connectorConfig.name} updated successfully`);
  } else {
    try {
      const connector = new Connector(connectorData);
      await connector.save();
      console.log(`${type} connector ${connectorConfig.name} created successfully with id: ${connector._id}`);
    } catch (error: any) {
      if (error.code === 11000) {
        console.log(`${type} connector ${connectorConfig.name} exists with different applicationId. Updating...`);
        await Connector.findOneAndUpdate(
          { name: connectorConfig.name },
          connectorData,
          { new: true, runValidators: true }
        );
        console.log(`${type} connector ${connectorConfig.name} updated successfully`);
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
    process.exit(0);
  } catch (error) {
    console.error('Error seeding connectors:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

async function main() {
  try {
    await createOrganization();
    await seedAllConnectors();
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

main();

