# Sync API — Overview

This document gives a high-level picture of the Sync API so you can rebuild it in Python.

## Purpose

The API is a **multi-tenant backend** for a Sync Admin Console. It manages:

- **Organizations** (tenants), each with their own MongoDB database
- **Applications** inside each organization (e.g. CNC monitoring, oil monitor)
- **Devices** (machines) and their **connectors**, **event classes**, **functions**
- **Service configs** (MQTT, Kafka, InfluxDB, etc.) stored in a shared MongoDB
- **Icons** (static files) and **query/analytics** endpoints (InfluxDB)

## Tech Stack

| Layer        | Technology |
|-------------|------------|
| Runtime     | Node.js |
| Framework   | Express |
| Primary DB  | MongoDB (one database per organization) |
| Time-series | InfluxDB 3 (SQL-like queries) |
| ODM         | Mongoose (only for `Device`, `ServiceConfig` in the *default* DB) |

## Multi-Tenancy

- **One MongoDB database per organization.** The database name is the `organizationId`.
- The app connects per-request: `MongoClient.connect(uri)` then `client.db(organizationId)`.
- Organization-scoped routes receive `:organizationId` and use it as the database name.
- System databases (`admin`, `local`, `config`) are excluded when listing organizations.

## Mount Points (from `app.ts`)

| Prefix                | Router              | Purpose |
|-----------------------|---------------------|--------|
| `/api/organizations`  | organization.routes | Orgs, apps, devices, users, gateways, connectors (org-scoped) |
| `/api/applications`   | application.routes | Same org/app scope; devices, config, event-classes, functions, connectors (app-scoped) |
| `/device`             | device.routes       | Legacy device CRUD + Influx queries by `machineId` (no org in path) |
| `/api/services`       | services.routes     | Service config CRUD (Mongoose, default DB) |
| `/api`                 | icons.routes        | Icon library (filesystem) |
| `/api/query`          | query.routes        | Analytics: registered/connected devices, events, CPU/RAM/storage |
| `/status`             | (inline)            | Health check |

## Important Conventions

- **Application** has no Mongoose/model definition. It lives as a document in the `config` collection (`key: 'applications'`). See **02-DATA-MODEL-AND-RELATIONS.md**.
- **Connectors** exist in two places: org-level collection `connectors` and per-application collections `{applicationId}_connectors`. Same shape, different scope.
- **Devices** also exist in two ways: (1) Mongoose `Device` in the default DB (used by `/device` routes), (2) raw MongoDB in `{applicationId}_devices` per organization DB (used by organization/application routes).
- **InfluxDB** is used for time-series (state, production, events) and optional server stats (CPU, RAM). Connection uses `INFLUXDB_HOST`, `INFLUXDB_TOKEN`, `INFLUXDB_DATABASE`; some queries use another bucket (`server__stats`).

## Entrypoint and DB Connections

- **server.ts** loads `.env`, connects Mongoose to `MONGODB_URI` (default DB), then starts the Express app.
- Organization-scoped routes do **not** use that Mongoose connection for org data; they create a new `MongoClient` and use `db(organizationId)`.
- So you have:
  - **Default MongoDB** (Mongoose): `Device` (legacy), `ServiceConfig` (services collection).
  - **Per-organization MongoDB**: `config`, `{applicationId}_devices`, `{applicationId}_config`, `{applicationId}_connectors`, `gateways`, `users`, `monitoreo-cnc_events`, `functions`, etc.

For a Python port, you will need equivalent separation: one global connection or pool for “default” DB, and per-request or per-tenant connections using `organizationId` as the database name.
