import django.db.models.deletion
import django.db.models.functions.text
from django.db import migrations, models


def ensure_storefront_customer_table_is_empty(apps, schema_editor):
    StorefrontCustomer = apps.get_model("identity", "StorefrontCustomer")
    if StorefrontCustomer.objects.exists():
        raise RuntimeError(
            "Storefront customer business scoping cannot be applied while existing "
            "storefront customer rows have no business assignment. Remove test/dev "
            "rows or assign them deliberately before rerunning this migration."
        )


class Migration(migrations.Migration):
    dependencies = [
        ("identity", "0012_storefront_customer_identity"),
        ("workspaces", "0005_business_deletion_schedule"),
    ]

    operations = [
        migrations.AddField(
            model_name="storefrontcustomer",
            name="business",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="storefront_customers",
                to="workspaces.business",
            ),
        ),
        migrations.RunPython(
            ensure_storefront_customer_table_is_empty,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="storefrontcustomer",
            name="email",
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AlterField(
            model_name="storefrontcustomer",
            name="phone_number",
            field=models.CharField(blank=True, max_length=16, null=True),
        ),
        migrations.RemoveConstraint(
            model_name="storefrontcustomer",
            name="identity_sf_email_ci_uniq",
        ),
        migrations.AddConstraint(
            model_name="storefrontcustomer",
            constraint=models.UniqueConstraint(
                django.db.models.functions.text.Lower("email"),
                models.F("business"),
                condition=models.Q(email__isnull=False),
                name="identity_sf_biz_email_ci_uniq",
            ),
        ),
        migrations.AddConstraint(
            model_name="storefrontcustomer",
            constraint=models.UniqueConstraint(
                fields=("business", "phone_number"),
                condition=models.Q(phone_number__isnull=False),
                name="identity_sf_biz_phone_uniq",
            ),
        ),
        migrations.AlterField(
            model_name="storefrontcustomer",
            name="business",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="storefront_customers",
                to="workspaces.business",
            ),
        ),
    ]
