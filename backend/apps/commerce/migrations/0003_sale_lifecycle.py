import common.database.uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def populate_sequences(apps, schema_editor):
    Sale = apps.get_model("commerce", "Sale")
    for business_id in Sale.objects.values_list("business_id", flat=True).distinct():
        for sequence, sale in enumerate(
            Sale.objects.filter(business_id=business_id).order_by("created_at", "id"),
            start=1,
        ):
            sale.receipt_sequence = sequence
            sale.save(update_fields=["receipt_sequence"])


class Migration(migrations.Migration):
    dependencies = [
        ("commerce", "0002_returnitem_cost_total"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.AddField(
            model_name="sale",
            name="receipt_sequence",
            field=models.PositiveBigIntegerField(null=True),
        ),
        migrations.AddField(
            model_name="sale",
            name="status",
            field=models.CharField(
                choices=[("active", "Active"), ("voided", "Voided and archived")],
                db_index=True,
                default="active",
                max_length=12,
            ),
        ),
        migrations.AddField(
            model_name="sale",
            name="void_reason",
            field=models.CharField(blank=True, default="", max_length=240),
        ),
        migrations.AddField(
            model_name="sale",
            name="voided_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="sale",
            name="voided_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="voided_sales",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(populate_sequences, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="sale",
            name="receipt_sequence",
            field=models.PositiveBigIntegerField(),
        ),
        migrations.AddConstraint(
            model_name="sale",
            constraint=models.UniqueConstraint(
                fields=("business", "receipt_sequence"),
                name="commerce_receipt_sequence_unique",
            ),
        ),
        migrations.CreateModel(
            name="SaleAudit",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=common.database.uuid.generate_uuid,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(db_index=True, default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                (
                    "action",
                    models.CharField(
                        choices=[("edit", "Edit"), ("void", "Void")], max_length=16
                    ),
                ),
                ("before", models.JSONField(default=dict)),
                ("after", models.JSONField(default=dict)),
                (
                    "actor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "sale",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="audit_events",
                        to="commerce.sale",
                    ),
                ),
            ],
            options={"db_table": "commerce_sale_audit", "ordering": ["-created_at"]},
        ),
    ]
