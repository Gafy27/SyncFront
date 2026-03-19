"""
Seed connector_templates from bridge_model.py Pydantic definitions.

Each bridge type (except auth0, temporal, file) becomes one system template.
Variables are derived by introspecting the model's fields — sensitive fields
(password, secret, token) become SECRET type; port fields become PORT type, etc.

Template IDs are deterministic (uuid5) so re-seeding is idempotent.
"""

from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path
from typing import Any, get_args, get_origin
from uuid import NAMESPACE_DNS, uuid5
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from managers.config import ConfigManagerService

from pydantic_core import PydanticUndefinedType

from models.config.api.connector_template import (
    ConnectorTemplateType,
    TemplateVariable,
    VariableType,
)
from models.config.bridge_model import (
    BRIDGE_MODELS,
    BridgeBaseConfig,
    BType,
)

logger = logging.getLogger(__name__)

# Skip these bridge types entirely
_SKIP_TYPES = {BType.AUTH0, BType.TEMPORAL, BType.FILE}

# Fields inherited from BridgeBaseConfig that are infra-level, not user-facing
_BASE_FIELDS = set(BridgeBaseConfig.model_fields)

# Fields that are internal/advanced and not shown in the connector form
_SKIP_FIELDS = _BASE_FIELDS | {
    "schema_name",
    "sslmode",
    "time_series",
    "decode_responses",
    "debug",
    "tls_ca_cert",
    "tls_ca_cert_key",
    "log_level",
    "max_message_interval",
    "update_interval",
    "access_token",
    "storage_system",
    "config_url",
    "devices_endpoint",
    "disable",
}

# Human-readable names per bridge type
_NAMES: dict[str, str] = {
    "mqtt": "MQTT Broker",
    "kafka": "Apache Kafka",
    "http": "HTTP",
    "influxdb": "InfluxDB",
    "timescaledb": "TimescaleDB",
    "postgresql": "PostgreSQL",
    "redis": "Redis",
    "s3": "S3 / Object Storage",
    "tdengine": "TDengine",
    "s2": "S2 Stream",
    "supabase": "Supabase",
}

_DESCRIPTIONS: dict[str, str] = {
    "mqtt": "MQTT broker for IoT device communication.",
    "kafka": "Apache Kafka event streaming platform.",
    "http": "Generic HTTP client connector.",
    "influxdb": "InfluxDB time-series database.",
    "timescaledb": "TimescaleDB time-series extension for PostgreSQL.",
    "postgresql": "PostgreSQL relational database.",
    "redis": "Redis in-memory data store.",
    "s3": "S3-compatible object storage.",
    "tdengine": "TDengine high-performance time-series database.",
    "s2": "S2 streaming storage.",
    "supabase": "Supabase (PostgreSQL-based) backend.",
}

_TAGS: dict[str, list[str]] = {
    "mqtt": ["messaging", "iot", "broker"],
    "kafka": ["messaging", "streaming", "broker"],
    "http": ["http", "rest", "api"],
    "influxdb": ["database", "time-series"],
    "timescaledb": ["database", "time-series", "postgresql"],
    "postgresql": ["database", "sql"],
    "redis": ["database", "cache", "in-memory"],
    "s3": ["storage", "object-storage", "cloud"],
    "tdengine": ["database", "time-series"],
    "s2": ["streaming", "storage"],
    "supabase": ["database", "sql", "backend"],
}


def _unwrap_optional(annotation: Any) -> Any:
    """Return the inner type of Optional[X] / X | None, or annotation itself."""
    import types
    import typing
    origin = get_origin(annotation)
    if origin is typing.Union or isinstance(annotation, types.UnionType):
        args = get_args(annotation)
        non_none = [a for a in args if a is not type(None)]
        return non_none[0] if len(non_none) == 1 else annotation
    return annotation


def _field_to_variable(name: str, field_info: Any, order: int) -> TemplateVariable | None:
    if name in _SKIP_FIELDS:
        return None

    annotation = _unwrap_optional(field_info.annotation)

    # Determine VariableType by name convention first, then by Python type
    lower = name.lower()
    if any(kw in lower for kw in ("password", "secret", "token", "key")):
        vtype = VariableType.SECRET
    elif "port" == lower or lower.endswith("_port"):
        vtype = VariableType.PORT
    elif "url" in lower or "endpoint" in lower:
        vtype = VariableType.URL
    elif "path" in lower:
        vtype = VariableType.PATH
    elif annotation is bool:
        vtype = VariableType.BOOLEAN
    elif annotation is int:
        vtype = VariableType.INTEGER
    elif annotation is float:
        vtype = VariableType.FLOAT
    elif get_origin(annotation) is list:
        vtype = VariableType.ARRAY
    else:
        vtype = VariableType.STRING

    default = field_info.default
    if isinstance(default, PydanticUndefinedType):
        default = None
        required = field_info.default_factory is None
    else:
        required = False

    # Skip callable defaults (lambdas etc.)
    if callable(default):
        default = None

    label = name.replace("_", " ").title()
    description = field_info.description

    return TemplateVariable(
        name=name,
        label=label,
        type=vtype,
        description=description,
        required=required,
        default=default,
        order=order,
    )


def _build_template(btype_str: str, model: type[BridgeBaseConfig]) -> dict:
    """Build a connector_template record dict from a bridge model class."""
    variables: list[dict] = []
    for order, (name, field_info) in enumerate(model.model_fields.items()):
        var = _field_to_variable(name, field_info, order)
        if var is not None:
            variables.append(var.model_dump())

    template_id = str(uuid5(NAMESPACE_DNS, f"syncore.connector_template.{btype_str}"))

    return {
        "id": template_id,
        "slug": btype_str.replace("_", "-"),
        "name": _NAMES.get(btype_str, btype_str.title()),
        "description": _DESCRIPTIONS.get(btype_str),
        "version": "1.0.0",
        "type": ConnectorTemplateType.CONNECTOR.value,
        "variables": variables,
        "tags": _TAGS.get(btype_str, []),
        "is_public": True,
        "is_active": True,
        "organization_id": None,
        "connector_count": 0,
    }


async def seed_connector_templates(db) -> None:
    """
    Upsert system connector templates derived from bridge_model.py.
    Safe to call on every startup — uses replace (upsert) per template ID.
    Skips auth0, temporal, and file bridge types.
    """
    # Collect unique models to seed (supabase reuses PostgreSQLBridge)
    seen_types: set[str] = set()
    templates: list[dict] = []

    for btype_str, model in BRIDGE_MODELS.items():
        try:
            btype = BType(btype_str)
        except ValueError:
            continue
        if btype in _SKIP_TYPES or btype_str in seen_types:
            continue
        seen_types.add(btype_str)
        templates.append(_build_template(btype_str, model))

    for tmpl in templates:
        tmpl_id = tmpl["id"]
        await db.replace("connector_templates", tmpl_id, tmpl)
        logger.debug(f"Seeded connector template: {tmpl['slug']} ({tmpl_id})")

    logger.info(f"Seeded {len(templates)} connector templates")

if __name__ == "__main__":
    asyncio.run(seed_connector_templates(ConfigManagerService()))