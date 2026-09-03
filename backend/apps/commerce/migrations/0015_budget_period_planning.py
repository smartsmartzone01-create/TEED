from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("commerce", "0014_finance_expense_details"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="budget",
            name="commerce_budget_period_unique",
        ),
        migrations.AlterField(
            model_name="budget",
            name="category",
            field=models.CharField(
                blank=True,
                choices=[
                    ("salaries_wages", "Salaries & wages"),
                    ("rent", "Rent"),
                    ("utilities", "Utilities"),
                    ("internet_phone", "Internet & phone"),
                    ("transport_travel", "Transport & travel"),
                    ("marketing_advertising", "Marketing & advertising"),
                    ("repairs_maintenance", "Repairs & maintenance"),
                    ("software_subscriptions", "Software & subscriptions"),
                    ("professional_services", "Professional services"),
                    ("bank_payment_fees", "Bank & payment fees"),
                    ("insurance", "Insurance"),
                    ("licenses_permits", "Licenses & permits"),
                    ("office_admin", "Office & administration"),
                    ("security_cleaning", "Security & cleaning"),
                    ("taxes_duties", "Taxes & duties"),
                    ("interest_finance", "Interest & finance charges"),
                    ("meals_hospitality", "Meals & hospitality"),
                    ("other", "Other"),
                    ("stock_expense", "Stock acquisition cost"),
                ],
                default="",
                max_length=48,
            ),
        ),
        migrations.AlterField(
            model_name="budget",
            name="month",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="budget",
            name="period_start",
            field=models.DateField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="budget",
            name="period_type",
            field=models.CharField(
                choices=[
                    ("daily", "Daily"),
                    ("weekly", "Weekly"),
                    ("monthly", "Monthly"),
                ],
                default="monthly",
                max_length=12,
            ),
        ),
        migrations.AlterModelOptions(
            name="budget",
            options={"ordering": ["-period_start", "period_type", "-created_at"]},
        ),
        migrations.AddConstraint(
            model_name="budget",
            constraint=models.UniqueConstraint(
                condition=models.Q(period_start__isnull=False),
                fields=("business", "period_type", "period_start"),
                name="commerce_budget_general_period_unique",
            ),
        ),
    ]
