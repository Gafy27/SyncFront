import { Router, Request, Response } from "express";
import { MongoClient, Db, ObjectId } from 'mongodb';
import { OrganizationManager } from "../lib/organizationManager";
import { ApplicationManager } from "../lib/applicationManager";
import { DeviceManager } from "../lib/deviceManager";
import { GatewayManager } from "../lib/gatewayManager";


const router = Router();

// List available organizations (MongoDB databases)
router.get("/", async (_req: Request, res: Response) => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  let client: MongoClient | null = null;

  try {
    client = await MongoClient.connect(mongoUri);
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();

    const organizations = await Promise.all(
      databases
        .filter((db) => !["admin", "local", "config"].includes(db.name))
        .map(async (db) => {
          // Get application count for this organization
          let applicationCount = 0;
          let userCount = 0;
          try {
            const orgDb = client!.db(db.name);
            const configCollection = orgDb.collection('config');
            const appsConfig = await configCollection.findOne({ key: 'applications' });
            if (appsConfig && appsConfig.value && appsConfig.value.applicationSettings) {
              applicationCount = Object.keys(appsConfig.value.applicationSettings).length;
            }
            
            // Get user count for this organization
            const usersCollection = orgDb.collection('users');
            userCount = await usersCollection.countDocuments();
          } catch (err) {
            console.error(`Error getting counts for ${db.name}:`, err);
          }

          return {
            id: db.name,
            name: db.name,
            sizeOnDisk: db.sizeOnDisk,
            empty: db.empty,
            applicationCount,
            userCount,
          };
        })
    );

    res.json(organizations);
  } catch (error) {
    console.error("Error listing organizations:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Error listing organizations", message: errorMessage });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// List gateways for an organization
router.get("/:organizationId/gateways", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationDb: Db = (req as any).organizationDb;
    const gatewayManager = new GatewayManager(organizationDb);
    const gateways = await gatewayManager.listGateways();
    res.json(gateways);
  } catch (error) {
    console.error("Error getting gateways:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Error getting gateways", message: errorMessage });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Add gateway to organization
router.post("/:organizationId/gateways", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { gatewayId, name, location, status } = req.body;

    if (!gatewayId || !name) {
      res.status(400).json({ error: "gatewayId and name are required" });
      return;
    }

    const organizationDb: Db = (req as any).organizationDb;
    const gatewayManager = new GatewayManager(organizationDb);
    const gateway = await gatewayManager.addGateway({
      gatewayId,
      name,
      location,
      status,
    });

    res.status(201).json(gateway);
  } catch (error) {
    console.error("Error creating gateway:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Error creating gateway", message: errorMessage });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Middleware to connect to the organization's database
async function connectToOrganizationDb(req: Request, res: Response, next: Function) {

  const organizationId = req.params.organizationId;
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

  try {
    const client = await MongoClient.connect(mongoUri);
    const db = client.db(organizationId); // Connect to the organization's database
    (req as any).organizationDb = db;
    (req as any).mongoClient = client;
    next();
  } catch (error) {
    console.error(`Error connecting to organization database ${organizationId}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      message: `Failed to connect to organization database ${organizationId}`,
      error: errorMessage 
    });
  }
}

// Middleware to close the MongoDB connection
function closeOrganizationDb(req: Request, res: Response, next: Function) {
  const client = (req as any).mongoClient;
  if (client) {
    client.close();
  }
  next();
}

// Get organization details
router.get("/:organizationId", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.params;
    const organizationDb: Db = (req as any).organizationDb;
    const organizationManager = new OrganizationManager(organizationDb);
    const config = await organizationManager.getOrganization();
    
    if (!config) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }
    
    res.json({
      id: organizationId,
      name: config.name || organizationId,
      description: config.description,
      email: config.email,
      website: config.website,
    });
  } catch (err) {
    console.error("Error getting organization:", err);
    res.status(500).json({ error: "Error getting organization" });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Update organization details
router.put("/:organizationId", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.params;
    const { name, description, email, website } = req.body;
    const organizationDb: Db = (req as any).organizationDb;
    const organizationManager = new OrganizationManager(organizationDb);
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (email !== undefined) updateData.email = email;
    if (website !== undefined) updateData.website = website;
    
    const result = await organizationManager.updateOrganization(updateData);
    
    if (result) {
      res.json({
        id: organizationId,
        name: result.name || organizationId,
        description: result.description,
        email: result.email,
        website: result.website,
      });
      return;
    } else {
      res.status(404).json({ error: "Organization not found" });
      return;
    }
  } catch (err) {
    console.error("Error updating organization:", err);
    res.status(500).json({ error: "Error updating organization" });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Get users for an organization
router.get("/:organizationId/users", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationDb: Db = (req as any).organizationDb;
    const usersCollection = organizationDb.collection('users');
    const users = await usersCollection.find({}).toArray();
    
    res.json(users.map((user: any) => ({
      id: user._id?.toString() || user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      status: user.status || 'active',
      createdAt: user.createdAt,
    })));
  } catch (err) {
    console.error("Error getting users:", err);
    res.status(500).json({ error: "Error getting users" });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Create user for an organization
router.post("/:organizationId/users", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.params;
    const { name, email, role } = req.body;
    
    if (!name || !email) {
      res.status(400).json({ error: "Name and email are required" });
      return;
    }
    
    const organizationDb: Db = (req as any).organizationDb;
    const usersCollection = organizationDb.collection('users');
    
    // Check if user with same email already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: "User with this email already exists" });
      return;
    }
    
    const newUser = {
      name,
      email,
      role: role || 'user',
      status: 'active',
      organizationId,
      createdAt: new Date().toISOString(),
    };
    
    const result = await usersCollection.insertOne(newUser);
    
    res.status(201).json({
      id: result.insertedId.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      createdAt: newUser.createdAt,
    });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Error creating user" });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Get organization configuration
router.get("/:organizationId/config", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationDb: Db = (req as any).organizationDb;
    const organizationManager = new OrganizationManager(organizationDb);
    const config = await organizationManager.getOrganization();
    
    if (!config) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }
    
    res.json(config);
  } catch (err) {
    console.error("Error getting organization config:", err);
    res.status(500).json({ error: "Error getting organization config" });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Get applications for an organization
router.get("/:organizationId/applications", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {

    const organizationDb: Db = (req as any).organizationDb;
    const applicationManager = new ApplicationManager(organizationDb);
    const deviceManager = new DeviceManager(organizationDb);
    const applications = await applicationManager.getApplications();
    
    if (applications && applications.applicationSettings) {
      const appArray = await Promise.all(
        Object.keys(applications.applicationSettings).map(async (key) => {
          const appData = applications.applicationSettings[key];
          
          // Get device count for this application
          const deviceCount = await deviceManager.getDeviceCount(key);
          
          return {
            applicationId: key,
            ...appData,
            deviceCount,
            lastModified: appData.updatedAt || appData.createdAt || new Date().toISOString()
          };
        })
      );
      res.json(appArray);
    } else {
      res.json([]);
    }
  } catch (err) {
    console.error("Error getting applications:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Error getting applications", message: errorMessage });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Create new application
router.post("/:organizationId/applications", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.params;
    const { applicationId, name, description, status = 'active' } = req.body;
    
    if (!applicationId || !name) {
      res.status(400).json({ error: "Application ID and name are required" });
      return;
    }

    const organizationDb: Db = (req as any).organizationDb;
    const applicationManager = new ApplicationManager(organizationDb);
    
    // Create the application
    const applicationData = {
      applicationId,
      name,
      description: description || '',
      status,
      collections: ['devices', 'config'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await applicationManager.addApplication(applicationData);
    
    if (result.success) {
      // Create the necessary collections for the application
      await organizationDb.createCollection(`${applicationId}_devices`);
      await organizationDb.createCollection(`${applicationId}_config`);
      
      res.status(201).json(applicationData);
    } else {
      res.status(500).json({ error: "Failed to create application" });
    }
  } catch (err) {
    console.error("Error creating application:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Error creating application", message: errorMessage });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Update application
router.put("/:organizationId/applications/:applicationId", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const { name, description, status } = req.body;
    
    const organizationDb: Db = (req as any).organizationDb;
    const applicationManager = new ApplicationManager(organizationDb);
    
    const updateData = {
      name,
      description,
      status: status || 'active'
    };
    
    const result = await applicationManager.updateApplication(applicationId, updateData);
    
    if (result) {
      res.status(200).json(result);
    } else {
      res.status(404).json({ error: "Application not found" });
    }
  } catch (err) {
    console.error("Error updating application:", err);
    res.status(500).json({ error: "Error updating application" });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Get devices for a specific application - with applications in the path (MUST come before the general application route)
router.get("/:organizationId/applications/:applicationId/devices", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const organizationDb: Db = (req as any).organizationDb;
    const deviceManager = new DeviceManager(organizationDb);
    
    console.log(`Fetching devices for application: ${applicationId} in organization: ${req.params.organizationId}`);
    const devices = await deviceManager.getDevices(applicationId);
    console.log(`Found ${devices.length} devices`);
    
    res.json(devices);
  } catch (err) {
    console.error("Error getting application devices:", err);
    res.status(500).json({ error: "Error getting application devices" });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Get all properties from all devices in an application
router.get("/:organizationId/applications/:applicationId/properties", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const organizationDb: Db = (req as any).organizationDb;
    const deviceManager = new DeviceManager(organizationDb);
    
    console.log(`Fetching all properties for application: ${applicationId} in organization: ${req.params.organizationId}`);
    const properties = await deviceManager.getAllProperties(applicationId);
    
    res.json(properties);
  } catch (err) {
    console.error("Error getting properties:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Error getting properties", details: errorMessage });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Get specific device by machineId within an application
router.get("/:organizationId/applications/:applicationId/devices/:machineId", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, machineId } = req.params;
    const organizationDb: Db = (req as any).organizationDb;
    const deviceManager = new DeviceManager(organizationDb);
    
    console.log(`Fetching device ${machineId} for application: ${applicationId} in organization: ${req.params.organizationId}`);
    const device = await deviceManager.getDeviceByMachineId(machineId, applicationId);
    
    if (!device) {
      res.status(404).json({ error: "Device not found" });
      return;
    }
    
    res.json(device);
  } catch (err) {
    console.error("Error getting device:", err);
    res.status(500).json({ error: "Error getting device" });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Create new device in an application
router.post("/:organizationId/applications/:applicationId/devices", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId, applicationId } = req.params;
    const deviceData = req.body;
    
    if (!deviceData.machineId) {
      res.status(400).json({ error: "Device machineId is required" });
      return;
    }

    const organizationDb: Db = (req as any).organizationDb;
    const deviceManager = new DeviceManager(organizationDb);
    
    // Create the device with application context
    const device = {
      ...deviceData,
      organizationId,
      applicationId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await deviceManager.addDevice(device, applicationId);
    
    if (result) {
      res.status(201).json(device);
    } else {
      res.status(500).json({ error: "Failed to create device" });
    }
  } catch (err) {
    console.error("Error creating device:", err);
    if (err instanceof Error && err.message.includes('duplicate key')) {
      res.status(400).json({ error: "Device with this machineId already exists" });
    } else {
      res.status(500).json({ error: "Error creating device" });
    }
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Update device in an application
router.put("/:organizationId/applications/:applicationId/devices/:machineId", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, machineId } = req.params;
    const deviceData = req.body;
    
    const organizationDb: Db = (req as any).organizationDb;
    const deviceManager = new DeviceManager(organizationDb);
    
    // Update the device with new data
    const updatedDevice = {
      ...deviceData,
      updatedAt: new Date()
    };

    const result = await deviceManager.updateDevice(machineId, updatedDevice, applicationId);
    
    if (result) {
      res.status(200).json(result);
    } else {
      res.status(404).json({ error: "Device not found" });
    }
  } catch (err) {
    console.error("Error updating device:", err);
    res.status(500).json({ error: "Error updating device" });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Delete device in an application
router.delete("/:organizationId/applications/:applicationId/devices/:machineId", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, machineId } = req.params;
    
    const organizationDb: Db = (req as any).organizationDb;
    const deviceManager = new DeviceManager(organizationDb);
    
    const result = await deviceManager.deleteDevice(machineId, applicationId);
    
    if (result) {
      res.status(200).json({ message: "Device deleted successfully" });
    } else {
      res.status(404).json({ error: "Device not found" });
    }
  } catch (err) {
    console.error("Error deleting device:", err);
    res.status(500).json({ error: "Error deleting device" });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Get specific application (MUST come after the devices route)
router.get("/:organizationId/applications/:applicationId", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const organizationDb: Db = (req as any).organizationDb;
    const applicationManager = new ApplicationManager(organizationDb);
    const application = await applicationManager.getApplication(applicationId);
    
    if (!application) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    
    res.json({
      applicationId,
      ...application
    });
  } catch (err) {
    console.error("Error getting application:", err);
    res.status(500).json({ error: "Error getting application" });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Delete application
router.delete("/:organizationId/applications/:applicationId", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const organizationDb: Db = (req as any).organizationDb;
    const applicationManager = new ApplicationManager(organizationDb);
    
    const result = await applicationManager.deleteApplication(applicationId);
    
    if (result.success) {
      res.status(200).json({ message: "Application deleted successfully" });
    } else {
      res.status(500).json({ error: "Failed to delete application" });
    }
  } catch (err) {
    console.error("Error deleting application:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Error deleting application" });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});


router.get("/:organizationId/oilmonitor_devices", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationDb: Db = (req as any).organizationDb;
    const devices = await organizationDb.collection("oilmonitor_devices").find({}).toArray();
    res.json(devices);
  } catch (err) {
    console.error("Error fetching oilmonitor_devices:", err);
    res.status(500).json({ error: "Error fetching oilmonitor_devices" });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});


// Get organization statistics
router.get("/:organizationId/stats", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationDb: Db = (req as any).organizationDb;
    const organizationManager = new OrganizationManager(organizationDb);
    const stats = await organizationManager.getOrganizationStats();
    
    if (!stats) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }
    
    res.json(stats);
  } catch (err) {
    console.error("Error getting organization stats:", err);
    res.status(500).json({ error: "Error getting organization stats" });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Get all connectors for an organization
router.get("/:organizationId/connectors", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationDb: Db = (req as any).organizationDb;
    // Get all connectors from the organization's database without filtering by applicationId
    const connectors = await organizationDb.collection("connectors").find({}).toArray();
    res.json(connectors);
  } catch (err) {
    console.error("Error getting organization connectors:", err);
    res.status(500).json({ error: "Error getting organization connectors" });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Get a specific connector by ID
router.get("/:organizationId/connectors/:connectorId", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectorId } = req.params;
    const organizationDb: Db = (req as any).organizationDb;
    
    let connector;
    try {
      // Try to find by ObjectId
      const objectId = new ObjectId(connectorId);
      connector = await organizationDb.collection("connectors").findOne({ _id: objectId });
    } catch (idError) {
      // If ObjectId conversion fails, return 400
      res.status(400).json({ error: "Invalid connector ID format" });
      return;
    }
    
    if (!connector) {
      res.status(404).json({ error: "Connector not found" });
      return;
    }
    
    res.json(connector);
  } catch (err) {
    console.error("Error getting connector:", err);
    res.status(500).json({ error: "Error getting connector" });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Create a new connector for an organization
router.post("/:organizationId/connectors", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.params;
    const connectorData = req.body;
    
    if (!connectorData.name || !connectorData.driver) {
      res.status(400).json({ error: "Connector name and driver are required" });
      return;
    }

    const organizationDb: Db = (req as any).organizationDb;
    
    const connector = {
      ...connectorData,
      organizationId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await organizationDb.collection("connectors").insertOne(connector);
    
    if (result.insertedId) {
      const createdConnector = await organizationDb.collection("connectors").findOne({ _id: result.insertedId });
      res.status(201).json(createdConnector);
    } else {
      res.status(500).json({ error: "Failed to create connector" });
    }
  } catch (err) {
    console.error("Error creating connector:", err);
    if (err instanceof Error && err.message.includes('duplicate key')) {
      res.status(400).json({ error: "Connector with this name already exists" });
    } else {
      res.status(500).json({ error: "Error creating connector" });
    }
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

export { router };