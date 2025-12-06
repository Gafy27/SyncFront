import express, { Application, Request, Response, NextFunction, json } from "express";
import 'dotenv/config';
import cors from 'cors';

import { API_STATUS_RESPONSE } from "./constants/responses";
import { router as organizationRoutes } from "./routes/organization.routes";
import { router as applicationRoutes } from "./routes/application.routes";
import { router as deviceRoutes } from "./routes/device.routes";
import { router as servicesRoutes } from "./routes/services.routes";
import { router as iconsRoutes } from "./routes/icons.routes";
import { router as queryRoutes } from "./routes/query.routes";
import { errorHandler } from "./middlewares/errors";

const allowedOrigin = process.env.CORS_ALLOWED_ORIGIN;
const nodeEnv = process.env.NODE_ENV || 'development';

// In production, require CORS to be explicitly set for security
// In development, allow all origins for convenience
const corsOrigin = allowedOrigin 
  ? allowedOrigin.split(',').map(origin => origin.trim())
  : (nodeEnv === 'production' ? false : true);

if (!allowedOrigin && nodeEnv === 'production') {
  console.warn("WARNING: CORS_ALLOWED_ORIGIN not set in production. CORS will be disabled.");
}

console.log(`CORS configuration: ${Array.isArray(corsOrigin) ? corsOrigin.join(', ') : corsOrigin}`);
console.log(`Environment: ${nodeEnv}`);

const app: Application = express();

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/organizations", organizationRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/device", deviceRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api", iconsRoutes);
app.use("/api/query", queryRoutes);

app.use("/status", (req: Request, res: Response, next: NextFunction): void => {
  res.json( API_STATUS_RESPONSE );
});

app.use(errorHandler);

export default app;

