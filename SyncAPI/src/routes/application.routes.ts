import { Router, Request, Response } from "express";
import { MongoClient, Db } from 'mongodb';
import { ApplicationManager } from "../lib/applicationManager";
import { DeviceManager } from "../lib/deviceManager";


const router = Router();

// Test route to verify the router is working
router.get("/test", (req: Request, res: Response) => {
  res.json({ message: "Application routes are working!" });
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
    res.status(500).json({ message: `Failed to connect to organization database ${organizationId}` });
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

// Create new device in an application
router.post("/:organizationId/applications/:applicationId/devices", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId, applicationId } = req.params;
    const deviceData = req.body;
    
    if (!deviceData.machine_id) {
      res.status(400).json({ error: "Machine ID is required" });
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
      res.status(400).json({ error: "Device with this Machine ID already exists" });
    } else {
      res.status(500).json({ error: "Error creating device" });
    }
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Get application configuration
router.get("/:organizationId/applications/:applicationId/config", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const organizationDb: Db = (req as any).organizationDb;
    const applicationManager = new ApplicationManager(organizationDb);
    const config = await applicationManager.getApplicationConfig(applicationId);
    
    res.json(config);
  } catch (err) {
    console.error("Error getting application config:", err);
    res.status(500).json({ error: "Error getting application config" });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Get application statistics
router.get("/:organizationId/applications/:applicationId/stats", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;

    const organizationDb: Db = (req as any).organizationDb;
    const applicationManager = new ApplicationManager(organizationDb);
    const stats = await applicationManager.getApplicationStats(applicationId);
    
    if (!stats) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    
    res.json(stats);
  } catch (err) {
    console.error("Error getting application stats:", err);
    res.status(500).json({ error: "Error getting application stats" });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Get event classes for an application
router.get("/:organizationId/applications/:applicationId/event-classes", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const organizationDb: Db = (req as any).organizationDb;
    const applicationManager = new ApplicationManager(organizationDb);
    
    const eventClasses = await applicationManager.getEventClasses(applicationId);
    
    res.json(eventClasses);
  } catch (err) {
    console.error("Error getting event classes:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Error getting event classes", details: errorMessage });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Add a new event class to an application
router.post("/:organizationId/applications/:applicationId/event-classes", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const eventClassData = req.body;
    
    if (!eventClassData) {
      res.status(400).json({ error: "Event class data is required" });
      return;
    }
    
    const organizationDb: Db = (req as any).organizationDb;
    const applicationManager = new ApplicationManager(organizationDb);
    
    const newEventClass = await applicationManager.addEventClass(applicationId, eventClassData);
    
    res.status(201).json(newEventClass);
  } catch (err) {
    console.error("Error adding event class:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (errorMessage.includes('missing required field')) {
      res.status(400).json({ error: errorMessage });
    } else {
      res.status(500).json({ error: "Error adding event class", details: errorMessage });
    }
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Update all event classes for an application (replace entire list)
router.put("/:organizationId/applications/:applicationId/event-classes", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const eventClasses = req.body;
    
    if (!Array.isArray(eventClasses)) {
      res.status(400).json({ error: "Event classes must be an array" });
      return;
    }
    
    const organizationDb: Db = (req as any).organizationDb;
    const applicationManager = new ApplicationManager(organizationDb);
    
    const updatedEventClasses = await applicationManager.setEventClasses(applicationId, eventClasses);
    
    res.json(updatedEventClasses);
  } catch (err) {
    console.error("Error updating event classes:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (errorMessage.includes('missing required fields')) {
      res.status(400).json({ error: errorMessage });
    } else {
      res.status(500).json({ error: "Error updating event classes", details: errorMessage });
    }
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Get functions for an application
router.get("/:organizationId/applications/:applicationId/functions", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const organizationDb: Db = (req as any).organizationDb;
    const applicationManager = new ApplicationManager(organizationDb);
    
    const functions = await applicationManager.getFunctions(applicationId);
    
    res.json(functions);
  } catch (err) {
    console.error("Error getting functions:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Error getting functions", details: errorMessage });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Add a new function to an application
router.post("/:organizationId/applications/:applicationId/functions", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const functionData = req.body;
    
    if (!functionData) {
      res.status(400).json({ error: "Function data is required" });
      return;
    }
    
    const organizationDb: Db = (req as any).organizationDb;
    const applicationManager = new ApplicationManager(organizationDb);
    
    const newFunction = await applicationManager.addFunction(applicationId, functionData);
    
    res.status(201).json(newFunction);
  } catch (err) {
    console.error("Error adding function:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (errorMessage.includes('required')) {
      res.status(400).json({ error: errorMessage });
    } else {
      res.status(500).json({ error: "Error adding function", details: errorMessage });
    }
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Update a function in an application
router.put("/:organizationId/applications/:applicationId/functions/:functionId", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, functionId } = req.params;
    const functionData = req.body;
    
    if (!functionData) {
      res.status(400).json({ error: "Function data is required" });
      return;
    }
    
    const organizationDb: Db = (req as any).organizationDb;
    const applicationManager = new ApplicationManager(organizationDb);
    
    const updatedFunction = await applicationManager.updateFunction(applicationId, functionId, functionData);
    
    if (updatedFunction) {
      res.status(200).json(updatedFunction);
    } else {
      res.status(404).json({ error: "Function not found" });
    }
  } catch (err) {
    console.error("Error updating function:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (errorMessage.includes('required')) {
      res.status(400).json({ error: errorMessage });
    } else {
      res.status(500).json({ error: "Error updating function", details: errorMessage });
    }
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Delete a function from an application
router.delete("/:organizationId/applications/:applicationId/functions/:functionId", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, functionId } = req.params;
    const organizationDb: Db = (req as any).organizationDb;
    const applicationManager = new ApplicationManager(organizationDb);
    
    const deleted = await applicationManager.deleteFunction(applicationId, functionId);
    
    if (deleted) {
      res.status(200).json({ message: "Function deleted successfully" });
    } else {
      res.status(404).json({ error: "Function not found" });
    }
  } catch (err) {
    console.error("Error deleting function:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Error deleting function", details: errorMessage });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

export { router };

// Get connectors for an application
router.get("/:organizationId/applications/:applicationId/connectors", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const organizationDb: Db = (req as any).organizationDb;
    const applicationManager = new ApplicationManager(organizationDb);
    
    const connectors = await applicationManager.getConnectors(applicationId);
    
    res.json(connectors);
  } catch (err) {
    console.error("Error getting connectors:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Error getting connectors", details: errorMessage });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Create a new connector for an application
router.post("/:organizationId/applications/:applicationId/connectors", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId, applicationId } = req.params;
    const connectorData = req.body;
    
    if (!connectorData.name || !connectorData.driver) {
      res.status(400).json({ error: "Connector name and driver are required" });
      return;
    }

    const organizationDb: Db = (req as any).organizationDb;
    const applicationManager = new ApplicationManager(organizationDb);
    
    const connector = {
      ...connectorData,
      organizationId,
    };

    const createdConnector = await applicationManager.addConnector(applicationId, connector);
    
    if (createdConnector) {
      res.status(201).json(createdConnector);
    } else {
      res.status(500).json({ error: "Failed to create connector" });
    }
  } catch (err) {
    console.error("Error creating connector:", err);
    if (err instanceof Error && err.message.includes('duplicate key')) {
      res.status(400).json({ error: "Connector with this name already exists" });
    } else {
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "Error creating connector", details: errorMessage });
    }
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Update a connector for an application
router.put("/:organizationId/applications/:applicationId/connectors/:connectorId", connectToOrganizationDb, async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId, applicationId, connectorId } = req.params;
    const connectorData = req.body;
    
    if (!connectorData.name || !connectorData.driver) {
      res.status(400).json({ error: "Connector name and driver are required" });
      return;
    }

    const organizationDb: Db = (req as any).organizationDb;
    const applicationManager = new ApplicationManager(organizationDb);
    
    const connector = {
      ...connectorData,
      organizationId,
    };

    const updatedConnector = await applicationManager.updateConnector(applicationId, connectorId, connector);
    
    if (updatedConnector) {
      res.status(200).json(updatedConnector);
    } else {
      res.status(404).json({ error: "Connector not found" });
    }
  } catch (err) {
    console.error("Error updating connector:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Error updating connector", details: errorMessage });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});