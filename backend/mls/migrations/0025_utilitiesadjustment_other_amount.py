# Generated by Django 5.1.2 on 2024-11-09 15:05

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mls', '0024_utilitiesadjustment_tenant'),
    ]

    operations = [
        migrations.AddField(
            model_name='utilitiesadjustment',
            name='other_amount',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=10, verbose_name='Montant autre'),
        ),
    ]
