from django.db import migrations, models


def move_warranty_to_items(apps, schema_editor):
    Sale = apps.get_model("commerce", "Sale")
    SaleItem = apps.get_model("commerce", "SaleItem")
    for sale in Sale.objects.exclude(warranty_months=None).iterator():
        SaleItem.objects.filter(sale_id=sale.id).update(
            warranty_months=sale.warranty_months
        )


def restore_sale_warranty(apps, schema_editor):
    Sale = apps.get_model("commerce", "Sale")
    SaleItem = apps.get_model("commerce", "SaleItem")
    for sale in Sale.objects.all().iterator():
        warranty_months = (
            SaleItem.objects.filter(sale_id=sale.id)
            .exclude(warranty_months=None)
            .values_list("warranty_months", flat=True)
            .first()
        )
        if warranty_months is not None:
            Sale.objects.filter(pk=sale.pk).update(warranty_months=warranty_months)


class Migration(migrations.Migration):
    dependencies = [
        ("commerce", "0016_sale_warranty_months"),
    ]

    operations = [
        migrations.AddField(
            model_name="saleitem",
            name="warranty_months",
            field=models.PositiveSmallIntegerField(
                blank=True,
                choices=[
                    (3, "3 months"),
                    (6, "6 months"),
                    (12, "12 months"),
                    (24, "24 months"),
                ],
                null=True,
            ),
        ),
        migrations.RunPython(move_warranty_to_items, restore_sale_warranty),
        migrations.RemoveField(
            model_name="sale",
            name="warranty_months",
        ),
    ]
