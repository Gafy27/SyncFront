import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent {
    id: string;
    label?: string;
    class: string;
}

// Base device interface
export interface IDevice extends Document {
    machineId: string;
    name?: string;
    connectors: string[];
    events: IEvent[];
    properties: Record<string, any>;
    applicationId?: string;
    organizationId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}


const EventSchema = new Schema({
    id: { type: String, required: true },
    label: { type: String },
    class: { type: String, required: true }
}, { _id: false });

const DeviceSchema: Schema = new Schema({
    machineId: { 
        type: String, 
        required: true, 
        unique: true,
        index: true
    },
    name: { type: String },
    connectors: { 
        type: [String], 
        default: [] 
    },
    events: { 
        type: [EventSchema], 
        required: true,
        default: []
    },
    properties: { 
        type: Schema.Types.Mixed, 
        required: true,
        default: {}
    },
    applicationId: { type: String },
    organizationId: { type: String }
}, {
    timestamps: true
});

export default mongoose.model<IDevice>('Device', DeviceSchema);

