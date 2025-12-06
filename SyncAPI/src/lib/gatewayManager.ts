import { Db } from 'mongodb';

interface GatewayData {
  gatewayId: string;
  name: string;
  location?: string;
  status?: string;
}

class GatewayManager {
  private collection;

  constructor(db: Db) {
    this.collection = db.collection('gateways');
  }

  async listGateways() {
    try {
      return await this.collection.find({}).sort({ createdAt: -1 }).toArray();
    } catch (error) {
      console.error('Error listing gateways:', error);
      return [];
    }
  }

  async addGateway(gatewayData: GatewayData) {
    try {
      const gateway = {
        ...gatewayData,
        status: gatewayData.status || 'connected',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await this.collection.insertOne(gateway);
      return gateway;
    } catch (error) {
      console.error('Error adding gateway:', error);
      throw error;
    }
  }
}

export { GatewayManager };

