# Generated by Django 5.1.2 on 2024-10-26 09:30

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mls', '0005_alter_buildingmanager_options_alter_flat_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenant',
            name='start_date',
            field=models.DateField(blank=True, null=True, verbose_name='Date de début'),
        ),
    ]
