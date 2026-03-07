"""
Test script to validate service config dictionary with unknown service names
"""

import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from bridge_config import BridgeConfig
from bridge_model import BNetwork, BType
from class_config import EventClassConfig
from pipeline_config import PipelineConfig
from rule_config import RulesConfig
from service_config import ServiceConfig


def test_service_validation():
    # Sample config with multiple services (unknown names)
    sample_config = {
        "network-manager": {
            "class": "NetworkManager",
            "timeout_seconds": 30,
            "check_interval": 5,
            "broker": "kafka",
            "consumer_group": "network-manager",
            "log_level": "INFO",
        },
        "mqtt-bridge": {
            "class": "MQTTBridgeService",
            "broker": "kafka",
            "consumer_group": "mqtt-bridge",
            "log_level": "INFO",
        },
        "stream-normalizer": {
            "class": "StreamNormalizer",
            "broker": "kafka",
            "consumer_group": "stream-normalizer",
            "log_level": "INFO",
        },
        "stream-interpreter": {
            "class": "StreamInterpreter",
            "broker": "kafka",
            "consumer_group": "stream-interpreter",
            "log_level": "INFO",
        },
        "rewind": {"class": "Rewind", "broker": "kafka", "consumer_group": "rewind", "log_level": "INFO"},
        "storage": {"type": "redis"},
        "topics": {
            "input_topic": "input",
            "output_topic": "output",
            "accepted_topic": "accepted",
            "debug_topic": "debug-topic",
            "beacon_topic": "beacon",
            "interpreted_topic": "interpreted",
            "config_topic": "config",
            "alert_topic": "alert",
        },
    }

    try:
        # Validate using from_dict
        config = ServiceConfig.from_dict(sample_config)

        print("✓ Validation successful!")
        print(f"✓ Found {config}")
        return True
    except Exception as e:
        print(f"✗ Validation failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_bridge_validation():
    external_sample_config = {
        "mqtt": {
            "type": "mqtt",
            "host": "arweb.aerre.com.ar",
            "port": 1883,
            "topics": [
                {"name": "milesight/uplink", "decoder": "processors.decode.custom.UC50XD_Decoder"},
                {"name": "dosivac-api__dev", "decoder": "processors.decode.api."},
            ],
            "max_message_interval": 5,
            "update_interval": 30,
            "environments": ["prod", "dev"],
            "active": True,
        },
        "mqtt2": {
            "type": "mqtt",
            "host": "arweb.aerre.com.ar2",
            "port": 1883,
            "topics": [
                {"name": "milesight/uplink", "decoder": "processors.decode.custom.UC50XD_Decoder"},
                {"name": "dosivac-api__dev", "decoder": "processors.decode.api."},
            ],
            "max_message_interval": 5,
            "update_interval": 30,
            "environments": ["prod", "dev"],
            "active": True,
        },
        "redis": {
            "type": "redis",
            "host": "redis",
            "port": 6379,
            "db": 0,
            "socket_timeout": 30.0,
            "decode_responses": True,
            "environments": ["dev", "prod"],
            "active": True,
        },
        "redis_local": {
            "type": "redis",
            "host": "localhost",
            "port": 6379,
            "db": 0,
            "socket_timeout": 30.0,
            "decode_responses": True,
            "environments": ["dev"],
            "active": True,
        },
    }

    internal_sample_config = {
        "redis": {
            "type": "redis",
            "host": "redis",
            "port": 6379,
            "db": 0,
            "socket_timeout": 30.0,
            "decode_responses": True,
            "environments": ["prod"],
            "active": True,
            "network": BNetwork.DOCKER,
        },
        "redis_local": {
            "type": "redis",
            "host": "localhost",
            "port": 6379,
            "db": 0,
            "socket_timeout": 30.0,
            "decode_responses": True,
            "environments": ["dev"],
            "active": True,
            "network": BNetwork.LOCAL,
        },
    }

    try:
        BridgeConfig.from_dict(external_sample_config, internal=False)
        internal_config = BridgeConfig.from_dict(internal_sample_config, internal=True)
        print("✓ Validation successful!")
        print(f"✓ Found {internal_config[BType.REDIS]}")

    except Exception as e:
        print(f"✗ Validation failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_class_validation():
    event_class_sample_config = {
        "event_class": [
            {
                "class": "EXECUTION",
                "topic": "accepted",
                "type": "STR",
                "auth_values": [
                    "ACTIVE",
                    "STOPPED",
                    "PROGRAM_STOPPED",
                    "OPTIONAL_STOP",
                    "FEED_HOLD",
                    "READY",
                    "UNAVAILABLE",
                    "STOP",
                ],
            },
            {
                "class": "MODE",
                "topic": "accepted",
                "type": "STR",
                "auth_values": ["EDIT", "MANUAL", "MANUAL_DATA_INPUT", "AUTOMATIC", "UNAVAILABLE", "REF"],
            },
            {"class": "PIECES", "topic": "accepted", "type": "STR", "auth_values": ["ON", "OFF"]},
            {"class": "ONLINE", "topic": "accepted", "type": "STR", "auth_values": ["TRUE", "FALSE"]},
            {
                "class": "OP_CODE",
                "topic": "accepted",
                "type": "STR",
                "auth_values": ["ANY"],
                "contain_values": ["D-", "C-"],
            },
            {
                "class": "ACTIVITY",
                "topic": "accepted",
                "type": "STR",
                "auth_values": [
                    "JOB_SETUP",
                    "PROGRAM_SETUP",
                    "PROGRAM_UPDATE",
                    "MANTEINANCE",
                    "OPERATOR_BREAK",
                    "CYCLE_SETUP",
                    "CYCLE_RUN",
                ],
            },
            {"class": "OPERATION", "topic": "accepted", "type": "STR", "auth_values": ["SETUP", "PRODUCTION"]},
            {"class": "adc_420", "topic": "accepted", "type": "FLOAT", "values_range": ["(4,20)"]},
            {"class": "adc_010", "topic": "accepted", "type": "FLOAT", "values_range": ["(0,10.0)"]},
            {"class": "CONFIG", "topic": "config", "type": "STR", "auth_values": ["CREATED", "UPDATED", "DELETED"]},
        ]
    }

    event_class_config = EventClassConfig.model_validate(event_class_sample_config)
    print("✓ Validation successful!")
    print(f"✓ Found {event_class_config.event_classes}")


def test_rules_validation():
    rules_sample_config = {
        "rules": {
            "fn_1764976671761": {
                "name": "Calculo Nivel",
                "rule": 'stream.value = (memory.level_420 - 4) * properties.max_tank_volume / 16;\nstream.event_id = "volume";\n',
                "publish": True,
                "memory": True,
            },
            "fn_1764976671762": {
                "name": "Calculo Nivel Porcentual",
                "rule": 'stream.value = (memory.volume / properties.max_tank_volume) * 100;\ntags.max_tank_volume = properties.max_tank_volume;\nif stream.value < 10:\n  stream.alert("Volume too low")\nstream.event_id = "volume_percent";\n',
                "publish": True,
                "memory": True,
            },
            "fn_1764976671763": {
                "name": "Calculo Flujo",
                "rule": "class BatchIdentifier:\n    def __init__(self, metadata, stream):\n        self.metadata = metadata\n        self.event = stream\n        self.machine_id = stream.machine_id\n        self.counters_file_path = 'data/metadata/counters'\n\n    def _read_counters(self):\n        try:\n            import json\n            with open(self.counters_file_path, 'r') as f:\n                return json.load(f)\n        except Exception:\n            return {}\n    \n    def _update_counters(self, counters):\n        import json\n        with open(self.counters_file_path, 'w') as f:\n            json.dump(counters, f)\n    \n    def recharge_id(self):\n        last_recharge_id = self.machine_counters.get('recharge', 'R0')\n        last_recharge_number = int(last_recharge_id.split('R')[1]) if 'R' in last_recharge_id else 0\n        new_recharge_number = last_recharge_number + 1\n        recharge_id = 'R' + str(new_recharge_number)\n        self.machine_counters['recharge'] = recharge_id\n        return recharge_id\n\n    def continua_id(self):        \n        import datetime\n        timestamp = self.event.timestamp if hasattr(self.event, 'timestamp') else getattr(self.event, 'message', {}).get('timestamp')\n        if timestamp:\n            try:\n                if len(str(timestamp)) > 12:  # ms\n                    timestamp = int(timestamp) // 1000\n                dt = datetime.datetime.fromtimestamp(int(timestamp))\n                day_of_year = dt.timetuple().tm_yday\n                year = dt.timetuple().tm_year\n                dose_id = f'D{day_of_year}{year}'\n            except Exception:\n                dose_id = 'D1'\n        else:\n            dose_id = 'D1'\n        return dose_id\n\n    def batcheo_id(self):\n        last_dose_id = self.machine_counters.get('dose', 'D0')\n        if self.machine_counters.get('null_count', 0) > 2:\n            last_dose_number = int(last_dose_id.split('D')[1]) if 'D' in last_dose_id else 0\n            new_dose_number = last_dose_number + 1\n            dose_id = 'D' + str(new_dose_number)\n            self.machine_counters['null_count'] = 0\n        else:\n            dose_id = last_dose_id\n        return dose_id\n\n    def get_batch_id(self):\n        flow = getattr(self.event, 'value', None)\n        if flow is None and hasattr(self.event, 'message'):\n            flow = self.event.message.get('flow', 0)\n        counters = self._read_counters()\n        self.machine_counters = counters.get(self.machine_id, {'recharge':'R0','dose':'D0','null_count':0})\n        if flow is not None and flow > 7:\n            batch_id = self.recharge_id()\n            self.machine_counters['null_count'] = self.machine_counters.get('null_count',0) + 1\n        elif flow is not None and flow < -7:\n            if self.metadata.get('properties', {}).get('work_mode') == 'Continua':\n                batch_id = self.continua_id()\n            else:\n                batch_id = self.batcheo_id()\n            self.machine_counters['dose'] = batch_id\n        else:\n            batch_id = 'D0'\n            self.machine_counters['null_count'] = self.machine_counters.get('null_count',0) + 1\n\n        counters[self.machine_id] = self.machine_counters\n        self._update_counters(counters)\n        return batch_id\nbatch_id = BatchIdentifier(metadata, stream).get_batch_id()\nflow = (memory.volume - records.volume) / (memory.timestamp - records.timestamp);\nstream.value = flow;\nstream.event_id = \"flow\";\nstream.tags.batch_id = batch_id\n",
                "publish": True,
                "memory": True,
            },
        },
        "pipelines": [{"name": "Level", "triggers": ["level_420"], "steps": ["fn_1764976671761", "fn_1764976671762"]}],
    }
    rules_config = RulesConfig.model_validate(rules_sample_config)

    print("✓ Validation successful!")
    print(f"✓ Found {rules_config.rules['fn_1764976671761']}")
    print(f"✓ Found {rules_config.pipelines}")


def test_env_validation():
    from env_config import EnvironmentConfig

    env_config = EnvironmentConfig()
    print("✓ Validation successful!")
    print(f"✓ Found {env_config.environment}")
    print(f"✓ Found {env_config.network}")
    print(f"✓ Found {env_config.auth0_client_secret}")


def test_pipeline_validation():
    pipeline_sample_config = {
        "rules": {
            "rules": {
                "fn_1764976671761": {
                    "name": "Calculo Nivel",
                    "rule": 'stream.value = (memory.level_420 - 4) * properties.max_tank_volume / 16;\nstream.event_id = "volume";\n',
                    "publish": True,
                    "memory": True,
                },
                "fn_1764976671762": {
                    "name": "Calculo Nivel Porcentual",
                    "rule": 'stream.value = (memory.volume / properties.max_tank_volume) * 100;\ntags.max_tank_volume = properties.max_tank_volume;\nif stream.value < 10:\n  stream.alert("Volume too low")\nstream.event_id = "volume_percent";\n',
                    "publish": True,
                    "memory": True,
                },
                "fn_1764976671763": {
                    "name": "Calculo Flujo",
                    "rule": "class BatchIdentifier:\n    def __init__(self, metadata, stream):\n        self.metadata = metadata\n        self.event = stream\n        self.machine_id = stream.machine_id\n        self.counters_file_path = 'data/metadata/counters'\n\n    def _read_counters(self):\n        try:\n            import json\n            with open(self.counters_file_path, 'r') as f:\n                return json.load(f)\n        except Exception:\n            return {}\n    \n    def _update_counters(self, counters):\n        import json\n        with open(self.counters_file_path, 'w') as f:\n            json.dump(counters, f)\n    \n    def recharge_id(self):\n        last_recharge_id = self.machine_counters.get('recharge', 'R0')\n        last_recharge_number = int(last_recharge_id.split('R')[1]) if 'R' in last_recharge_id else 0\n        new_recharge_number = last_recharge_number + 1\n        recharge_id = 'R' + str(new_recharge_number)\n        self.machine_counters['recharge'] = recharge_id\n        return recharge_id\n\n    def continua_id(self):        \n        import datetime\n        timestamp = self.event.timestamp if hasattr(self.event, 'timestamp') else getattr(self.event, 'message', {}).get('timestamp')\n        if timestamp:\n            try:\n                if len(str(timestamp)) > 12:  # ms\n                    timestamp = int(timestamp) // 1000\n                dt = datetime.datetime.fromtimestamp(int(timestamp))\n                day_of_year = dt.timetuple().tm_yday\n                year = dt.timetuple().tm_year\n                dose_id = f'D{day_of_year}{year}'\n            except Exception:\n                dose_id = 'D1'\n        else:\n            dose_id = 'D1'\n        return dose_id\n\n    def batcheo_id(self):\n        last_dose_id = self.machine_counters.get('dose', 'D0')\n        if self.machine_counters.get('null_count', 0) > 2:\n            last_dose_number = int(last_dose_id.split('D')[1]) if 'D' in last_dose_id else 0\n            new_dose_number = last_dose_number + 1\n            dose_id = 'D' + str(new_dose_number)\n            self.machine_counters['null_count'] = 0\n        else:\n            dose_id = last_dose_id\n        return dose_id\n\n    def get_batch_id(self):\n        flow = getattr(self.event, 'value', None)\n        if flow is None and hasattr(self.event, 'message'):\n            flow = self.event.message.get('flow', 0)\n        counters = self._read_counters()\n        self.machine_counters = counters.get(self.machine_id, {'recharge':'R0','dose':'D0','null_count':0})\n        if flow is not None and flow > 7:\n            batch_id = self.recharge_id()\n            self.machine_counters['null_count'] = self.machine_counters.get('null_count',0) + 1\n        elif flow is not None and flow < -7:\n            if self.metadata.get('properties', {}).get('work_mode') == 'Continua':\n                batch_id = self.continua_id()\n            else:\n                batch_id = self.batcheo_id()\n            self.machine_counters['dose'] = batch_id\n        else:\n            batch_id = 'D0'\n            self.machine_counters['null_count'] = self.machine_counters.get('null_count',0) + 1\n\n        counters[self.machine_id] = self.machine_counters\n        self._update_counters(counters)\n        return batch_id\nbatch_id = BatchIdentifier(metadata, stream).get_batch_id()\nflow = (memory.volume - records.volume) / (memory.timestamp - records.timestamp);\nstream.value = flow;\nstream.event_id = \"flow\";\nstream.tags.batch_id = batch_id\n",
                    "publish": True,
                    "memory": True,
                },
            },
            "pipelines": [
                {"name": "Level", "triggers": ["level_420"], "steps": ["fn_1764976671761", "fn_1764976671762"]}
            ],
        },
        "internal_bridge": {
            "redis": {
                "type": "redis",
                "host": "redis",
                "port": 6379,
                "db": 0,
                "socket_timeout": 30.0,
                "decode_responses": True,
                "environments": ["dev", "prod"],
                "network": "docker",
            },
            "redis_local": {
                "type": "redis",
                "host": "localhost",
                "port": 6379,
                "db": 0,
                "socket_timeout": 30.0,
                "decode_responses": True,
                "environments": ["dev"],
                "network": "local",
            },
            "kafka": {
                "type": "kafka",
                "url": "broker:29092",
                "log_level": "INFO",
                "offset": "latest",
                "consumer_group": "internal",
                "environments": ["dev", "prod"],
                "network": "docker",
            },
            "kafka_local": {
                "type": "kafka",
                "url": "localhost:9092",
                "log_level": "INFO",
                "offset": "latest",
                "consumer_group": "local",
                "environments": ["dev", "prod"],
                "network": "local",
            },
            "auth0": {
                "type": "auth0",
                "url": "https://dev-gj5sc4b5awd3ww3w.us.auth0.com",
                "client_id": "Y30MzcRCIVe9BtL2OxAl9txs2BP9fFpZ",
                "client_secret": "",
                "audience": "testing.api.dosivac.autentio.app",
                "config_url": "https://testing.api.dosivac.autentio.app",
                "devices_endpoint": "/devices/properties-only",
                "disable": True,
                "environments": ["dev", "prod"],
            },
        },
        "class": {
            "event_class": [
                {
                    "class": "EXECUTION",
                    "topic": "accepted",
                    "type": "STR",
                    "auth_values": [
                        "ACTIVE",
                        "STOPPED",
                        "PROGRAM_STOPPED",
                        "OPTIONAL_STOP",
                        "FEED_HOLD",
                        "READY",
                        "UNAVAILABLE",
                        "STOP",
                    ],
                },
                {
                    "class": "MODE",
                    "topic": "accepted",
                    "type": "STR",
                    "auth_values": ["EDIT", "MANUAL", "MANUAL_DATA_INPUT", "AUTOMATIC", "UNAVAILABLE", "REF"],
                },
                {"class": "PIECES", "topic": "accepted", "type": "STR", "auth_values": ["ON", "OFF"]},
                {"class": "ONLINE", "topic": "accepted", "type": "STR", "auth_values": ["TRUE", "FALSE"]},
                {
                    "class": "OP_CODE",
                    "topic": "accepted",
                    "type": "STR",
                    "auth_values": ["ANY"],
                    "contain_values": ["D-", "C-"],
                },
                {
                    "class": "ACTIVITY",
                    "topic": "accepted",
                    "type": "STR",
                    "auth_values": [
                        "JOB_SETUP",
                        "PROGRAM_SETUP",
                        "PROGRAM_UPDATE",
                        "MANTEINANCE",
                        "OPERATOR_BREAK",
                        "CYCLE_SETUP",
                        "CYCLE_RUN",
                    ],
                },
                {"class": "OPERATION", "topic": "accepted", "type": "STR", "auth_values": ["SETUP", "PRODUCTION"]},
                {"class": "adc_420", "topic": "accepted", "type": "FLOAT", "values_range": ["(4,20)"]},
                {"class": "adc_010", "topic": "accepted", "type": "FLOAT", "values_range": ["(0,10.0)"]},
                {"class": "CONFIG", "topic": "config", "type": "STR", "auth_values": ["CREATED", "UPDATED", "DELETED"]},
            ]
        },
        "service": {
            "network_manager": {
                "timeout_seconds": 30,
                "check_interval": 5,
                "broker": "kafka",
                "consumer_group": "network-manager",
                "log_level": "INFO",
            },
            "mqtt-bridge": {"broker": "kafka", "consumer_group": "mqtt-bridge", "log_level": "INFO"},
            "stream_normalizer": {"broker": "kafka", "consumer_group": "stream-normalizer", "log_level": "INFO"},
            "stream_interpreter": {"broker": "kafka", "consumer_group": "stream-interpreter", "log_level": "INFO"},
            "stream_rule_engine": {"broker": "kafka", "consumer_group": "stream-rule-engine", "log_level": "INFO"},
            "rewind": {"broker": "kafka", "consumer_group": "rewind", "log_level": "INFO"},
            "storage": {"type": "redis"},
            "topics": {
                "network-manager": "network-manager",
                "input_topic": "input",
                "output_topic": "output",
                "accepted_topic": "accepted",
                "debug_topic": "debug-topic",
                "beacon_topic": "beacon",
                "interpreted_topic": "interpreted",
                "config_topic": "config",
                "alert_topic": "alert",
            },
        },
        "bridge": {
            "mqtt_prod": {
                "type": "mqtt",
                "host": "arweb.aerre.com.ar",
                "port": 1883,
                "topics": [
                    {"name": "milesight/uplink", "decoder": "processors.decode.custom.UC50XD_Decoder"},
                    {"name": "dosivac-api__dev", "decoder": "processors.decode.api."},
                ],
                "max_message_interval": 5,
                "update_interval": 30,
                "environments": ["prod"],
                "active": True,
            },
            "mqtt_dev": {
                "type": "mqtt",
                "host": "arweb.aerre.com.ar",
                "port": 1883,
                "topics": [
                    {"name": "test/milesight/uplink", "decoder": "processors.decode.custom.UC50XD_Decoder"},
                    {"name": "dosivac-api__dev", "decoder": "processors.decode.api."},
                ],
                "max_message_interval": 5,
                "update_interval": 30,
                "environments": ["dev", "prod"],
                "active": True,
            },
            "dev_cloud_influxdb": {
                "type": "influxdb",
                "url": "https://us-east-1-1.aws.cloud2.influxdata.com",
                "token": "QqnUTxD-5SIasyTlEVqW8tW4e_sOSOtT3dgWxLYDBgH2jmFmYAg5fi0E4e9395kUTeqUyN5hbuPXhEWbumDmgA==",
                "org": "Dosivac",
                "bucket": "syncore__test",
                "environments": ["dev"],
                "active": True,
            },
            "prod_cloud_influxdb": {
                "type": "influxdb",
                "url": "https://us-east-1-1.aws.cloud2.influxdata.com",
                "token": "QqnUTxD-5SIasyTlEVqW8tW4e_sOSOtT3dgWxLYDBgH2jmFmYAg5fi0E4e9395kUTeqUyN5hbuPXhEWbumDmgA==",
                "org": "Dosivac",
                "bucket": "syncore__dev",
                "environments": ["prod"],
                "active": True,
            },
            "arweb_influxdb": {
                "type": "influxdb",
                "url": "http://arweb.aerre.com.ar:8086",
                "token": "U0qPIbgCWPGSoV6EacrMQNgieOu7iB_wgER-6GlOOxnjuh1-7Q5mNUtOYGW_6rE4Mzmv1VimjXAeL_OLOFWTuw==",
                "org": "Dosivac",
                "environments": ["dev"],
                "active": True,
            },
            "timescaledb_cloud": {
                "type": "timescaledb",
                "host": "vrk5pp6nai.jhp1i300t5.tsdb.cloud.timescale.com",
                "port": 37822,
                "user": "tsdbadmin",
                "password": "t20ch182m6fuicu0",
                "dbname": "tsdb",
                "environments": ["dev"],
                "active": True,
            },
            "timescaledb": {
                "type": "timescaledb",
                "host": "192.168.0.245",
                "port": 5432,
                "user": "juan",
                "password": "UegU9Wg7WXWXi",
                "dbname": "test",
                "environments": ["dev"],
                "active": False,
            },
        },
    }

    pipeline_config = PipelineConfig.model_validate(pipeline_sample_config)
    print("✓ Validation successful!")

    print(f"✓ Found {pipeline_config.external_bridges}")


if __name__ == "__main__":
    # test_class_validation()
    # test_service_validation()
    # test_bridge_validation()
    # test_rules_validation()
    # test_env_validation()
    test_pipeline_validation()
