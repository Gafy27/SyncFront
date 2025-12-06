import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file from SyncAPI directory first
config({ path: resolve(__dirname, '../.env') });

import mongoose from "mongoose";
import app from "./app";

const MONGO_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const PORT: Number = parseInt(process.env.PORT || '3000', 10);

try {
  mongoose
    .connect(MONGO_URL)
    .then(() => {
      console.log('Connected to MongoDB.');
      app.listen(PORT, '0.0.0.0', (): void => {
        console.log(`Sync API running on port ${PORT} (accessible from all interfaces)`);
        console.log(`MongoDB URI: ${MONGO_URL}`);
      });
    })
    .catch((error) => {
      console.error('Unable to connect to MongoDB:', error);
      process.exit(1);
    });
} catch (error) {
  console.error('Unable to connect to MongoDB:', error);
  process.exit(1);
}

