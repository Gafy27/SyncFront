# Services and Interactions

How routes use managers and services, and how data flows. Use this to replicate the same layering in Python.

---

## 1. Layering Overview

```
Request
   → Route (Express)
   → Middleware (e.g. connectToOrganizationDb)
   → Manager (lib/) or Service (services/) or direct DB/Influx
   → MongoDB or InfluxDB
   → Response
```

- **Routes** handle HTTP, params, body, and call either a **Manager** (lib) or a **Service** (services), or sometimes raw DB/Influx.
- **Managers** use the **native MongoDB driver** (`Db`, collections). They are instantiated per request with the org DB when the route is organization-scoped.
- **Services** use **Mongoose** (default DB) or **InfluxDB client**, and are usually singletons or stateless functions.

---

## 2. Managers (lib/)

Managers are classes that take a MongoDB `Db` (and sometimes other deps) and perform operations. They do **not** use Mongoose models except where noted.

| Manager | Constructor | Used by | Purpose |
|---------|-------------|---------|---------|
| **OrganizationManager** | `(db: Db)` | organization.routes | Organization config (get/update), stats, org-level connectors (getConnectors). Uses `db.collection('config')`, `db.collection('connectors')`. |
| **ApplicationManager** | `(db: Db)` | application.routes, organization.routes | Applications CRUD (stored in config key `applications`), application config, stats, event classes (`monitoreo-cnc_events`), functions (`functions`), app-level connectors (`{applicationId}_connectors`). Uses `db.collection('config')` and dynamic collection names. |
| **DeviceManager** | `(db: Db)` | application.routes, organization.routes | Devices in `{applicationId}_devices`: getDevices, getDeviceByMachineId, addDevice, updateDevice, deleteDevice, getDeviceCount, getDevicesPaginated, getAllProperties. |
| **GatewayManager** | `(db: Db)` | organization.routes | Gateways in `gateways`: listGateways, addGateway. |
| **ConfigManager** | Not used by routes in current code | — | Key-value config in `config`: getConfig, setConfig, getConfigsByCategory, getAllConfigs, deleteConfig, and helpers (getAppConfig, getDatabaseConfig, etc.). Available for future or internal use. |

**Interaction pattern:** Route gets `(req as any).organizationDb` from middleware, then `new SomeManager(organizationDb)` and calls methods. No shared connection pool; each request opens and closes a MongoClient for org-scoped routes.

---

## 3. Services (services/)

### 3.1 devices.service.ts

- **Stateless functions** (no class). Used by **device.routes** only.
- **queryStatusByMachineId(machineId):** Runs InfluxDB SQL on default client (measurement `state`, field `power`, filter `machine_id`, limit 1). Returns single row or null.
- **queryEventsByMachineId(machineId):** Runs InfluxDB SQL (union of `state`, `production`, `events` over last 24h, filter by machine_id, limit 20). Returns array of rows.
- **Dependency:** `influxClient` from `lib/influxClient.ts` (default bucket from env).

**Interaction:** Route receives `machineId` from path, calls one of these functions, returns JSON. No MongoDB in this service.

### 3.2 services.service.ts

- **Class ServicesService** (exported as default singleton). Used by **services.routes**.
- **Uses Mongoose:** `ServiceConfig` model (collection `services` in **default** MongoDB).
- **Methods:** getAllServices, getServiceById, createService, updateService, deleteService. All go through ServiceConfig.find/findById/findByIdAndUpdate/findByIdAndDelete.
- **Interaction:** Routes call e.g. `servicesService.getAllServices()`. No organizationId; single global DB.

### 3.3 query.service.ts (file name: query,service.ts)

- **Stateless functions** only. Used by **query.routes**.
- **MongoDB:** Receives `Db` from route (after connectToOrganizationDb) for `queryDevicesRegistered(db)`. Others that need MongoDB create their own MongoClient and iterate over all DBs: `queryAllDevicesRegistered`, `queryAllApplications`, `queryApplicationsRegistered`.
- **InfluxDB:** Default `influxClient` for: queryEvents, queryDevicesConnected, queryEventsProcessed24h, queryEventsProcessed, queryStorage. Separate bucket via `createInfluxClientForBucket('server__stats')` for queryCPU, queryRAM.
- **Interaction:**
  - `/api/query/registered` passes `organizationDb` into `queryDevicesRegistered(organizationDb)`.
  - `/api/query/registered/all`, `/apps-registered`, `/applications` call functions that open MongoClient, list databases, and query each org DB (config → applications → device counts).
  - Events/CPU/RAM/storage routes call Influx functions directly; no MongoDB in those handlers.

---

## 4. InfluxDB Client (lib/influxClient.ts)

- **Default client:** Built from env: `INFLUXDB_HOST`, `INFLUXDB_TOKEN`, `INFLUXDB_DATABASE`. Used by devices.service and most of query.service.
- **createInfluxClientForBucket(bucketName):** Returns a second client with same host/token but different database (e.g. `server__stats`). Used for CPU and RAM queries.
- **Interaction:** Services import the client and run `.query(sql)`. Results are async iterables; code collects rows into arrays and sometimes converts BigInt to number for JSON.

---

## 5. Middleware and DB Connection

### connectToOrganizationDb (organization.routes and application.routes)

- Reads `req.params.organizationId` (and in query.routes, `req.query.organizationId` with default `autentiodev`).
- Connects: `MongoClient.connect(mongoUri)` then `client.db(organizationId)`.
- Attaches: `(req as any).organizationDb = db`, `(req as any).mongoClient = client`.
- On error: responds 500 and does not call `next()`.
- **Important:** The same middleware (and closeOrganizationDb) is duplicated in organization.routes, application.routes, and query.routes. Each route file that needs org DB defines its own. In Python you’d centralize this (e.g. dependency that opens org DB and injects it into handlers).

### closeOrganizationDb

- Called in `finally` (or after handler). Does `mongoClient.close()`. Ensures connection is closed after each request.

---

## 6. Where Mongoose Is Used

- **server.ts:** `mongoose.connect(MONGO_URL)` — single connection to default DB (same MONGODB_URI).
- **Models:** Only **Device** (device.model.ts) and **ServiceConfig** (service.model.ts) are used by the app. **Connector** model exists but org/app connector CRUD uses raw MongoDB in ApplicationManager and organization.routes, not the Connector model.
- **Usage:** Device: device.routes (legacy `/device` CRUD). ServiceConfig: services.service.ts (all service CRUD). So Mongoose is only for the default DB and only for `devices` and `services` collections.

---

## 7. Data Flow Examples

### Create application (organization.routes)

1. POST `/api/organizations/:organizationId/applications`, body: applicationId, name, description, status.
2. Middleware: connect to MongoDB, set req.organizationDb.
3. Handler: `new ApplicationManager(organizationDb)`, `applicationManager.addApplication(applicationData)`.
4. ApplicationManager: reads/upserts config key `applications` (value.applicationSettings[applicationId], value.availableApplications, etc.).
5. Handler: creates collections `{applicationId}_devices`, `{applicationId}_config`.
6. finally: closeOrganizationDb.

### Get devices for application (organization.routes or application.routes)

1. GET `.../applications/:applicationId/devices`.
2. Middleware: connect to org DB.
3. Handler: `new DeviceManager(organizationDb)`, `deviceManager.getDevices(applicationId)`.
4. DeviceManager: `db.collection(\`${applicationId}_devices\`).find({}).toArray()`.
5. Response: JSON array of devices.

### Device events (device.routes)

1. GET `/device/:machineId/events`.
2. No org DB; no middleware.
3. Handler: `queryEventsByMachineId(machineId)` from devices.service.
4. devices.service: builds Influx SQL, `influxClient.query(sql)`, collect rows, return.
5. Response: JSON array of event rows.

### Registered devices count for one org (query.routes)

1. GET `/api/query/registered?organizationId=xxx`.
2. Middleware: connect to org DB using organizationId from query (default autentiodev).
3. Handler: `queryDevicesRegistered(organizationDb)`.
4. query.service: configCollection.findOne({ key: 'applications' }), get application IDs, for each app countDocuments on `{appId}_devices`, sum.
5. Response: `{ count }`.

---

## 8. Summary for Python

- **Managers → Repositories or use-cases:** One “manager” per domain (Organization, Application, Device, Gateway). Each gets a DB (or session) for the current org. In Python you can do the same with a “get_org_db(organization_id)” that returns a PyMongo database or repository factory.
- **Services → Query/read services:** devices.service and query.service are either Influx-only or MongoDB + Influx. In Python, keep Influx logic in a small client module and MongoDB aggregation in repositories or query modules.
- **Middleware → Dependency injection:** Instead of attaching DB to request, you can inject “current org DB” or “current organization_id” into handlers (e.g. FastAPI dependencies).
- **Two DBs:** “Default” DB for legacy devices and service configs; “org DB” for everything else. In Python, two entry points: one for default DB (e.g. Mongoose-equivalent or PyMongo for `devices` and `services`), one for org DB (database name = organization_id).
- **Connector model:** The Connector Mongoose model exists but is not used by the org/app connector routes; they use raw collections. In Python, use one Connector domain model and two persistence paths (org collection vs app collection) as in 02-DATA-MODEL-AND-RELATIONS.md.

This should be enough to mirror the current services and interactions in a Python API.
