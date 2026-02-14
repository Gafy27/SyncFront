# Data Model and Relations — For Python Modeling

This document describes all entities, where they live, how they relate, and what is poorly or implicitly modeled so you can design clean Python models.

---

## 1. Entity Summary

| Entity           | Has explicit model? | Stored in | Scope |
|------------------|---------------------|-----------|--------|
| Organization      | No                  | MongoDB DB name + `config` doc | Top-level tenant |
| Application       | No                  | `config` collection, key `applications` | Per organization |
| Device (legacy)   | Yes (Mongoose)      | Default DB, collection from schema | Global (no org) |
| Device (tenant)   | No (shape in code)  | `{applicationId}_devices` in org DB | Per application |
| Connector (org)   | Yes (Mongoose, optional use) | Org DB `connectors` or default DB `connectors` | Per organization |
| Connector (app)   | No                  | `{applicationId}_connectors` in org DB | Per application |
| ServiceConfig     | Yes (Mongoose)      | Default DB, collection `services` | Global |
| Event (on device) | Inline in Device    | Embedded in device doc | Per device |
| EventClass        | No                  | Org DB `monitoreo-cnc_events` | Per application |
| Function          | No                  | Org DB `functions` | Per application |
| User              | No                  | Org DB `users` | Per organization |
| Gateway           | No                  | Org DB `gateways` | Per organization |
| Config (key-value)| No                  | Org DB `config` and `{applicationId}_config` | Org + app |

---

## 2. Organization

- **Not a document.** The “organization” is the **MongoDB database name** (e.g. `organizationId`).
- **Metadata** is stored in that DB in collection `config`: one document with `key: 'organization'`, `value: { organizationId?, organizationName?, name?, description?, email?, website?, status?, ... }`.
- **Relations:** An organization “has” applications (via config), users, gateways, and org-level connectors.

**Python:** Model as an entity with `id` = database name. Load/save metadata from `config` collection, or use a proper `organizations` collection and keep `config` for backward compatibility.

---

## 3. Application (Not Modeled — Important)

- **No schema or model.** Applications are stored inside the organization’s `config` collection:
  - Document: `{ key: 'applications', value: { ... } }`
  - `value.availableApplications`: array of application IDs
  - `value.defaultApplication`: one application ID
  - `value.applicationSettings`: map of `applicationId -> { name, description, status, collections[], createdAt?, updatedAt? }`
- **Creating an application** adds an entry to that structure and creates collections `{applicationId}_devices` and `{applicationId}_config`.
- **Deleting** removes the entry and drops `{applicationId}_devices` and `{applicationId}_config` (not `{applicationId}_connectors` in the current code).

**Python:** Define an explicit **Application** model (e.g. Pydantic + repository). Fields: `application_id`, `name`, `description`, `status`, `collections`, `organization_id` (DB name), timestamps. Persist either in a dedicated `applications` collection or keep the current `config` layout and hide it behind the repository.

---

## 4. Device

Two separate usages:

### 4.1 Legacy device (Mongoose model)

- **Model:** `src/models/device.model.ts`
- **Collection:** default MongoDB (Mongoose connection), collection name from schema (default `devices`).
- **Fields:** `machineId` (unique), `name`, `connectors[]`, `events[]` (embedded), `properties`, `applicationId?`, `organizationId?`, timestamps.
- **Embedded Event:** `{ id, label?, class }`
- Used by **`/device`** routes (create, get by machineId, update, delete, and Influx queries by `machineId`). No `organizationId` in the path.

### 4.2 Tenant device (no model)

- **Stored in:** organization DB, collection `{applicationId}_devices`.
- **Shape (from DeviceManager):** `machineId`, `name`, `connectors[]`, `events[]`, `properties`, `organizationId`, `applicationId`, `createdAt`, `updatedAt`.
- Same logical shape as the Mongoose device but stored per application. Used by **`/api/organizations/:organizationId/...`** and **`/api/applications/:organizationId/applications/:applicationId/devices`**.

**Python:** One **Device** model (e.g. Pydantic) with: `machine_id`, `name`, `connectors`, `events`, `properties`, `application_id`, `organization_id`, timestamps. Use two repositories or backends: one for legacy (single DB) and one for tenant (org DB + `{application_id}_devices`). Optionally unify later with a single API that always uses org + application.

---

## 5. Connector

- **Mongoose model:** `src/models/connector.model.ts` — `name`, `driver`, `description?`, `properties`, `collections?` (map of collection name -> `{ used, variables }`), `applicationId?`, `organizationId?`, timestamps. Collection name: `connectors`.
- **Where used:**
  - **Org-level:** Organization DB collection `connectors` (routes under `/api/organizations/:organizationId/connectors`). No formal model in code; raw insert/update.
  - **App-level:** Organization DB collection `{applicationId}_connectors`. Same logical shape; ID is MongoDB `_id`. Handled by **ApplicationManager** (add/update/delete by `_id`).

So connectors are **either** org-scoped **or** app-scoped; the schema is the same, the collection name and API path differ.

**Python:** One **Connector** model. Two storage targets: `connectors` in org DB (org-scoped) and `{application_id}_connectors` in org DB (app-scoped). Use `organization_id` and optional `application_id` to decide which collection to use.

---

## 6. ServiceConfig (Service)

- **Model:** `src/models/service.model.ts`
- **Collection:** default DB, name `services`.
- **Fields:** `name` (unique), `type` (enum: mqtt, kafka, influxdb, timescaledb_cloud, timescaledb, redis, topics), `enabled`, `configuration`, timestamps.
- **Scope:** Global; not tied to organization.

**Python:** Straightforward model + repository against a single “services” collection in the default DB.

---

## 7. EventClass (No model)

- **Stored in:** organization DB, collection **`monitoreo-cnc_events`** (name is hardcoded).
- **Shape:** `id`, `class` (or `className`), `topic`, `type`, `applicationId`, and for type `STR`: `auth_values[]`, for type `FLOAT`: `values_range[2]`, plus timestamps. Returned without `_id`, `applicationId`, timestamps in API.
- **Relation:** Belongs to an application (`applicationId`). Replaced in bulk via `setEventClasses` (delete all for app, then insert).

**Python:** **EventClass** model with `id`, `class`, `topic`, `type`, `application_id`, optional `auth_values` / `values_range`. Repository uses collection `monitoreo-cnc_events` and filters by `applicationId`. Consider renaming collection to something like `event_classes` and indexing by `application_id`.

---

## 8. Function (No model)

- **Stored in:** organization DB, collection **`functions`**.
- **Shape:** `id`, `name`, `type` (e.g. "Algebraic Function", "Counter"), `expression`, `variables[]`, `events[]`, `counter?`, `description?`, `applicationId`, timestamps.
- **Relation:** Belongs to an application. CRUD by `applicationId` + `functionId` (the `id` field).

**Python:** **Function** model with the same fields. Repository: collection `functions`, scope by `application_id`.

---

## 9. User (No model)

- **Stored in:** organization DB, collection **`users`**.
- **Shape (from routes):** `name`, `email`, `role`, `status`, `organizationId`, `createdAt`. API returns `id` (from `_id`), name, email, role, status, createdAt.
- **Relation:** Belongs to one organization (the DB).

**Python:** **User** model; repository uses org DB `users` collection.

---

## 10. Gateway (No model)

- **Stored in:** organization DB, collection **`gateways`**.
- **Shape (from GatewayManager):** `gatewayId`, `name`, `location?`, `status?`, timestamps.
- **Relation:** Belongs to one organization.

**Python:** **Gateway** model; repository uses org DB `gateways` collection.

---

## 11. Config (Key-Value, No model)

- **Organization-level:** Org DB, collection **`config`**. Documents: `{ key, value }` (e.g. `organization`, `applications`).
- **Application-level:** Org DB, collection **`{applicationId}_config`**. Same key-value pattern. Used for “application config” (e.g. feature flags, settings).

**Python:** Either keep as key-value store (get/set by key) or introduce small domain objects (e.g. OrganizationConfig, ApplicationConfig) that map to these documents.

---

## 12. Relation Diagram (Logical)

```
Organization (DB)
├── config [organization, applications]
├── users
├── gateways
├── connectors (org-level)
├── monitoreo-cnc_events (by applicationId)
├── functions (by applicationId)
└── per-application:
    ├── {applicationId}_devices
    ├── {applicationId}_config
    └── {applicationId}_connectors

Default DB (Mongoose)
├── devices (legacy Device model)
└── services (ServiceConfig model)
```

---

## 13. InfluxDB (Time-Series, Not MongoDB Models)

- **Measurement / concepts:** `state` (e.g. power, execution, mode), `production` (op_code, piece_id, pieces_produced), `events` (event_value, etc.). Queries use `machine_id`, time ranges.
- **Optional:** `server__stats` bucket for CPU/RAM (measurements like `cpu`, `mem`).
- **Python:** No MongoDB-style “models” needed; define query DTOs or response schemas for each endpoint that returns Influx data.

---

## 14. Recommendations for Python

1. **Introduce an explicit Application model** and a single place (repository) that reads/writes the current `config.value.applicationSettings` (or a new `applications` collection).
2. **Unify Device:** One domain model, two persistence strategies (legacy collection vs `{applicationId}_devices`) until you can deprecate the legacy `/device` API.
3. **Model all “no model” entities:** EventClass, Function, User, Gateway; use Pydantic (or similar) and repositories that know collection names and org DB.
4. **Connector:** One model, two collection targets (org vs app) and clear naming in API (e.g. org vs app scope).
5. **Organization:** Represent as an entity with `id` = DB name; load/save metadata from `config`.
6. **Config:** Keep key-value semantics or wrap in small config objects; avoid scattering raw `config` access across the codebase.
7. **Naming:** Prefer `application_id` / `organization_id` and snake_case in Python; map to/from API camelCase at the boundary.
8. **EventClass collection:** Consider renaming `monitoreo-cnc_events` to `event_classes` and indexing by `application_id` for clarity and portability.

These points should be enough to model the domain and persistence in Python in a clear, maintainable way.
