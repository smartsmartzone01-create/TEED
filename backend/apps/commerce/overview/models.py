from common.database.base_model import BaseModel
from django.db import models


class CommerceDecision(BaseModel):
    class Severity(models.TextChoices):
        INFO = "info", "Information"
        ATTENTION = "attention", "Attention"
        URGENT = "urgent", "Urgent"

    business = models.ForeignKey(
        "workspaces.Business",
        on_delete=models.CASCADE,
        related_name="commerce_decisions",
    )
    key = models.CharField(max_length=80)
    severity = models.CharField(max_length=16, choices=Severity.choices)
    title = models.CharField(max_length=160)
    explanation = models.CharField(max_length=320)
    action_path = models.CharField(max_length=200, blank=True, default="")
    context = models.JSONField(default=dict, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "commerce_decisions"
        ordering = ["resolved_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "key"], name="commerce_decision_key_unique"
            )
        ]
