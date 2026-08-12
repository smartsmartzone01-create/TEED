from django.db import migrations, models


def normalize_workspace_types_and_categories(apps, schema_editor):
    Business = apps.get_model("workspaces", "Business")
    BusinessProfile = apps.get_model("workspaces", "BusinessProfile")
    type_mapping = {
        "service_provider": "service",
        "creator_brand": "personal_brand",
        "personal": "personal_brand",
        "other": "business",
    }
    for old_value, new_value in type_mapping.items():
        Business.objects.filter(workspace_type=old_value).update(
            workspace_type=new_value
        )
    BusinessProfile.objects.exclude(business_category="").update(
        business_category="other"
    )


class Migration(migrations.Migration):
    dependencies = [("workspaces", "0003_business_management")]

    operations = [
        migrations.RenameField(
            model_name="businessprofile",
            old_name="industry",
            new_name="business_category",
        ),
        migrations.RemoveField(
            model_name="businessprofile",
            name="description",
        ),
        migrations.AlterField(
            model_name="business",
            name="workspace_type",
            field=models.CharField(
                choices=[
                    ("business", "Business"),
                    ("service", "Service"),
                    ("personal_brand", "Personal brand"),
                ],
                db_index=True,
                default="business",
                max_length=24,
            ),
        ),
        migrations.AlterField(
            model_name="businessprofile",
            name="business_category",
            field=models.CharField(
                blank=True,
                choices=[
                    ("retail_commerce", "Retail and commerce"),
                    ("food_hospitality", "Food and hospitality"),
                    ("professional_services", "Professional services"),
                    ("health_wellness", "Health and wellness"),
                    ("education_training", "Education and training"),
                    ("technology_digital", "Technology and digital"),
                    ("creative_media", "Creative and media"),
                    ("manufacturing_agriculture", "Manufacturing and agriculture"),
                    ("nonprofit_community", "Nonprofit and community"),
                    ("other", "Other"),
                ],
                default="",
                max_length=32,
            ),
        ),
        migrations.RunPython(
            normalize_workspace_types_and_categories,
            migrations.RunPython.noop,
        ),
    ]
