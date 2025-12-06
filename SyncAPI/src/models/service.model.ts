import mongoose, { Document, Schema } from 'mongoose';

export interface IServiceConfig extends Document {
  name: string;
  type: 'mqtt' | 'kafka' | 'influxdb' | 'timescaledb_cloud' | 'timescaledb' | 'redis' | 'topics';
  enabled: boolean;
  configuration: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceConfigSchema = new Schema<IServiceConfig>({
  name: { type: String, required: true, unique: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['mqtt', 'kafka', 'influxdb', 'timescaledb_cloud', 'timescaledb', 'redis', 'topics'] 
  },
  enabled: { type: Boolean, default: true },
  configuration: {
    type: Schema.Types.Mixed,
    required: true
  }
}, {
  timestamps: true,
  collection: 'services'
});

export const ServiceConfig = mongoose.model<IServiceConfig>('Service', ServiceConfigSchema);

