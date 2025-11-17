import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  organizationId: varchar("organization_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  description: text("description"),
  organizationId: varchar("organization_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const machines = pgTable("machines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  machineId: text("machine_id").notNull(),
  name: text("name"),
  applicationId: varchar("application_id").notNull(),
  events: jsonb("events").notNull(),
  properties: jsonb("properties").notNull(),
  connectors: text("connectors").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const eventClasses = pgTable("event_classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  className: text("class_name").notNull(),
  topic: text("topic").notNull(),
  type: text("type").notNull(),
  authValues: text("auth_values").array(),
  valuesRange: jsonb("values_range"),
  containValues: text("contain_values").array(),
  applicationId: varchar("application_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const functions = pgTable("functions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  code: text("code"),
  applicationId: varchar("application_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const gateways = pgTable("gateways", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  status: text("status").notNull(),
  location: text("location"),
  connectedDevices: integer("connected_devices").notNull().default(0),
  lastSeen: timestamp("last_seen").notNull(),
  organizationId: varchar("organization_id").notNull(),
});

export const edges = pgTable("edges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  status: text("status").notNull(),
  location: text("location"),
  type: text("type").notNull(),
  lastSeen: timestamp("last_seen").notNull(),
  organizationId: varchar("organization_id").notNull(),
});

export const devices = pgTable("devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  lastSeen: timestamp("last_seen").notNull(),
  gatewayId: varchar("gateway_id"),
  payload: text("payload"),
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull(),
  deviceId: varchar("device_id").notNull(),
  type: text("type").notNull(),
  payload: text("payload"),
  gatewayId: varchar("gateway_id"),
});

export const aiModels = pgTable("ai_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  accuracy: text("accuracy"),
  lastTrained: timestamp("last_trained"),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertApplicationSchema = createInsertSchema(applications).omit({ id: true, createdAt: true });
export const insertMachineSchema = createInsertSchema(machines).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEventClassSchema = createInsertSchema(eventClasses).omit({ id: true, createdAt: true });
export const insertFunctionSchema = createInsertSchema(functions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGatewaySchema = createInsertSchema(gateways).omit({ id: true });
export const insertEdgeSchema = createInsertSchema(edges).omit({ id: true });
export const insertDeviceSchema = createInsertSchema(devices).omit({ id: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true });
export const insertAiModelSchema = createInsertSchema(aiModels).omit({ id: true });

export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type Machine = typeof machines.$inferSelect;
export type EventClass = typeof eventClasses.$inferSelect;
export type Function = typeof functions.$inferSelect;
export type Gateway = typeof gateways.$inferSelect;
export type Edge = typeof edges.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type Event = typeof events.$inferSelect;
export type AiModel = typeof aiModels.$inferSelect;

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type InsertMachine = z.infer<typeof insertMachineSchema>;
export type InsertEventClass = z.infer<typeof insertEventClassSchema>;
export type InsertFunction = z.infer<typeof insertFunctionSchema>;
export type InsertGateway = z.infer<typeof insertGatewaySchema>;
export type InsertEdge = z.infer<typeof insertEdgeSchema>;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertAiModel = z.infer<typeof insertAiModelSchema>;
