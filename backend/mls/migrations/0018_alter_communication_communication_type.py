# Generated by Django 5.1.2 on 2024-11-02 13:11

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mls', '0017_buildingmanager_address_buildingmanager_city_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='communication',
            name='communication_type',
            field=models.CharField(choices=[('rent_receipt', 'Rent Receipt'), ('annual_receipt', 'Annual Receipt'), ('missing_payment_notice', 'Missing Payment Notice'), ('rent_notice', 'Rent Notice'), ('other', 'Autre')], max_length=40, verbose_name='Type de communication'),
        ),
    ]
