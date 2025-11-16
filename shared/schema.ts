import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const devices = pgTable("devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  lastSeen: timestamp("last_seen").notNull(),
  gatewayId: varchar("gateway_id"),
  payload: text("payload"),
});

export const gateways = pgTable("gateways", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  status: text("status").notNull(),
  location: text("location"),
  connectedDevices: integer("connected_devices").notNull().default(0),
  lastSeen: timestamp("last_seen").notNull(),
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull(),
  deviceId: varchar("device_id").notNull(),
  type: text("type").notNull(),
  payload: text("payload"),
  gatewayId: varchar("gateway_id"),
});

export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  description: text("description"),
});

export const aiModels = pgTable("ai_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  accuracy: text("accuracy"),
  lastTrained: timestamp("last_trained"),
});

export const insertDeviceSchema = createInsertSchema(devices).omit({ id: true });
export const insertGatewaySchema = createInsertSchema(gateways).omit({ id: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true });
export const insertApplicationSchema = createInsertSchema(applications).omit({ id: true });
export const insertAiModelSchema = createInsertSchema(aiModels).omit({ id: true });

export type Device = typeof devices.$inferSelect;
export type Gateway = typeof gateways.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type AiModel = typeof aiModels.$inferSelect;

export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type InsertGateway = z.infer<typeof insertGatewaySchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type InsertAiModel = z.infer<typeof insertAiModelSchema>;
