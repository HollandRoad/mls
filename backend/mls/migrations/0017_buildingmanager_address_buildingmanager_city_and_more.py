# Generated by Django 5.1.2 on 2024-11-02 10:59

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mls', '0016_tenant_deposit_amount'),
    ]

    operations = [
        migrations.AddField(
            model_name='buildingmanager',
            name='address',
            field=models.CharField(default=1, max_length=255, verbose_name='Adresse'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='buildingmanager',
            name='city',
            field=models.CharField(default=1, max_length=100, verbose_name='Ville'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='buildingmanager',
            name='post_code',
            field=models.CharField(default=1, max_length=20, verbose_name='Code postal'),
            preserve_default=False,
        ),
    ]
