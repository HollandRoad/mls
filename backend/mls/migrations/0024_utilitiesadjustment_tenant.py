# Generated by Django 5.1.2 on 2024-11-07 21:08

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mls', '0023_alter_tenant_deposit_amount'),
    ]

    operations = [
        migrations.AddField(
            model_name='utilitiesadjustment',
            name='tenant',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, to='mls.tenant', verbose_name='Locataire'),
            preserve_default=False,
        ),
    ]
