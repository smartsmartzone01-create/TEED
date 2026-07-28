from django.db import models
from django.utils import timezone


class BaseQuerySet(models.QuerySet):
    """
    Base queryset for all TEED models.
    """

    def alive(self):
        return self.filter(is_deleted=False)

    def deleted(self):
        return self.filter(is_deleted=True)

    def restore(self):
        return self.update(
            is_deleted=False,
            deleted_at=None,
        )

    def hard_delete(self):
        return super().delete()

    def soft_delete(self):
        return self.update(
            is_deleted=True,
            deleted_at=timezone.now(),
        )
