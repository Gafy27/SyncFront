
import { pgTable, text, serial, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===
export const workflows = pgTable("workflows", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  // Storing window config structure: { type: "stepping", triggers: ["m30"] }
  windowConfig: jsonb("window_config").$type<{
    type: string;
    triggers?: string[];
    [key: string]: any;
  }>().default({ type: "tumbling" }),
});

export const tables = pgTable("tables", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id").references(() => workflows.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  upsertConstraints: text("upsert_constraints").array(),
  timeColumn: text("time_column"),
  functionType: text("function_type").default("sql"),
  definition: text("definition").notNull(), // The SQL code
});

// === RELATIONS ===
export const workflowsRelations = relations(workflows, ({ many }) => ({
  tables: many(tables),
}));

export const tablesRelations = relations(tables, ({ one }) => ({
  workflow: one(workflows, {
    fields: [tables.workflowId],
    references: [workflows.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertWorkflowSchema = createInsertSchema(workflows).omit({ id: true });
export const insertTableSchema = createInsertSchema(tables).omit({ id: true });

// === EXPLICIT API CONTRACT TYPES ===
export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type Table = typeof tables.$inferSelect;
export type InsertTable = z.infer<typeof insertTableSchema>;

// Request types
export type CreateWorkflowRequest = InsertWorkflow;
export type UpdateWorkflowRequest = Partial<InsertWorkflow>;
export type CreateTableRequest = InsertTable;
export type UpdateTableRequest = Partial<InsertTable>;

// Extended types for responses
export type WorkflowWithTables = Workflow & { tables: Table[] };

// YAML Export/Import types
export interface YamlImportRequest {
  yamlContent: string;
}

export interface YamlExportResponse {
  yamlContent: string;
}
