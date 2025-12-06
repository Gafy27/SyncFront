// Application Manager for Multi-Tenant Architecture
// Handles application-specific operations within an organization

import { Db, ObjectId } from 'mongodb';

class ApplicationManager {
  private db: Db;
  private organizationConfigCollection: any;

  constructor(db: Db) {
    this.db = db;
    this.organizationConfigCollection = db.collection('config');
  }

  // Get all applications for the organization
  async getApplications() {
    try {
      const appsConfig = await this.organizationConfigCollection.findOne({key: 'applications'});
      return appsConfig ? appsConfig.value : null;
    } catch (error) {
      console.error('Error getting applications:', error);
      return null;
    }
  }

  // Get specific application
  async getApplication(applicationId: string) {
    try {
      const appsConfig = await this.getApplications();
      return appsConfig && appsConfig.applicationSettings ? 
        appsConfig.applicationSettings[applicationId] : null;
    } catch (error) {
      console.error(`Error getting application ${applicationId}:`, error);
      return null;
    }
  }

  // Add new application to organization
  async addApplication(applicationData: any) {
    try {
      const application = {
        ...applicationData,
        organizationId: process.env.ORGANIZATION_ID || 'autentiodev',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Update the organization's applications configuration
      const appsConfig = await this.organizationConfigCollection.findOne({key: 'applications'});
      if (appsConfig) {
        // Add the new application to the existing configuration
        const updatedConfig = {
          ...appsConfig.value,
          applicationSettings: {
            ...appsConfig.value.applicationSettings,
            [applicationData.applicationId]: {
              name: applicationData.name,
              description: applicationData.description,
              status: applicationData.status || 'active',
              collections: applicationData.collections || ['devices', 'config']
            }
          }
        };

        await this.organizationConfigCollection.updateOne(
          {key: 'applications'},
          { $set: { value: updatedConfig } }
        );
      } else {
        // Create new applications configuration
        const newConfig = {
          key: 'applications',
          value: {
            availableApplications: [applicationData.applicationId],
            defaultApplication: applicationData.applicationId,
            applicationSettings: {
              [applicationData.applicationId]: {
                name: applicationData.name,
                description: applicationData.description,
                status: applicationData.status || 'active',
                collections: applicationData.collections || ['devices', 'config']
              }
            }
          }
        };

        await this.organizationConfigCollection.insertOne(newConfig);
      }

      return { success: true, application };
    } catch (error) {
      console.error('Error adding application:', error);
      throw error;
    }
  }

  // Update application in organization
  async updateApplication(applicationId: string, updateData: any) {
    try {
      // Get the current applications configuration
      const appsConfig = await this.organizationConfigCollection.findOne({key: 'applications'});
      
      if (!appsConfig || !appsConfig.value.applicationSettings || !appsConfig.value.applicationSettings[applicationId]) {
        throw new Error('Application not found');
      }

      // Update the application data
      const updatedApplication = {
        ...appsConfig.value.applicationSettings[applicationId],
        ...updateData,
        updatedAt: new Date()
      };

      // Update the configuration
      const updatedConfig = {
        ...appsConfig.value,
        applicationSettings: {
          ...appsConfig.value.applicationSettings,
          [applicationId]: updatedApplication
        }
      };

      // Update the configuration in the database
      await this.organizationConfigCollection.updateOne(
        {key: 'applications'},
        { $set: { value: updatedConfig } }
      );

      return updatedApplication;
    } catch (error) {
      console.error('Error updating application:', error);
      throw error;
    }
  }

  // Delete application from organization
  async deleteApplication(applicationId: string) {
    try {
      // Get the current applications configuration
      const appsConfig = await this.organizationConfigCollection.findOne({key: 'applications'});
      
      if (!appsConfig || !appsConfig.value.applicationSettings || !appsConfig.value.applicationSettings[applicationId]) {
        throw new Error('Application not found');
      }

      // Remove the application from the configuration
      const updatedConfig = {
        ...appsConfig.value,
        availableApplications: appsConfig.value.availableApplications.filter((id: string) => id !== applicationId),
        applicationSettings: { ...appsConfig.value.applicationSettings }
      };
      
      delete updatedConfig.applicationSettings[applicationId];

      // Update the default application if it was the deleted one
      if (updatedConfig.defaultApplication === applicationId) {
        updatedConfig.defaultApplication = updatedConfig.availableApplications[0] || null;
      }

      // Update the configuration in the database
      await this.organizationConfigCollection.updateOne(
        {key: 'applications'},
        { $set: { value: updatedConfig } }
      );

      // Drop the application's collections
      try {
        await this.db.collection(`${applicationId}_devices`).drop();
        await this.db.collection(`${applicationId}_config`).drop();
      } catch (dropError) {
        console.warn(`Warning: Could not drop collections for ${applicationId}:`, dropError);
        // Don't throw here as the application was already removed from config
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting application:', error);
      throw error;
    }
  }

  // Get configuration for a specific application
  async getApplicationConfig(applicationId: string) {
    try {
      const configCollection = this.db.collection(`${applicationId}_config`);
      const configs = await configCollection.find({}).toArray();
      return configs.reduce((acc: any, config: any) => {
        acc[config.key] = config.value;
        return acc;
      }, {});
    } catch (error) {
      console.error(`Error getting config for ${applicationId}:`, error);
      return {};
    }
  }

  // Get application statistics
  async getApplicationStats(applicationId: string) {
    try {
      const devicesCollection = this.db.collection(`${applicationId}_devices`);
      const deviceCount = await devicesCollection.countDocuments();
      
      return {
        applicationId,
        deviceCount,
        lastActivity: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error getting application stats for ${applicationId}:`, error);
      return null;
    }
  }

  // Get event classes for an application
  async getEventClasses(applicationId: string) {
    try {
      const eventClassesCollection = this.db.collection('monitoreo-cnc_events');
      const eventClasses = await eventClassesCollection.find({ applicationId }).toArray();
      
      // Transform to match expected format (remove _id, applicationId, createdAt, updatedAt from response)
      return eventClasses.map((ec: any) => {
        const { _id, applicationId: appId, createdAt, updatedAt, ...eventClass } = ec;
        return eventClass;
      });
    } catch (error) {
      console.error(`Error getting event classes for ${applicationId}:`, error);
      return [];
    }
  }

  // Add or update event classes for an application (replaces all event classes)
  // Note: The 'id' field is optional for each event class - it will be auto-generated if not provided
  async setEventClasses(applicationId: string, eventClasses: any[]) {
    try {
      const eventClassesCollection = this.db.collection('monitoreo-cnc_events');
      
      // First, delete all existing event classes for this application
      await eventClassesCollection.deleteMany({ applicationId });
      
      // Validate and prepare event classes (id is NOT required)
      const validatedEventClasses = eventClasses.map((ec, index) => {
        if (!ec.class && !ec.className) {
          throw new Error(`Event class at index ${index} is missing required field: class or className`);
        }
        if (!ec.topic) {
          throw new Error(`Event class at index ${index} is missing required field: topic`);
        }
        if (!ec.type) {
          throw new Error(`Event class at index ${index} is missing required field: type`);
        }
        
        const eventClass: any = {
          // ID is optional - auto-generate if not provided
          id: ec.id || `ec_${Date.now()}_${index}`,
          class: ec.class || ec.className, // Support both 'class' and 'className'
          topic: ec.topic,
          type: ec.type,
          applicationId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Add auth_values for STR type
        if (ec.type === 'STR' && ec.auth_values && Array.isArray(ec.auth_values)) {
          eventClass.auth_values = ec.auth_values;
        }
        
        // Add values_range for FLOAT type
        if (ec.type === 'FLOAT' && ec.values_range && Array.isArray(ec.values_range) && ec.values_range.length === 2) {
          eventClass.values_range = ec.values_range;
        }
        
        return eventClass;
      });
      
      // Insert all event classes
      if (validatedEventClasses.length > 0) {
        await eventClassesCollection.insertMany(validatedEventClasses);
      }
      
      // Return event classes without internal fields
      return validatedEventClasses.map((ec: any) => {
        const { _id, applicationId, createdAt, updatedAt, ...eventClass } = ec;
        return eventClass;
      });
    } catch (error) {
      console.error(`Error setting event classes for ${applicationId}:`, error);
      throw error;
    }
  }

  // Add a single event class to an application
  // Note: The 'id' field is optional - it will be auto-generated if not provided
  async addEventClass(applicationId: string, eventClass: any) {
    try {
      const eventClassesCollection = this.db.collection('monitoreo-cnc_events');
      
      // Validate the new event class (id is NOT required)
      if (!eventClass.class && !eventClass.className) {
        throw new Error('Event class is missing required field: class or className');
      }
      if (!eventClass.topic) {
        throw new Error('Event class is missing required field: topic');
      }
      if (!eventClass.type) {
        throw new Error('Event class is missing required field: type');
      }
      
      const newEventClass: any = {
        // ID is optional - auto-generate if not provided
        id: eventClass.id || `ec_${Date.now()}`,
        class: eventClass.class || eventClass.className,
        topic: eventClass.topic,
        type: eventClass.type,
        applicationId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add auth_values for STR type
      if (eventClass.type === 'STR' && eventClass.auth_values && Array.isArray(eventClass.auth_values)) {
        newEventClass.auth_values = eventClass.auth_values;
      }
      
      // Add values_range for FLOAT type
      if (eventClass.type === 'FLOAT' && eventClass.values_range && Array.isArray(eventClass.values_range) && eventClass.values_range.length === 2) {
        newEventClass.values_range = eventClass.values_range;
      }
      
      // Insert the new event class
      await eventClassesCollection.insertOne(newEventClass);
      
      // Return without internal fields
      const { _id, applicationId: appId, createdAt, updatedAt, ...result } = newEventClass;
      return result;
    } catch (error) {
      console.error(`Error adding event class for ${applicationId}:`, error);
      throw error;
    }
  }

  // Get functions for an application
  async getFunctions(applicationId: string) {
    try {
      const functionsCollection = this.db.collection('functions');
      const functions = await functionsCollection.find({ applicationId }).toArray();
      
      // Transform to match expected format (remove _id, applicationId, createdAt, updatedAt from response)
      return functions.map((fn: any) => {
        const { _id, applicationId: appId, createdAt, updatedAt, ...func } = fn;
        return func;
      });
    } catch (error) {
      console.error(`Error getting functions for ${applicationId}:`, error);
      return [];
    }
  }

  // Add a function to an application
  async addFunction(applicationId: string, functionData: any) {
    try {
      const functionsCollection = this.db.collection('functions');
      
      // Validate the function
      if (!functionData.name) {
        throw new Error('Function name is required');
      }
      if (!functionData.expression) {
        throw new Error('Function expression is required');
      }
      if (!functionData.variables || !Array.isArray(functionData.variables)) {
        throw new Error('Function variables must be an array');
      }
      
      const newFunction: any = {
        id: functionData.id || `fn_${Date.now()}`,
        name: functionData.name,
        type: functionData.type || 'Algebraic Function',
        expression: functionData.expression,
        variables: functionData.variables,
        events: functionData.events || [],
        counter: functionData.counter,
        description: functionData.description || '',
        applicationId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Insert the new function
      await functionsCollection.insertOne(newFunction);
      
      // Return without internal fields
      const { _id, applicationId: appId, createdAt, updatedAt, ...result } = newFunction;
      return result;
    } catch (error) {
      console.error(`Error adding function for ${applicationId}:`, error);
      throw error;
    }
  }

  // Update a function
  async updateFunction(applicationId: string, functionId: string, functionData: any) {
    try {
      const functionsCollection = this.db.collection('functions');
      
      // Validate the function
      if (!functionData.name) {
        throw new Error('Function name is required');
      }
      // For Counter functions, expression can be the counter name; for Algebraic Functions, expression is required
      if (functionData.type === "Counter") {
        if (!functionData.counter || !functionData.counter.name) {
          throw new Error('Counter name is required for Counter functions');
        }
        // Use counter name as expression if expression is not provided
        if (!functionData.expression) {
          functionData.expression = functionData.counter.name;
        }
      } else {
        if (!functionData.expression) {
          throw new Error('Function expression is required');
        }
      }
      if (!functionData.variables || !Array.isArray(functionData.variables)) {
        throw new Error('Function variables must be an array');
      }
      
      const updateData: any = {
        name: functionData.name,
        type: functionData.type || 'Algebraic Function',
        expression: functionData.expression,
        variables: functionData.variables,
        events: functionData.events || [],
        counter: functionData.counter,
        description: functionData.description || '',
        updatedAt: new Date()
      };
      
      const result = await functionsCollection.updateOne(
        { applicationId, id: functionId },
        { $set: updateData }
      );
      
      if (result.matchedCount === 0) {
        return null;
      }
      
      // Return the updated function
      const updatedFunction = await functionsCollection.findOne({ applicationId, id: functionId });
      if (updatedFunction) {
        const { _id, applicationId: appId, createdAt, updatedAt, ...func } = updatedFunction;
        return func;
      }
      return null;
    } catch (error) {
      console.error(`Error updating function ${functionId} for ${applicationId}:`, error);
      throw error;
    }
  }

  // Delete a function
  async deleteFunction(applicationId: string, functionId: string) {
    try {
      const functionsCollection = this.db.collection('functions');
      const result = await functionsCollection.deleteOne({ 
        applicationId, 
        id: functionId 
      });
      return result.deletedCount > 0;
    } catch (error) {
      console.error(`Error deleting function ${functionId} for ${applicationId}:`, error);
      throw error;
    }
  }

  // Get all connectors for a specific application
  async getConnectors(applicationId: string) {
    try {
      const connectorsCollection = this.db.collection(`${applicationId}_connectors`);
      const connectors = await connectorsCollection.find({}).toArray();
      // Convert _id to string for JSON serialization
      return connectors.map((connector) => ({
        ...connector,
        _id: connector._id.toString(),
      }));
    } catch (error) {
      console.error(`Error getting connectors for application ${applicationId}:`, error);
      throw error;
    }
  }
  // Add a connector to an application
  async addConnector(applicationId: string, connectorData: any) {
    try {
      const connectorsCollection = this.db.collection(`${applicationId}_connectors`);
      
      // Validate the connector
      if (!connectorData.name) {
        throw new Error('Connector name is required');
      }
      if (!connectorData.driver) {
        throw new Error('Connector driver is required');
      }
      
      const newConnector: any = {
        name: connectorData.name,
        driver: connectorData.driver,
        description: connectorData.description || '',
        properties: connectorData.properties || {},
        collections: connectorData.collections || {},
        organizationId: connectorData.organizationId,
        applicationId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Insert the new connector
      const result = await connectorsCollection.insertOne(newConnector);
      
      // Return the created connector
      const createdConnector = await connectorsCollection.findOne({ _id: result.insertedId });
      return createdConnector;
    } catch (error) {
      console.error(`Error adding connector for ${applicationId}:`, error);
      throw error;
    }
  }
  
  // Update a connector
  async updateConnector(applicationId: string, connectorId: string, connectorData: any) {
    try {
      const connectorsCollection = this.db.collection(`${applicationId}_connectors`);
      
      const updateData: any = {
        ...connectorData,
        updatedAt: new Date()
      };
      
      let objectId: ObjectId;
      try {
        // Try to convert to ObjectId
        objectId = new ObjectId(connectorId);
      } catch (idError) {
        throw new Error('Invalid connector ID format');
      }
      
      const result = await connectorsCollection.updateOne(
        { _id: objectId },
        { $set: updateData }
      );
      
      if (result.matchedCount === 0) {
        return null;
      }
      
      // Return the updated connector
      const updatedConnector = await connectorsCollection.findOne({ _id: objectId });
      if (updatedConnector) {
        const { _id, ...connector } = updatedConnector;
        return connector;
      }
      return null;
    } catch (error) {
      console.error(`Error updating connector ${connectorId} for ${applicationId}:`, error);
      throw error;
    }
  }
  
  // Delete a connector
  async deleteConnector(applicationId: string, connectorId: string) {
    try {
      const connectorsCollection = this.db.collection(`${applicationId}_connectors`);
      
      let objectId: ObjectId;
      try {
        // Try to convert to ObjectId
        objectId = new ObjectId(connectorId);
      } catch (idError) {
        throw new Error('Invalid connector ID format');
      }
      
      const result = await connectorsCollection.deleteOne({ _id: objectId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error(`Error deleting connector ${connectorId} for ${applicationId}:`, error);
      throw error;
    }
  }

}


// Export for use in other files
export { ApplicationManager };

