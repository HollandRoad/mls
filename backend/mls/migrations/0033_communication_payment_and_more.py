# Generated by Django 5.1.2 on 2024-11-22 13:02

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mls', '0032_utilitiesadjustment_reference_month'),
    ]

    operations = [
        migrations.AddField(
            model_name='communication',
            name='payment',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='communications', to='mls.payment', verbose_name='Paiement'),
        ),
        migrations.AddField(
            model_name='communication',
            name='utilities_adjustment',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='communications', to='mls.utilitiesadjustment', verbose_name='Régularisation'),
        ),
    ]
