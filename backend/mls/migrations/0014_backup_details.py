# Generated by Django 5.1.2 on 2024-11-01 10:47

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mls', '0013_backup_alter_communication_communication_type_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='backup',
            name='details',
            field=models.TextField(blank=True, null=True),
        ),
    ]
