import mongoose, { Document, Schema } from 'mongoose';

export interface IConnectorCategory {
  used: boolean;
  variables: Record<string, { label: string }>;
}

export interface ICNCConnector extends Document {
  name: string;
  driver: 'fanuc' | 'mtconnect';
  description: string;
  categories: {
    PRODUCTION?: IConnectorCategory;
    STATE?: IConnectorCategory;
    AXIS?: IConnectorCategory;
    SPINDLE?: IConnectorCategory;
    ALARM?: IConnectorCategory;
    GCODE?: IConnectorCategory;

  };
}
export interface IROBOTConnector extends Document {
  name: string;
  driver: 'abb' | 'kuka' | 'universal_robots' | 'yaskawa';
  description: string;
  categories: {
    MOTION?: IConnectorCategory;
    STATUS?: IConnectorCategory;
    IO?: IConnectorCategory;
    JOINTS?: IConnectorCategory;
    TOOL?: IConnectorCategory;
    ALARM?: IConnectorCategory;
  };
}
const ConnectorCategorySchema = new Schema<IConnectorCategory>({
  used: { type: Boolean, required: true },
  variables: {
    type: Map,
    of: {
      label: { type: String, required: true }
    }
  }
}, { _id: false });

const ConnectorSchema = new Schema<IConnector>({
  name: { type: String, required: true, unique: true },
  driver: { 
    type: String, 
    required: true, 
    enum: ['fanuc', 'mtconnect'] 
  },
  description: { type: String, required: true },
  categories: {
    EXECUTION: ConnectorCategorySchema,
    MODE: ConnectorCategorySchema,
    PROGRAM: ConnectorCategorySchema
  }
}, {
  timestamps: true,
  collection: 'connectors'
});

export const Connector = mongoose.model<IConnector>('Connector', ConnectorSchema);

