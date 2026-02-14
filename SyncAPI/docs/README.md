# Sync API Documentation (Python Rebuild Guide)

This folder contains documentation to rebuild the Sync API in Python. The original API is Node/Express with MongoDB and InfluxDB.

## Files

| File | Purpose |
|------|---------|
| **01-API-OVERVIEW.md** | High-level overview: purpose, tech stack, multi-tenancy, mount points, and conventions. |
| **02-DATA-MODEL-AND-RELATIONS.md** | All entities, where they are stored, relations, and what is **not modeled** (e.g. Application). Use this to define Python models and relations. |
| **03-ROUTES-REFERENCE.md** | Every route: method, path, and what it does. Use this to reimplement endpoints in Python. |
| **04-SERVICES-AND-INTERACTIONS.md** | How routes use managers and services, how they interact with MongoDB and InfluxDB, and data flow. Use this to replicate the same layering in Python. |
| **config-example.yaml** | YAML configuration examples: runtime/env, organization, applications, services, event classes, connector. Use for Python config or reference. |

## Suggested reading order

1. **01-API-OVERVIEW.md** — Understand the system and multi-tenancy.
2. **02-DATA-MODEL-AND-RELATIONS.md** — Design your Python models and persistence.
3. **03-ROUTES-REFERENCE.md** — Implement each endpoint.
4. **04-SERVICES-AND-INTERACTIONS.md** — Wire services/repositories and DB connections.

## Quick takeaways for Python

- **Organization** = MongoDB database name; metadata in `config` collection.
- **Application** has no model; it lives inside `config.value.applicationSettings`. You should introduce an explicit Application model in Python.
- **Devices** exist in two ways: legacy (single DB, Mongoose) and tenant (per-application collection in org DB). Unify behind one domain model and two persistence strategies.
- **Connectors** are either org-level (`connectors`) or app-level (`{applicationId}_connectors`); same shape.
- **Managers** use raw MongoDB (org DB); **services** use Mongoose (default DB) or InfluxDB. In Python, use repositories + Influx client and inject “current org DB” per request.
