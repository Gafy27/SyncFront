// Config Manager for OilMonitor Application
// Manages configuration stored in the config collection

import { Db } from 'mongodb';

class ConfigManager {
  private db: Db;
  private configCollection: any;

  constructor(db: Db) {
    this.db = db;
    this.configCollection = db.collection('config');
  }

  // Get configuration by key
  async getConfig(key: string): Promise<any> {
    try {
      const config = await this.configCollection.findOne({ key });
      return config ? config.value : null;
    } catch (error) {
      console.error(`Error getting config for key ${key}:`, error);
      return null;
    }
  }

  // Set configuration by key
  async setConfig(key: string, value: any, category: string = 'general'): Promise<any> {
    try {
      const result = await this.configCollection.updateOne(
        { key },
        {
          $set: {
            key,
            value,
            category,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
      return result;
    } catch (error) {
      console.error(`Error setting config for key ${key}:`, error);
      throw error;
    }
  }

  // Get all configurations by category
  async getConfigsByCategory(category: string): Promise<any> {
    try {
      const configs = await this.configCollection.find({ category }).toArray();
      return configs.reduce((acc: any, config: any) => {
        acc[config.key] = config.value;
        return acc;
      }, {});
    } catch (error) {
      console.error(`Error getting configs for category ${category}:`, error);
      return {};
    }
  }

  // Get all configurations
  async getAllConfigs(): Promise<any> {
    try {
      const configs = await this.configCollection.find({}).toArray();
      return configs.reduce((acc: any, config: any) => {
        acc[config.key] = config.value;
        return acc;
      }, {});
    } catch (error) {
      console.error('Error getting all configs:', error);
      return {};
    }
  }

  // Delete configuration by key
  async deleteConfig(key: string): Promise<boolean> {
    try {
      const result = await this.configCollection.deleteOne({ key });
      return result.deletedCount > 0;
    } catch (error) {
      console.error(`Error deleting config for key ${key}:`, error);
      return false;
    }
  }

  // Get application configuration
  async getAppConfig() {
    return await this.getConfig('application');
  }

  // Get database configuration
  async getDatabaseConfig() {
    return await this.getConfig('database');
  }

  // Get alert configuration
  async getAlertConfig() {
    return await this.getConfig('alerts');
  }

  // Get API configuration
  async getApiConfig() {
    return await this.getConfig('api');
  }

  // Get InfluxDB configuration
  async getInfluxConfig() {
    return await this.getConfig('influxdb');
  }
}

// Usage examples
async function demonstrateConfigManager() {
  console.log('📊 OilMonitor Config Manager');
  console.log('============================');

  // Example usage (you would need to pass actual db connection)
  // const configManager = new ConfigManager(db);
  
  // Get application config
  // const appConfig = await configManager.getAppConfig();
  // console.log('App Config:', appConfig);
  
  // Get all configs
  // const allConfigs = await configManager.getAllConfigs();
  // console.log('All Configs:', allConfigs);
  
  // Set a new config
  // await configManager.setConfig('newSetting', { enabled: true }, 'feature');
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConfigManager;
}

// Run demonstration if called directly
if (require.main === module) {
  demonstrateConfigManager();
}
