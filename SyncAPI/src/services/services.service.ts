import { ServiceConfig, IServiceConfig } from '../models/service.model';

export class ServicesService {
  async getAllServices(): Promise<IServiceConfig[]> {
    try {
      return await ServiceConfig.find({}).sort({ updatedAt: -1 });
    } catch (error) {
      console.error('Error fetching services:', error);
      throw new Error('Failed to fetch services');
    }
  }

  async getServiceById(id: string): Promise<IServiceConfig | null> {
    try {
      return await ServiceConfig.findById(id);
    } catch (error) {
      console.error('Error fetching service by ID:', error);
      throw new Error('Failed to fetch service');
    }
  }

  async createService(serviceData: Partial<IServiceConfig>): Promise<IServiceConfig> {
    try {
      const service = new ServiceConfig(serviceData);
      return await service.save();
    } catch (error) {
      console.error('Error creating service:', error);
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new Error('A service with this name already exists');
      }
      throw new Error('Failed to create service');
    }
  }

  async updateService(id: string, updateData: Partial<IServiceConfig>): Promise<IServiceConfig | null> {
    try {
      return await ServiceConfig.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      );
    } catch (error) {
      console.error('Error updating service:', error);
      throw new Error('Failed to update service');
    }
  }

  async deleteService(id: string): Promise<boolean> {
    try {
      const result = await ServiceConfig.findByIdAndDelete(id);
      return result !== null;
    } catch (error) {
      console.error('Error deleting service:', error);
      throw new Error('Failed to delete service');
    }
  }
}

export default new ServicesService();
