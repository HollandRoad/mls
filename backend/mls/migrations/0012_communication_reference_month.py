# Generated by Django 5.1.2 on 2024-10-30 10:25

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mls', '0011_payment_utilities_amount'),
    ]

    operations = [
        migrations.AddField(
            model_name='communication',
            name='reference_month',
            field=models.DateField(blank=True, null=True, verbose_name='Mois de reference'),
        ),
    ]
