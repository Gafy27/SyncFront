import re
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, model_validator


class EventType(str, Enum):
    """Event value type."""

    STRING = "STR"
    FLOAT = "FLOAT"
    INTEGER = "INT"
    BOOLEAN = "BOOL"
    OBJECT = "OBJECT"
    ARRAY = "ARRAY"


class Event(BaseModel):
    topic: str = Field()
    type: EventType = Field()
    auth_values: list[str] | None = Field(default=None)
    contain_values: list[str] | None = Field(default=None)
    values_range: list[tuple[float, float]] | None = Field(default=None)
    authenticate: bool = Field(default=False)
    counter: bool | None = Field(default=None)
    counter_label: str | None = Field(default=None)
    remove_duplicate: bool = Field(default=False)

    @model_validator(mode="after")
    def validate_type_specific_fields(self) -> "Event":
        if self.authenticate:
            match self.type:
                case EventType.STRING:
                    if self.auth_values is None and self.contain_values is None:
                        raise ValueError("Event with type STR must have 'auth_values' or 'contain_values' field")
                case EventType.FLOAT | EventType.INTEGER:
                    if self.values_range is None:
                        raise ValueError("Event with type FLOAT or INT must have 'values_range' field")
        return self

    @model_validator(mode="before")
    @classmethod
    def parse_values_range(cls, data: Any) -> Any:
        if isinstance(data, dict) and "values_range" in data:
            values_range = data["values_range"]
            if isinstance(values_range, list):
                parsed_ranges = []
                for item in values_range:
                    if isinstance(item, str):
                        match = re.match(r"\(([\d.]+),\s*([\d.]+)\)", item)
                        if match:
                            min_val = float(match.group(1))
                            max_val = float(match.group(2))
                            parsed_ranges.append((min_val, max_val))
                        else:
                            raise ValueError(f"Invalid values_range format: {item}. Expected format: '(min,max)'")
                    elif isinstance(item, list | tuple) and len(item) == 2:
                        parsed_ranges.append((float(item[0]), float(item[1])))
                    else:
                        raise ValueError(f"Invalid values_range item: {item}")
                data["values_range"] = parsed_ranges
        return data


class EventConfig(BaseModel):
    events: dict[str, Event] = Field()

    @model_validator(mode="before")
    @classmethod
    def validate_event_structures(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            raise ValueError(f"Invalid event config, input data type is not a dictionary: {type(data)}")

        # Handle old "event_class" key with list format (backward compat with class.yml)
        if "event_class" in data:
            event_class_list = data["event_class"]
            if isinstance(event_class_list, list):
                validated_events = {}
                for idx, item in enumerate(event_class_list):
                    if isinstance(item, dict):
                        item_copy = dict(item)
                        class_name = item_copy.pop("class", None)
                        if class_name is None:
                            class_name = f"event_{idx}"
                        validated_events[class_name] = item_copy
                return {"events": validated_events}

        # Handle new "events" dict format
        if "events" in data:
            return data

        # Handle transitional "event_classes" format
        if "event_classes" in data:
            return {"events": data["event_classes"]}

        return data

    @classmethod
    def from_dict(cls, config_dict: dict) -> "EventConfig":
        return cls.model_validate(config_dict)
