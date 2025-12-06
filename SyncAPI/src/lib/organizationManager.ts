// Organization Manager for Multi-Tenant Architecture
// Structure: Organization Database -> Applications -> Devices & Config

import { Db } from 'mongodb';

class OrganizationManager {
  private db: Db;
  private organizationConfigCollection: any;

  constructor(db: Db) {
    this.db = db;
    this.organizationConfigCollection = db.collection('config');
  }

  // Get organization information
  async getOrganization() {
    try {
      const org = await this.organizationConfigCollection.findOne({key: 'organization'});
      return org ? org.value : null;
    } catch (error) {
      console.error('Error getting organization:', error);
      return null;
    }
  }

  // Update organization information
  async updateOrganization(updateData: any) {
    try {
      const org = await this.organizationConfigCollection.findOne({key: 'organization'});
      const currentOrg = org ? org.value : {};
      
      const updatedOrg = {
        ...currentOrg,
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      await this.organizationConfigCollection.updateOne(
        {key: 'organization'},
        {$set: {value: updatedOrg}},
        {upsert: true}
      );
      
      return updatedOrg;
    } catch (error) {
      console.error('Error updating organization:', error);
      return null;
    }
  }



  // Get organization statistics
  async getOrganizationStats() {
    try {
      const org = await this.getOrganization();
      
      // Get applications data from the config collection
      const appsConfig = await this.organizationConfigCollection.findOne({key: 'applications'});
      const applications = appsConfig ? appsConfig.value : null;
      
      const stats = {
        organization: {
          id: org?.organizationId,
          name: org?.organizationName,
          status: org?.status
        },
        applications: applications ? Object.keys(applications.applicationSettings || {}).length : 0,
        totalDevices: 0,
        applicationsList: [] as any[]
      };

      if (applications && applications.applicationSettings) {
        for (const [appId, app] of Object.entries(applications.applicationSettings)) {
          const devicesCollection = this.db.collection(`${appId}_devices`);
          const deviceCount = await devicesCollection.countDocuments();
          
          stats.totalDevices += deviceCount;
          stats.applicationsList.push({
            applicationId: appId,
            applicationName: (app as any).name || (app as any).applicationName,
            deviceCount,
            status: (app as any).status
          });
        }
      }

      return stats;
    } catch (error) {
      console.error('Error getting organization stats:', error);
      return null;
    }
  }

  // Get all connectors for an organization
  async getConnectors() {
    try {
      const connectorsCollection = this.db.collection('connectors');
      // Assuming "applicationId" is stored in connector docs, adjust as necessary
      const query = { organizationId: (await this.getOrganization())?.organizationId };
      const connectors = await connectorsCollection.find(query).toArray();
      return connectors;
    } catch (error) {
      console.error(`Error getting connectors for organization ${(await this.getOrganization())?.organizationId || 'unknown'}:`, error);
      throw error;
    }
  }
}

// Export for use in other files
export { OrganizationManager };