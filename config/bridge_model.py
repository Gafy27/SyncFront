import os
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, model_validator


class BridgeBaseConfig(BaseModel): ...


class BType(Enum):
    """Bridge type, available types: [MQTT, KAFKA, HTTP, AUTH0, INFLUXDB, TIMESCALEDB, REDIS, S3, TDENGINE, S2, FILE, TEMPORAL]"""

    MQTT = "mqtt"
    KAFKA = "kafka"
    HTTP = "http"
    AUTH0 = "auth0"
    INFLUXDB = "influxdb"
    TIMESCALEDB = "timescaledb"
    REDIS = "redis"
    S3 = "s3"
    TDENGINE = "tdengine"
    S2 = "s2"
    FILE = "file"
    TEMPORAL = "temporal"
    POSTGRESQL = "postgresql"


class Environment(Enum):
    PROD = "prod"
    DEV = "dev"


class BNetwork(Enum):
    EXTERNAL = "external"
    DOCKER = "docker"
    LOCAL = "local"


class MQTTTopic(BaseModel):
    name: str = Field()
    decoder: str | None = Field(default=None)
    mappings: dict[str, str] | None = Field(default=None)

class MQTTBridge(BaseModel):
    type: BType = Field()
    host: str = Field()
    port: int = Field()
    topics: list[MQTTTopic] = Field()
    max_message_interval: int | None = Field(default=5)
    update_interval: int | None = Field(default=30)
    username: str | None = Field(default=None)
    password: str | None = Field(default=None)
    client_id: str | None = Field(default=None)
    keepalive: int | None = Field(default=60)
    qos: int | None = Field(default=0, ge=0, le=2)
    environments: list[Environment] = Field()
    active: bool = Field(default=True)
    network: BNetwork = Field(default=BNetwork.EXTERNAL)
    tls: bool | None = Field(default=False)
    tls_ca_cert: str | None = Field(default=None)
    tls_ca_cert_key: str | None = Field(default=None)  # Redis key for cert content


class KafkaBridge(BaseModel):
    type: BType = Field()
    url: str = Field()
    log_level: str | None = Field(default="INFO")
    offset: str | None = Field(default="latest")
    consumer_group: str = Field(default="test")
    environments: list[Environment] = Field()
    active: bool = Field(default=True)
    network: BNetwork = Field(default=BNetwork.DOCKER)


class NatsBridge(BaseModel):
    type: BType = Field()
    url: str = Field()
    log_level: str | None = Field(default="INFO")
    offset: str | None = Field(default="latest")
    consumer_group: str = Field(default="test")
    environments: list[Environment] = Field()
    active: bool = Field(default=True)
    network: BNetwork = Field(default=BNetwork.DOCKER)


class HTTPBridge(BaseModel):
    type: BType = Field()
    timeout: int | None = Field(default=30)
    retries: int | None = Field(default=3)
    retry_delay: int | None = Field(default=1)
    environments: list[Environment] = Field()
    active: bool = Field(default=True)
    network: BNetwork = Field(default=BNetwork.EXTERNAL)


class Auth0Bridge(BaseModel):
    type: BType = Field()
    url: str = Field()
    client_id: str = Field()
    client_secret: str | None = Field(default=None)
    audience: str = Field()
    config_url: str | None = Field(default=None)
    devices_endpoint: str | None = Field(default=None)
    disable: bool | None = Field(default=False)
    environments: list[Environment] = Field()
    active: bool = Field(default=True)
    network: BNetwork = Field(default=BNetwork.EXTERNAL)

    @model_validator(mode="before")
    @classmethod
    def set_client_secret_from_env(cls, data: Any) -> Any:
        """
        Set client_secret from AUTH0_CLIENT_SECRET environment variable if not provided.
        """
        if isinstance(data, dict):
            # If client_secret is not provided or is empty string, get from env
            if "client_secret" not in data or not data.get("client_secret"):
                env_secret = os.getenv("AUTH0_CLIENT_SECRET")
                if env_secret:
                    data["client_secret"] = env_secret
        return data


class InfluxDBBridge(BaseModel):
    type: BType = Field()
    url: str = Field()
    token: str = Field()
    org: str = Field()
    bucket: str = Field(default="default")
    timeout: int | None = Field(default=30)
    debug: bool | None = Field(default=False)
    environments: list[Environment] = Field()
    active: bool = Field(default=True)
    network: BNetwork = Field(default=BNetwork.EXTERNAL)


class PostgreSQLBridge(BaseModel):
    type: BType = Field()
    host: str = Field()
    port: int = Field()
    user: str = Field()
    password: str = Field()
    dbname: str = Field()
    environments: list[Environment] = Field()
    active: bool = Field(default=True)
    network: BNetwork = Field(default=BNetwork.EXTERNAL)
    time_series: bool | None = Field(default=False)
    sslmode: str | None = Field(default=None)


class RedisBridge(BaseModel):
    type: BType = Field()
    host: str = Field()
    port: int = Field()
    db: int | None = Field(default=0)
    socket_timeout: float | None = Field(default=30.0)
    decode_responses: bool | None = Field(default=True)
    password: str | None = Field(default=None)
    environments: list[Environment] = Field()
    active: bool = Field(default=True)
    network: BNetwork | None = Field(default=BNetwork.DOCKER)


class S3Bridge(BaseModel):
    type: BType = Field()
    bucket: str = Field()
    key: str = Field()
    secret: str = Field()
    region: str = Field()
    endpoint_url: str = Field()
    environments: list[Environment] = Field()
    active: bool = Field(default=True)
    network: BNetwork = Field(default=BNetwork.EXTERNAL)


class TDengineBridge(BaseModel):
    type: BType = Field()
    host: str = Field()
    port: int = Field()
    user: str = Field()
    password: str | None = Field(default=None)
    database: str | None = Field(default=None)
    environments: list[Environment] = Field()
    active: bool = Field(default=True)
    network: BNetwork = Field(default=BNetwork.EXTERNAL)


class S2Bridge(BaseModel):
    type: BType = Field()
    access_token: str | None = Field(default=None)
    basin: str = Field()
    stream: str = Field()
    environments: list[Environment] = Field()
    active: bool = Field(default=True)
    network: BNetwork = Field(default=BNetwork.EXTERNAL)

    @model_validator(mode="before")
    @classmethod
    def set_access_token_from_env(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "access_token" not in data or not data.get("access_token"):
                env_token = os.getenv("S2_ACCESS_TOKEN")
                if env_token:
                    data["access_token"] = env_token
        return data


class FileBridge(BaseModel):
    type: BType = Field()
    path: str = Field()
    environments: list[Environment] = Field()
    active: bool = Field(default=True)
    network: BNetwork = Field(default=BNetwork.LOCAL)

class TemporalBridge(BaseModel):
    type: BType = Field()
    address: str = Field()
    task_queue: str = Field()
    storage_system: str | None = Field(default=None)
    environments: list[Environment] = Field()
    active: bool = Field(default=True)
    network: BNetwork = Field(default=BNetwork.DOCKER)

# Mapping of bridge type strings to their Pydantic models
VALIDATED_BRIDGE_MODELS = {
    "mqtt": MQTTBridge,
    "kafka": KafkaBridge,
    "http": HTTPBridge,
    "auth0": Auth0Bridge,
    "influxdb": InfluxDBBridge,
    "postgresql": PostgreSQLBridge,
    "redis": RedisBridge,
    "s3": S3Bridge,
    "tdengine": TDengineBridge,
    "s2": S2Bridge,
    "file": FileBridge,
    "temporal": TemporalBridge,
    "postgresql": PostgreSQLBridge,
}
VALIDATION_ORDER = [
    (MQTTBridge, lambda d: "host" in d and "port" in d and "topics" in d),
    (PostgreSQLBridge, lambda d: "host" in d and "port" in d and "user" in d and "password" in d and "dbname" in d),
    (
        RedisBridge,
        lambda d: "host" in d and "port" in d and ("db" in d or "decode_responses" in d or "socket_timeout" in d),
    ),
    (KafkaBridge, lambda d: "url" in d and ("log_level" in d or "offset" in d or "consumer_group" in d)),
    (InfluxDBBridge, lambda d: "url" in d and "token" in d and "org" in d and "bucket" in d),
    (HTTPBridge, lambda d: "timeout" in d and "retries" in d and "retry_delay" in d),
    (Auth0Bridge, lambda d: "url" in d and "client_id" in d and "audience" in d),
    (S3Bridge, lambda d: "bucket" in d and "key" in d and "secret" in d and "region" in d and "endpoint_url" in d),
    (TDengineBridge, lambda d: "host" in d and "port" in d and "user" in d and "password" in d and "database" in d),
    (S2Bridge, lambda d: "basin" in d and "stream" in d),
    (FileBridge, lambda d: d.get("type") == "file" or "path" in d),
    (TemporalBridge, lambda d: "address" in d and "task_queue" in d),
    (PostgreSQLBridge, lambda d: "host" in d and "port" in d and "user" in d and "password" in d and "dbname" in d),
]
