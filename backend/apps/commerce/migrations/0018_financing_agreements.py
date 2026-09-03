import common.database.uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

import apps.commerce.financing.models


class Migration(migrations.Migration):
    dependencies = [
        ("commerce", "0017_saleitem_warranty_months"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="FinancingAgreement",
            fields=[
                ("id", models.UUIDField(default=common.database.uuid.generate_uuid, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(db_index=True, default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("reference", models.CharField(max_length=40)),
                ("sequence", models.PositiveBigIntegerField()),
                ("agreement_type", models.CharField(choices=[("loan", "Loan"), ("installment", "Installment purchase")], max_length=16)),
                ("transaction_type", models.CharField(choices=[("normal", "Normal"), ("upfront", "Upfront payment"), ("trade_in", "Trade-in")], default="normal", max_length=16)),
                ("source", models.CharField(choices=[("stock", "From stock"), ("independent", "Independent")], max_length=16)),
                ("market_type", models.CharField(choices=[("retail", "Retail"), ("wholesale", "Wholesale")], max_length=16)),
                ("financing_mode", models.CharField(choices=[("business", "Business financed"), ("partner", "Financing partner")], default="business", max_length=16)),
                ("status", models.CharField(choices=[("active", "Active"), ("due", "Due"), ("overdue", "Overdue"), ("paid", "Paid"), ("cancelled", "Cancelled")], db_index=True, default="active", max_length=16)),
                ("customer_name", models.CharField(max_length=120)),
                ("customer_phone", models.CharField(blank=True, default="", max_length=32)),
                ("customer_region", models.CharField(blank=True, default="", max_length=120)),
                ("contract_total", models.DecimalField(decimal_places=2, max_digits=14)),
                ("upfront_cash", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("trade_in_item_name", models.CharField(blank=True, default="", max_length=160)),
                ("trade_in_credit", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("installment_amount", models.DecimalField(decimal_places=2, max_digits=14)),
                ("frequency", models.CharField(choices=[("weekly", "Weekly"), ("monthly", "Monthly")], max_length=12)),
                ("next_due_date", models.DateField(blank=True, db_index=True, null=True)),
                ("release_threshold_percent", models.DecimalField(decimal_places=2, default=100, max_digits=5)),
                ("product_released_at", models.DateTimeField(blank=True, null=True)),
                ("partner_name", models.CharField(blank=True, default="", max_length=120)),
                ("partner_settlement_amount", models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True)),
                ("partner_settlement_received", models.BooleanField(default=False)),
                ("business_commission", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("notes", models.CharField(blank=True, default="", max_length=500)),
                ("business", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="financing_agreements", to="workspaces.business")),
                ("recorded_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="recorded_financing_agreements", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "commerce_financing_agreements", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="FinancingItem",
            fields=[
                ("id", models.UUIDField(default=common.database.uuid.generate_uuid, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(db_index=True, default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("item_name", models.CharField(max_length=160)),
                ("item_details", models.JSONField(blank=True, default=dict)),
                ("quantity", models.DecimalField(decimal_places=3, max_digits=14)),
                ("unit_price", models.DecimalField(decimal_places=2, max_digits=14)),
                ("line_total", models.DecimalField(decimal_places=2, max_digits=14)),
                ("acquisition_unit_cost", models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True)),
                ("cost_total", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("warranty_months", models.PositiveSmallIntegerField(blank=True, choices=[(3, "3 months"), (6, "6 months"), (12, "12 months"), (24, "24 months")], null=True)),
                ("agreement", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="commerce.financingagreement")),
                ("product", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="financing_items", to="commerce.product")),
                ("tracked_unit", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="financing_items", to="commerce.trackedunit")),
            ],
            options={"db_table": "commerce_financing_items"},
        ),
        migrations.CreateModel(
            name="FinancingPayment",
            fields=[
                ("id", models.UUIDField(default=common.database.uuid.generate_uuid, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(db_index=True, default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=14)),
                ("paid_at", models.DateTimeField()),
                ("method", models.CharField(blank=True, default="", max_length=40)),
                ("reference", models.CharField(blank=True, default="", max_length=80)),
                ("agreement", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="payments", to="commerce.financingagreement")),
                ("recorded_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="recorded_financing_payments", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "commerce_financing_payments", "ordering": ["-paid_at", "-created_at"]},
        ),
        migrations.CreateModel(
            name="FinancingDocument",
            fields=[
                ("id", models.UUIDField(default=common.database.uuid.generate_uuid, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(db_index=True, default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("file", models.FileField(upload_to=apps.commerce.financing.models.financing_document_upload_path)),
                ("original_name", models.CharField(max_length=180)),
                ("description", models.CharField(blank=True, default="", max_length=240)),
                ("agreement", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="documents", to="commerce.financingagreement")),
                ("uploaded_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="uploaded_financing_documents", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "commerce_financing_documents", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="FinancingAllocation",
            fields=[
                ("id", models.UUIDField(default=common.database.uuid.generate_uuid, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(db_index=True, default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("quantity", models.DecimalField(decimal_places=3, max_digits=14)),
                ("unit_cost", models.DecimalField(decimal_places=2, max_digits=14)),
                ("batch", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="financing_allocations", to="commerce.stockbatch")),
                ("financing_item", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="allocations", to="commerce.financingitem")),
            ],
            options={"db_table": "commerce_financing_allocations"},
        ),
        migrations.AddConstraint(
            model_name="financingagreement",
            constraint=models.UniqueConstraint(fields=("business", "reference"), name="commerce_financing_reference_unique"),
        ),
        migrations.AddConstraint(
            model_name="financingagreement",
            constraint=models.UniqueConstraint(fields=("business", "sequence"), name="commerce_financing_sequence_unique"),
        ),
    ]
