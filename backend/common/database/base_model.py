from common.database.managers import AllObjectsManager, BaseManager
from common.mixins.database import (
    SoftDeleteMixin,
    TimestampMixin,
    UUIDMixin,
)


class BaseModel(
    UUIDMixin,
    TimestampMixin,
    SoftDeleteMixin,
):
    """
    Base model inherited by all persistent TEED models.
    """

    objects = BaseManager()

    all_objects = AllObjectsManager()

    class Meta:
        abstract = True
