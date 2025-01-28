# Generated by Django 5.1.2 on 2024-11-02 08:45

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mls', '0015_landlord_address_landlord_city_landlord_post_code'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenant',
            name='deposit_amount',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=10, verbose_name='Montant du dépôt de garantie'),
        ),
    ]
