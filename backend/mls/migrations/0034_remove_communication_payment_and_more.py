# Generated by Django 5.1.2 on 2024-11-23 09:44

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('mls', '0033_communication_payment_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='communication',
            name='payment',
        ),
        migrations.RemoveField(
            model_name='communication',
            name='utilities_adjustment',
        ),
    ]
