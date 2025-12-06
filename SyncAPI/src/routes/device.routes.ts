import { Router, Request, Response, NextFunction } from "express";
import { queryEventsByMachineId, queryStatusByMachineId } from "../services/devices.service";
import Device from '../models/device.model';
import BadRequestError from "../errors/BadRequestError";

const router = Router();

// Device events
router.get("/:machineId/events", async (req: Request, res: Response): Promise<void> => {
  try {
    const machineId = req.params.machineId;
    const data = await queryEventsByMachineId(machineId);
    res.json(data)
  } catch (err) {
    console.error("Error querying InfluxDB:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: "Error querying InfluxDB: get failed for queryEventsByMachineId", details: errorMessage });
  }
});

router.get("/:machineId/status", async (req: Request, res: Response): Promise<void> => {
  try {
    const machineId = req.params.machineId;
    const data = await queryStatusByMachineId(machineId);
    res.json(data)
  } catch (err) {
    console.error("Error querying InfluxDB:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: "Error querying InfluxDB: get failed for queryStatusByMachineId", details: errorMessage });
  }
});
// Create Device
router.post("/new", async (req: Request, res: Response, next: NextFunction) => {
  const { machineId } = req.body;
  if(!machineId) {
    throw new BadRequestError({code: 400, message: "Machine ID is required!", logging: true});
  }
  
  try {
    const newDevice = new Device(req.body);
    await newDevice.save();
    res.status(201).json(newDevice);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      throw new BadRequestError({code: 400, message: "Machine ID already exists!", logging: true, context: { machineId }});
    } else {
      next(error);
    }
  }
});

// Get Device by Machine ID
router.get("/:machineId", async (req: Request, res: Response) => {
  try {
    const machineId = req.params.machineId;
    const device = await Device.findOne({ machineId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.status(200).json(device);
  } catch (error) {
    res.status(500).json({ message: 'Error getting device: ', error });
  }
});

// Update Device
router.put("/:machineId", async (req: Request, res: Response) => {
  try {
    const machineId = req.params.machineId;
    const device = await Device.findOneAndUpdate({ machineId }, req.body, { new: true });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.status(200).json(device);
  } catch (error) {
    res.status(500).json({ message: 'Error updating device: ', error });
  }
});

// Delete Device
router.delete("/:machineId", async (req: Request, res: Response) => {
  try {
    const machineId = req.params.machineId;
    const device = await Device.findOneAndDelete({ machineId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.status(200).json({ message: 'Device deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting device: ', error });
  }
});

export { router };