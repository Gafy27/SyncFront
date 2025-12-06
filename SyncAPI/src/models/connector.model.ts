import mongoose, { Document, Schema } from 'mongoose';

export interface IConnectorCollection{
  used: boolean;
  variables: Record<string, { label: string }>;
}

export interface IConnector extends Document {
  name: string;
  driver: string; // Flexible driver field - can be 'fanuc', 'mtconnect', 'abb', 'kuka', 'universal_robots', 'yaskawa', etc.
  description?: string;
  properties: Record<string, any>;
  applicationId?: string;
  organizationId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ConnectorCollectionSchema = new Schema<IConnectorCollection>({
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
    required: true
  },
  description: { type: String },
  properties: {
    type: Schema.Types.Mixed,
    required: true,
    default: {}
  },
  applicationId: { type: String },
  organizationId: { type: String }
}, {
  timestamps: true,
  collection: 'connectors'
});

export const Connector = mongoose.model<IConnector>('Connector', ConnectorSchema);

