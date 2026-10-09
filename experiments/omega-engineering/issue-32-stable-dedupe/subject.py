"""Module providing order-preserving uniqueness filtering."""

from collections.abc import Iterable
from typing import Any, Hashable


def unique_in_order(items: Iterable[Hashable]) -> list[Any]:
    """Return a list preserving first-occurrence order of hashable values."""
    if items is None:
        raise TypeError("Argument 'items' cannot be None.")
    return list(dict.fromkeys(items))
