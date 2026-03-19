import asyncio
import uuid

from models.config.api import ConnectorTemplate, VariableType
from models.config.api.connector_template import ConnectorTemplateType
from api.database import ConfigManagerService
async def seed_connector_templates():
    config_manager = ConfigManagerService()
    await config_manager.connect()
    connector_templates = [
        {
            "name": "MQTT",
            "slug": "mqtt",
            "version": "1.0.0",
            "is_active": True,
            "icon": "https://imgs.search.brave.com/6IqlErOxLEn0IlJt0kn9RSfqqCPyNFgpblf3XvZLIO8/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tcXR0/Lm9yZy9hc3NldHMv/aW1nL21xdHQtbG9n/by5zdmc",
            "type": ConnectorTemplateType.CONNECTOR,
            "variables": [
                {"name": "host", "label": "Host", "type": VariableType.STRING, "required": True},
                {"name": "port", "label": "Port", "type": VariableType.INTEGER, "default": 1883},
                {"name": "topics", "label": "Topics", "type": VariableType.ARRAY, "required": True},
                {"name": "max_message_interval", "label": "Max Message Interval", "type": VariableType.INTEGER, "default": 5},
                {"name": "update_interval", "label": "Update Interval", "type": VariableType.INTEGER, "default": 30}
            ],
        },
        {
            "name": "InfluxDB",
            "slug": "influxdb",
            "version": "1.0.0",
            "is_active": True,
            "icon": "https://imgs.search.brave.com/tG9D_2RqU1Tox_y5ShIV7gs65obdL9n7YIVBDJs4SNg/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4u/anNkZWxpdnIubmV0/L2doL2hvbWFyci1s/YWJzL2Rhc2hib2Fy/ZC1pY29ucy9zdmcv/aW5mbHV4ZGIuc3Zn",
            "type": ConnectorTemplateType.CONNECTOR,
            "variables": [
                {"name": "url", "label": "URL", "type": VariableType.STRING, "required": True},
                {"name": "token", "label": "Token", "type": VariableType.STRING, "required": True},
                {"name": "org", "label": "Org", "type": VariableType.STRING, "required": True},
                {"name": "bucket", "label": "Bucket", "type": VariableType.STRING, "required": True}
            ],
        },
        {
            "name": "PostgreSQL",
            "slug": "postgresql",
            "version": "1.0.0",
            "is_active": True,
            "icon": "https://imgs.search.brave.com/82QtdKujguy4MGtI01mHlLITzRcAbqlkmK0nNDor6Do/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93d3cu/dmVjdG9ybG9nby56/b25lL2xvZ29zL3Bv/c3RncmVzcWwvcG9z/dGdyZXNxbC1pY29u/LnN2Zw",
            "type": ConnectorTemplateType.CONNECTOR,
            "variables": [
                {"name": "host", "label": "Host", "type": VariableType.STRING, "required": True},
                {"name": "port", "label": "Port", "type": VariableType.INTEGER, "default": 5432},
                {"name": "database", "label": "Database", "type": VariableType.STRING, "required": True},
                {"name": "user", "label": "User", "type": VariableType.STRING, "required": True},
                {"name": "password", "label": "Password", "type": VariableType.STRING, "required": True}
            ],
        },
        {
            "name": "TimescaleDB",
            "slug": "timescaledb",
            "version": "1.0.0",
            "is_active": True,
            "icon": "https://imgs.search.brave.com/8RZQ2R3eGsKCVLSOL0dQHuixdbPkX-CxsGImYXjqdT8/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9hc3Nl/dHMudGlnZXJkYXRh/LmNvbS90aW1lc2Nh/bGUtd2ViL2JyYW5k/L3Nob3cvYmFkZ2Ut/eWVsbG93LnN2Zw",
            "type": ConnectorTemplateType.CONNECTOR,
            "variables": [
                {"name": "host", "label": "Host", "type": VariableType.STRING, "required": True},
                {"name": "port", "label": "Port", "type": VariableType.INTEGER, "default": 5432},
                {"name": "database", "label": "Database", "type": VariableType.STRING, "required": True},
                {"name": "user", "label": "User", "type": VariableType.STRING, "required": True},
                {"name": "password", "label": "Password", "type": VariableType.STRING, "required": True}
            ],
        },
        {
            "name": "Kafka",
            "slug": "kafka",
            "version": "1.0.0",
            "icon": "https://imgs.search.brave.com/QLFKsQCgcftzSd0tBhRIlLL7aOZ5dcH3vhiRZE12W-Y/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93d3cu/c3ZncmVwby5jb20v/c2hvdy8zNTM5NTEv/a2Fma2EtaWNvbi5z/dmc",
            "is_active": True,
            "type": ConnectorTemplateType.CONNECTOR,
            "variables": [
                {"name": "bootstrap_servers", "label": "Bootstrap Servers", "type": VariableType.STRING, "required": True},
                {"name": "topic", "label": "Topic", "type": VariableType.STRING, "required": True}
            ],
        },
        {
            "name": "Fanuc CNC",
            "slug": "fanuc_cnc",
            "version": "1.0.0",
            "is_active": True,
            "icon":"https://imgs.search.brave.com/_TE7xnDVisHP42yOGx3ik3V2tnqbhwqyLJ4Q7ioeXFo/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pY29u/bG9nb3ZlY3Rvci5j/b20vdXBsb2Fkcy9p/bWFnZXMvMjAyNC8x/MC9sZy02NzEzYzFm/YmMyOGNkLUZBTlVD/LndlYnA",
            "type": ConnectorTemplateType.DRIVER,
            "variables": [
                {"name": "host", "label": "Host", "type": VariableType.STRING, "required": True},
                {"name": "port", "label": "Port", "type": VariableType.INTEGER, "default": 5000}
            ],
        },
        {
            "name": "MTConnect",
            "slug": "mtconnect",
            "version": "1.0.0",
            "icon":"https://imgs.search.brave.com/fYvS_fyuAeYed4LSm3aOvRtUziDafSQzkY2VZzQA30A/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9zaWEt/Y29ubmVjdC5jb20v/d3AtY29udGVudC91/cGxvYWRzLzIwMjUv/MDYvTVRDb25uZWN0/LTEwMjR4MzIxLnBu/Zw",
            "is_active": True,
            "type": ConnectorTemplateType.DRIVER,
            "variables": [
                {"name": "host", "label": "Host", "type": VariableType.STRING, "required": True},
                {"name": "port", "label": "Port", "type": VariableType.INTEGER, "default": 5000}
            ],
        },
        {
            "name": "OPC UA",
            "slug": "opcua",
            "version": "1.0.0",
            "icon":"https://imgs.search.brave.com/M_tZ4AYstIIPIczrl9AILvE1D_s57mgIj8fIfIBSboc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWFn/ZXMuc2Vla2xvZ28u/Y29tL2xvZ28tcG5n/LzM1LzIvb3BjLXVu/aWZpZWQtYXJjaGl0/ZWN0dXJlLXVhLWxv/Z28tcG5nX3NlZWts/b2dvLTM1NTAxOS5w/bmc",
            "is_active": True,
            "type": ConnectorTemplateType.DRIVER,
            "variables": [
                {"name": "host", "label": "Host", "type": VariableType.STRING, "required": True},
                {"name": "port", "label": "Port", "type": VariableType.INTEGER, "default": 5000}
            ],
        },
        {
            "name": "MQTT",
            "slug": "mqtt",
            "version": "1.0.0",
            "icon": "https://imgs.search.brave.com/6IqlErOxLEn0IlJt0kn9RSfqqCPyNFgpblf3XvZLIO8/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tcXR0/Lm9yZy9hc3NldHMv/aW1nL21xdHQtbG9n/by5zdmc",
            "is_active": True,
            "type": ConnectorTemplateType.SELECT,
            "variables": [
                {"name": "id", "label": "ID", "type": VariableType.UUID, "required": True},
            ],
        },
                {
            "name": "API",
            "slug": "api",
            "version": "1.0.0",
            "is_active": True,
            "type": ConnectorTemplateType.SELECT,
            "variables": [
                {"name": "id", "label": "ID", "type": VariableType.UUID, "required": True},
            ],
        },

    ]

    for template in connector_templates:
        template_id = str(uuid.uuid4())
        tmpl = ConnectorTemplate(
            id=template_id,
            **template
        )
        await config_manager.replace("connector_templates", template_id, tmpl.model_dump(mode="json"))
        print(f"Seeded ConnectorTemplate: {tmpl.name}")

if __name__ == "__main__":
    asyncio.run(seed_connector_templates())