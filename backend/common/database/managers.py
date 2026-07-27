from django.db import models

from .querysets import BaseQuerySet


class BaseManager(models.Manager.from_queryset(BaseQuerySet)):
    """
    Default manager.
    Returns only active (non-deleted) records.
    """

    def get_queryset(self):
        return super().get_queryset().alive()


class AllObjectsManager(models.Manager.from_queryset(BaseQuerySet)):
    """
    Manager that returns all records,
    including soft-deleted ones.
    """

    pass