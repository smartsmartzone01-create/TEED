from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("commerce", "0013_returnreplacement_acquisition_source"),
    ]

    operations = [
        migrations.AddField(
            model_name="expense",
            name="expense_number",
            field=models.CharField(blank=True, default="", max_length=40),
        ),
        migrations.AddField(
            model_name="expense",
            name="payee",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="expense",
            name="payment_method",
            field=models.CharField(
                choices=[
                    ("cash", "Cash"),
                    ("bank_transfer", "Bank transfer"),
                    ("mobile_money", "Mobile money"),
                    ("card", "Card"),
                    ("cheque", "Cheque"),
                    ("other", "Other"),
                ],
                default="cash",
                max_length=24,
            ),
        ),
        migrations.AddField(
            model_name="expense",
            name="reference",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="expense",
            name="notes",
            field=models.CharField(blank=True, default="", max_length=300),
        ),
        migrations.AlterField(
            model_name="expense",
            name="category",
            field=models.CharField(
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
                max_length=48,
            ),
        ),
        migrations.AlterField(
            model_name="expense",
            name="description",
            field=models.CharField(blank=True, default="", max_length=160),
        ),
        migrations.AddField(
            model_name="budget",
            name="notes",
            field=models.CharField(blank=True, default="", max_length=300),
        ),
        migrations.AlterField(
            model_name="budget",
            name="category",
            field=models.CharField(
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
                max_length=48,
            ),
        ),
        migrations.AlterModelOptions(
            name="expense",
            options={"ordering": ["-incurred_at", "-created_at"]},
        ),
        migrations.AlterModelOptions(
            name="budget",
            options={"ordering": ["-month", "category"]},
        ),
    ]
