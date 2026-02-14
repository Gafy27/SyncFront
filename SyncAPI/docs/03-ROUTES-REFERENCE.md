# Routes Reference

Every route, HTTP method, path, and what it does. Use this to reimplement the API in Python.

---

## Base URLs

- Organizations: `/api/organizations`
- Applications (alternate mount): `/api/applications`
- Legacy devices: `/device`
- Services: `/api/services`
- Icons: `/api`
- Query/analytics: `/api/query`
- Status: `/status`

---

## 1. Organizations (`/api/organizations`)

All organization routes use middleware that connects to MongoDB with `db(organizationId)` and closes the client after the handler. Replace `:organizationId` with the actual database name.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List organizations. Lists MongoDB databases (excluding admin, local, config). For each DB returns: id, name, sizeOnDisk, empty, applicationCount, userCount. |
| GET | `/:organizationId` | Get organization details. Reads config key `organization`; returns id, name, description, email, website. 404 if not found. |
| PUT | `/:organizationId` | Update organization. Body: name, description, email, website. Upserts config key `organization`. |
| GET | `/:organizationId/config` | Get organization config. Same as get organization (config key `organization`). |
| GET | `/:organizationId/users` | List users. Returns users from collection `users` (id, name, email, role, status, createdAt). |
| POST | `/:organizationId/users` | Create user. Body: name, email, role. Inserts into `users`; 400 if email exists. |
| GET | `/:organizationId/gateways` | List gateways. Uses GatewayManager, collection `gateways`. |
| POST | `/:organizationId/gateways` | Create gateway. Body: gatewayId, name, location?, status?. Uses GatewayManager. |
| GET | `/:organizationId/applications` | List applications. ApplicationManager.getApplications() then for each app DeviceManager.getDeviceCount(). Returns array with applicationId, name, description, status, deviceCount, lastModified. |
| POST | `/:organizationId/applications` | Create application. Body: applicationId, name, description?, status?. ApplicationManager.addApplication(); creates collections `{applicationId}_devices`, `{applicationId}_config`. |
| GET | `/:organizationId/applications/:applicationId` | Get one application. ApplicationManager.getApplication(applicationId). Returns applicationId + app settings. |
| PUT | `/:organizationId/applications/:applicationId` | Update application. Body: name, description, status. ApplicationManager.updateApplication. |
| DELETE | `/:organizationId/applications/:applicationId` | Delete application. ApplicationManager.deleteApplication; drops `{applicationId}_devices`, `{applicationId}_config`. |
| GET | `/:organizationId/applications/:applicationId/devices` | List devices for application. DeviceManager.getDevices(applicationId) from `{applicationId}_devices`. |
| POST | `/:organizationId/applications/:applicationId/devices` | Create device. Body must include machineId. DeviceManager.addDevice; 400 if duplicate machineId. |
| GET | `/:organizationId/applications/:applicationId/devices/:machineId` | Get device by machineId. DeviceManager.getDeviceByMachineId. |
| PUT | `/:organizationId/applications/:applicationId/devices/:machineId` | Update device. DeviceManager.updateDevice. |
| DELETE | `/:organizationId/applications/:applicationId/devices/:machineId` | Delete device. DeviceManager.deleteDevice. |
| GET | `/:organizationId/applications/:applicationId/properties` | Get all properties from all devices in the application. DeviceManager.getAllProperties (unique property keys and which machines have each). |
| GET | `/:organizationId/stats` | Organization stats. OrganizationManager.getOrganizationStats (org info, application count, total devices, applicationsList with deviceCount). |
| GET | `/:organizationId/connectors` | List org-level connectors. Reads collection `connectors` in org DB (no filter). |
| GET | `/:organizationId/connectors/:connectorId` | Get connector by ID. connectorId as MongoDB ObjectId; collection `connectors`. |
| POST | `/:organizationId/connectors` | Create org-level connector. Body: name, driver required; plus description, properties, collections. Inserts into `connectors` with organizationId, timestamps. |
| GET | `/:organizationId/oilmonitor_devices` | Raw list of documents from collection `oilmonitor_devices` in org DB. |

---

## 2. Applications (`/api/applications`)

Same multi-tenant pattern: middleware connects to `db(organizationId)`. These routes overlap with organization routes for devices/config/event-classes/functions/connectors but are mounted under `/api/applications`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/test` | Test route; returns `{ message: "Application routes are working!" }`. |
| GET | `/:organizationId/applications/:applicationId/devices` | Same as org route: list devices for application (DeviceManager). |
| POST | `/:organizationId/applications/:applicationId/devices` | Same as org: create device. Body must include machine_id (note: snake_case here). |
| GET | `/:organizationId/applications/:applicationId/config` | Get application key-value config. ApplicationManager.getApplicationConfig (collection `{applicationId}_config`). |
| GET | `/:organizationId/applications/:applicationId/stats` | Application stats. ApplicationManager.getApplicationStats (deviceCount, lastActivity). |
| GET | `/:organizationId/applications/:applicationId/event-classes` | List event classes. ApplicationManager.getEventClasses (collection `monitoreo-cnc_events`, filter applicationId). |
| POST | `/:organizationId/applications/:applicationId/event-classes` | Add one event class. Body: class/className, topic, type; optional id, auth_values (STR), values_range (FLOAT). ApplicationManager.addEventClass. |
| PUT | `/:organizationId/applications/:applicationId/event-classes` | Replace all event classes. Body: array of event classes. ApplicationManager.setEventClasses (delete many then insert). |
| GET | `/:organizationId/applications/:applicationId/functions` | List functions. ApplicationManager.getFunctions (collection `functions`, filter applicationId). |
| POST | `/:organizationId/applications/:applicationId/functions` | Create function. Body: name, expression, variables[]; optional id, type, events, counter, description. ApplicationManager.addFunction. |
| PUT | `/:organizationId/applications/:applicationId/functions/:functionId` | Update function. ApplicationManager.updateFunction(applicationId, functionId, body). |
| DELETE | `/:organizationId/applications/:applicationId/functions/:functionId` | Delete function. ApplicationManager.deleteFunction. |
| GET | `/:organizationId/applications/:applicationId/connectors` | List app-level connectors. ApplicationManager.getConnectors (collection `{applicationId}_connectors`). |
| POST | `/:organizationId/applications/:applicationId/connectors` | Create app-level connector. Body: name, driver required. ApplicationManager.addConnector. |
| PUT | `/:organizationId/applications/:applicationId/connectors/:connectorId` | Update app-level connector. connectorId is MongoDB _id. ApplicationManager.updateConnector. |

Note: There is no DELETE for app-level connectors in the current code.

---

## 3. Legacy devices (`/device`)

Uses **default MongoDB** (Mongoose) and **Device** model. No organization in the path. Influx queries use the default Influx client.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/:machineId` | Get device by machineId. Device.findOne({ machineId }). 404 if not found. |
| POST | `/new` | Create device. Body: machineId required; plus name, connectors, events, properties. Mongoose Device.save(); 400 if duplicate machineId. |
| PUT | `/:machineId` | Update device. Device.findOneAndUpdate({ machineId }, body, { new: true }). |
| DELETE | `/:machineId` | Delete device. Device.findOneAndDelete({ machineId }). |
| GET | `/:machineId/events` | Query InfluxDB for events by machineId (last 24h, limit 20). devices.service.queryEventsByMachineId. |
| GET | `/:machineId/status` | Query InfluxDB for latest power status. devices.service.queryStatusByMachineId. Returns { power } or { power: null }. 503 on Influx connection errors. |

---

## 4. Services (`/api/services`)

Uses **Mongoose ServiceConfig** on the **default DB**, collection `services`. ID in path is Mongoose document `_id`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all services. servicesService.getAllServices(); sorted by updatedAt desc. |
| GET | `/:id` | Get service by id. servicesService.getServiceById(id). 404 if not found. |
| POST | `/` | Create service. Body: name, type, configuration required; enabled optional. 409 if name already exists. |
| PUT | `/:id` | Update service. servicesService.updateService(id, body). 404 if not found. |
| PATCH | `/:id/toggle` | Toggle enabled. Body: { enabled: boolean }. 400 if enabled not boolean. |
| DELETE | `/:id` | Delete service. servicesService.deleteService(id). 204 on success, 404 if not found. |

---

## 5. Icons (`/api`)

Serves and uploads icon files under `resources/icons/`. Categories (e.g. `connectors`, `drivers`) are subdirectories.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/library/:category/:name/icon` | Serve icon. Tries svg, png, jpg, jpeg in that order. Path: `resources/icons/{category}/{name}.{ext}`. Sets Content-Type. 404 if no file. |
| GET | `/library/:category/:name/icon/:format` | Serve icon in requested format (png, svg, jpg, jpeg). 400 if invalid format. |
| POST | `/library/:category/:name/icon` | Upload icon. Multer single file field `icon`. Saves to category dir as `{name}.{ext}`. Returns path, filename, category, name. |
| POST | `/library/upload` | Upload icon. Body: category?, name?; file field `icon`. Same storage logic; returns path, filename, category, name. |

---

## 6. Query / Analytics (`/api/query`)

Most routes use the **default InfluxDB** client. `/registered` uses query param `organizationId` (default `autentiodev`) to connect to that org’s MongoDB.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/registered` | Registered devices count for one org. Query param: organizationId. connectToOrganizationDb then queryDevicesRegistered(organizationDb). Returns { count }. |
| GET | `/registered/all` | Total registered devices across all org DBs. queryAllDevicesRegistered(). Returns { count }. |
| GET | `/connected` | Connected devices count from InfluxDB (state, power=true, last 1 day, distinct machine_id). queryDevicesConnected(). Returns { count }. |
| GET | `/apps-registered` | Total applications count across all org DBs. queryApplicationsRegistered(). Returns { count }. |
| GET | `/applications` | List all applications across all org DBs. queryAllApplications(). Returns array with applicationId, name, description, status, deviceCount, organizationId. |
| GET | `/events/processed-24h` | Count of events in Influx in last 24h (union of state/production/events). queryEventsProcessed24h(). Returns { count }. |
| GET | `/events/processed` | Total count of events in Influx (same union, no time filter). queryEventsProcessed(). Returns { count }. |
| GET | `/events` | Recent events from Influx (last 24h, limit 20). queryEvents(). Returns array of rows. |
| GET | `/cpu` | Latest CPU usage from Influx bucket `server__stats`, measurement `cpu`. queryCPU(). Returns array of rows. |
| GET | `/ram` | Latest RAM usage from Influx bucket `server__stats`, measurement `mem`. queryRAM(). Returns array of rows. |
| GET | `/storage` | Estimated storage (GB) from events processed count * constant. queryStorage(). Returns { storage }. |

---

## 7. Status and health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/status` | Health check. Returns API_STATUS_RESPONSE constant (e.g. { ok: true } or similar). |

---

## Route overlap and quirks

- **Devices:** Same “list/create devices for an application” is exposed under both `/api/organizations/.../applications/.../devices` and `/api/applications/.../applications/.../devices`. Application routes use `machine_id` in POST body; organization routes use `machineId`. For Python, normalize to one canonical path and one body shape.
- **Connectors:** Org-level connectors live in `connectors` and are managed under `/api/organizations/:organizationId/connectors`. App-level connectors live in `{applicationId}_connectors` and are under `/api/applications/.../connectors`. There is no DELETE for app-level connectors in the current code.
- **Query** `/registered` uses `organizationId` from query string and opens that org’s DB; other query routes use Influx or cross-DB MongoDB.

Use this reference to implement each endpoint in Python with the same behavior and then refactor as needed (e.g. single device API, explicit Application model).
