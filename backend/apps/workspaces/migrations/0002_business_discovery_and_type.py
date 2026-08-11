from django.db import migrations, models
from django.db.models.functions import Lower
from django.utils.text import slugify


def populate_public_handles(apps, schema_editor):
    Business = apps.get_model("workspaces", "Business")
    used = set()
    for business in Business.objects.order_by("created_at", "id"):
        base = slugify(business.name)[:64] or "workspace"
        candidate = base
        if candidate.lower() in used:
            candidate = f"{base}-{str(business.id).replace('-', '')[:6]}"
        suffix = 2
        while candidate.lower() in used:
            candidate = f"{base[:70]}-{suffix}"
            suffix += 1
        business.public_handle = candidate
        business.save(update_fields=["public_handle"])
        used.add(candidate.lower())


class Migration(migrations.Migration):
    dependencies = [("workspaces", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="business",
            name="is_discoverable",
            field=models.BooleanField(db_index=True, default=True),
        ),
        migrations.AddField(
            model_name="business",
            name="public_handle",
            # Keep the temporary backfill field free of PostgreSQL's
            # varchar_pattern_ops index. The final SlugField below creates it
            # once after every existing Business has a handle.
            field=models.CharField(max_length=80, null=True),
        ),
        migrations.AddField(
            model_name="business",
            name="workspace_type",
            field=models.CharField(
                choices=[
                    ("business", "Business"),
                    ("service_provider", "Service provider"),
                    ("creator_brand", "Creator or personal brand"),
                    ("personal", "Personal"),
                    ("other", "Other"),
                ],
                db_index=True,
                default="business",
                max_length=24,
            ),
        ),
        migrations.RunPython(populate_public_handles, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="business",
            name="public_handle",
            field=models.SlugField(max_length=80, unique=True),
        ),
        migrations.AddConstraint(
            model_name="business",
            constraint=models.UniqueConstraint(
                Lower("public_handle"), name="workspace_public_handle_ci_unique"
            ),
        ),
    ]
