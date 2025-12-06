// Device Manager for Multi-Tenant Architecture
// Handles device-specific operations within applications

import { Db } from 'mongodb';

class DeviceManager {
  private db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  // Get devices for a specific application
  async getDevices(applicationId: string) {
    try {
      const devicesCollection = this.db.collection(`${applicationId}_devices`);
      const devices = await devicesCollection.find({}).toArray();
      console.log(`Found ${devices.length} devices in ${applicationId}_devices collection`);
      return devices;
    } catch (error) {
      console.error(`Error getting devices for ${applicationId}:`, error);
      return [];
    }
  }

  // Get device by machineId for a specific application
  async getDeviceByMachineId(machineId: string, applicationId: string) {
    try {
      const devicesCollection = this.db.collection(`${applicationId}_devices`);
      const device = await devicesCollection.findOne({ machineId });
      return device;
    } catch (error) {
      console.error(`Error getting device ${machineId}:`, error);
      return null;
    }
  }

  // Add new device to application
  async addDevice(deviceData: any, applicationId: string) {
    try {
      const device = {
        ...deviceData,
        organizationId: process.env.ORGANIZATION_ID || 'autentiodev',
        applicationId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const devicesCollection = this.db.collection(`${applicationId}_devices`);
      const result = await devicesCollection.insertOne(device);
      return result;
    } catch (error) {
      console.error('Error adding device:', error);
      throw error;
    }
  }

  // Update device
  async updateDevice(machineId: string, deviceData: any, applicationId: string) {
    try {
      const devicesCollection = this.db.collection(`${applicationId}_devices`);
      const result = await devicesCollection.updateOne(
        { machineId },
        { 
          $set: { 
            ...deviceData, 
            updatedAt: new Date() 
          } 
        }
      );
      return result;
    } catch (error) {
      console.error(`Error updating device ${machineId}:`, error);
      throw error;
    }
  }

  // Delete device
  async deleteDevice(machineId: string, applicationId: string) {
    try {
      const devicesCollection = this.db.collection(`${applicationId}_devices`);
      const result = await devicesCollection.deleteOne({ machineId });
      return result;
    } catch (error) {
      console.error(`Error deleting device ${machineId}:`, error);
      throw error;
    }
  }

  // Get device count for application
  async getDeviceCount(applicationId: string) {
    try {
      const devicesCollection = this.db.collection(`${applicationId}_devices`);
      return await devicesCollection.countDocuments();
    } catch (error) {
      console.error(`Error getting device count for ${applicationId}:`, error);
      return 0;
    }
  }

  // Get devices with pagination
  async getDevicesPaginated(applicationId: string, page: number = 1, limit: number = 10) {
    try {
      const devicesCollection = this.db.collection(`${applicationId}_devices`);
      const skip = (page - 1) * limit;
      
      const devices = await devicesCollection
        .find({})
        .skip(skip)
        .limit(limit)
        .toArray();
      
      const total = await devicesCollection.countDocuments();
      
      return {
        devices,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error(`Error getting paginated devices for ${applicationId}:`, error);
      return { devices: [], pagination: { page, limit, total: 0, pages: 0 } };
    }
  }

  // Get all properties from all devices in an application
  async getAllProperties(applicationId: string) {
    try {
      const devicesCollection = this.db.collection(`${applicationId}_devices`);
      const devices = await devicesCollection.find({}).toArray();
      
      // Collect all unique property keys from all devices
      const allProperties = new Set<string>();
      
      devices.forEach((device: any) => {
        if (device.properties && typeof device.properties === 'object') {
          Object.keys(device.properties).forEach(key => {
            if (key && key.trim()) {
              allProperties.add(key);
            }
          });
        }
      });
      
      // Return as array with machine info for each property
      const propertiesList: Array<{ key: string; machines: string[] }> = [];
      
      Array.from(allProperties).forEach(propKey => {
        const machinesWithProperty = devices
          .filter((device: any) => device.properties && device.properties[propKey] !== undefined)
          .map((device: any) => device.machineId || device.name || 'Unknown');
        
        propertiesList.push({
          key: propKey,
          machines: machinesWithProperty
        });
      });
      
      return propertiesList.sort((a, b) => a.key.localeCompare(b.key));
    } catch (error) {
      console.error(`Error getting all properties for ${applicationId}:`, error);
      return [];
    }
  }
}

// Export for use in other files
export { DeviceManager };
