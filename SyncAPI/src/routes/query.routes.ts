import { Router, Request, Response } from "express";
import { MongoClient, Db } from 'mongodb';
import { queryDevicesConnected, queryDevicesRegistered, queryAllDevicesRegistered, queryEventsProcessed24h, queryEvents, queryCPU, queryRAM, queryStorage, queryEventsProcessed, queryApplicationsRegistered, queryAllApplications } from "../services/query,service";
import { OrganizationManager } from "../lib/organizationManager";

const router = Router();

// Middleware to connect to organization database
async function connectToOrganizationDb(req: Request, res: Response, next: Function) {
  const organizationId = req.query.organizationId as string || 'autentiodev';
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

  try {
    const client = await MongoClient.connect(mongoUri);
    const db = client.db(organizationId);
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

// Get registered devices for a specific organization
router.get("/registered", connectToOrganizationDb, async (req: Request, res: Response) => {
  try {
    const organizationDb: Db = (req as any).organizationDb;
    const count = await queryDevicesRegistered(organizationDb);
    res.json({ count });
  } catch (error) {
    console.error("Error getting registered devices:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Error getting registered devices", details: errorMessage });
  } finally {
    closeOrganizationDb(req, res, () => {});
  }
});

// Get registered devices across ALL databases
router.get("/registered/all", async (req: Request, res: Response) => {
  try {
    const count = await queryAllDevicesRegistered();
    res.json({ count });
  } catch (error) {
    console.error("Error getting all registered devices:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Error getting all registered devices", details: errorMessage });
  }
});

// Get connected devices
router.get("/connected", async (req: Request, res: Response) => {
  try {
    const data = await queryDevicesConnected();
    // Extract the count from the result and convert BigInt to number if needed
    let count = 0;
    if (data && data.length > 0 && data[0].total !== undefined) {
      const total = data[0].total;
      // Handle BigInt conversion
      count = typeof total === 'bigint' ? Number(total) : (typeof total === 'number' ? total : 0);
    }
    res.json({ count });
  } catch (error) {
    console.error("Error getting connected devices:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Error getting connected devices", details: errorMessage });
  }
});
// Get applications registered count
router.get("/apps-registered", async (req: Request, res: Response) => {
  try {
    const count = await queryApplicationsRegistered();
    res.json({ count });
  } catch (error) {
    console.error("Error getting applications registered:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Error getting applications registered", details: errorMessage });
  }
});

// Get all applications across all organizations
router.get("/applications", async (req: Request, res: Response) => {
  try {
    const applications = await queryAllApplications();
    res.json(applications);
  } catch (error) {
    console.error("Error getting all applications:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Error getting all applications", details: errorMessage });
  }
});
// Get events processed in last 24 hours
router.get("/events/processed-24h", async (req: Request, res: Response) => {
  try {
    const data = await queryEventsProcessed24h();
    
    // Extract the count from the result
    // InfluxDB COUNT(*) returns the count in various possible field names
    let count = 0;
    if (data && data.length > 0) {
      const row = data[0];
      // Try different possible field names for COUNT(*)
      const countValue = row['COUNT(*)'] !== undefined ? row['COUNT(*)'] : 
                        (row['count(*)'] !== undefined ? row['count(*)'] :
                        (row.count !== undefined ? row.count :
                        (row.total !== undefined ? row.total : 0)));
      
      // Convert to number if needed (BigInt should already be converted in service)
      count = typeof countValue === 'number' ? countValue : 
              (typeof countValue === 'string' ? parseInt(countValue, 10) || 0 : 0);
    }
    
    res.json({ count });
  } catch (error) {
    console.error("Error getting events processed 24h:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Error getting events processed 24h", details: errorMessage });
  }
});


// Get recent events
router.get("/events", async (req: Request, res: Response) => {
  try {
    const data = await queryEvents();
    res.json(data);
  } catch (error) {
    console.error("Error getting events:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Error getting events", details: errorMessage });
  }
});

// Get CPU usage
router.get("/cpu", async (req: Request, res: Response) => {
  try {
    const data = await queryCPU();
    res.json(data);
  } catch (error) {
    console.error("Error getting CPU usage:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Error getting CPU usage", details: errorMessage });
  }
});

// Get RAM usage
router.get("/ram", async (req: Request, res: Response) => {
  try {
    const data = await queryRAM();
    res.json(data);
  } catch (error) {
    console.error("Error getting RAM usage:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Error getting RAM usage", details: errorMessage });
  }
});

// Get storage usage
router.get("/storage", async (req: Request, res: Response) => {
  try {
    const storageGB = await queryStorage();
    res.json({ storage: storageGB });
  } catch (error) {
    console.error("Error getting storage usage:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Error getting storage usage", details: errorMessage });
  }
});

// Get events processed (total count)
router.get("/events/processed", async (req: Request, res: Response) => {
  try {
    const data = await queryEventsProcessed();
    
    // Extract the count from the result
    let count = 0;
    if (data && data.length > 0) {
      const row = data[0];
      const countValue = row['COUNT(*)'] !== undefined ? row['COUNT(*)'] : 
                        (row['count(*)'] !== undefined ? row['count(*)'] :
                        (row.count !== undefined ? row.count :
                        (row.total !== undefined ? row.total : 0)));
      
      count = typeof countValue === 'number' ? countValue : 
              (typeof countValue === 'string' ? parseInt(countValue, 10) || 0 : 0);
    }
    
    res.json({ count });
  } catch (error) {
    console.error("Error getting events processed:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Error getting events processed", details: errorMessage });
  }
});

export { router };
