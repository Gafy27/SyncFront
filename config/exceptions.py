import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))


class InvalidConfigError(Exception):
    """Raised when configuration is invalid."""

    pass


class ConfigNotFoundError(Exception):
    """Raised when configuration is not found."""

    pass


class OutdatedConfigError(Exception):
    """Raised when configuration is outdated."""

    pass
