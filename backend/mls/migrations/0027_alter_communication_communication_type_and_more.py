# Generated by Django 5.1.2 on 2024-11-19 16:29

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mls', '0026_alter_communication_communication_type'),
    ]

    operations = [
        migrations.AlterField(
            model_name='communication',
            name='communication_type',
            field=models.CharField(choices=[('rent_receipt', 'Rent Receipt'), ('annual_receipt', 'Annual Receipt'), ('missing_payment_notice', 'Missing Payment Notice'), ('rent_notice', 'Rent Notice'), ('rent_notice_with_adjustment', 'Rent Notice with Adjustment'), ('charges_notice', 'Régularisation des charges'), ('other', 'Autre')], max_length=40, verbose_name='Type de communication'),
        ),
        migrations.AlterField(
            model_name='flat',
            name='landlord',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='flat_set', to='mls.landlord', verbose_name='Propriétaire'),
        ),
        migrations.CreateModel(
            name='LandlordExpense',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('expense_type', models.CharField(choices=[('property_tax', 'Taxe Foncière'), ('works', 'Travaux'), ('condo_fees', 'Charges de Copropriété'), ('insurance', 'Assurance'), ('other', 'Autres')], default='other', max_length=20)),
                ('amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('payment_date', models.DateField()),
                ('reference_year', models.IntegerField(help_text='Year the expense is for')),
                ('description', models.TextField(blank=True, help_text='Additional details about the expense', null=True)),
                ('receipt', models.FileField(blank=True, help_text='Upload receipt or relevant documentation', null=True, upload_to='landlord_expenses/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('flat', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='landlord_expenses', to='mls.flat')),
            ],
            options={
                'verbose_name': 'Dépense propriétaire',
                'verbose_name_plural': 'Dépenses propriétaire',
                'ordering': ['-payment_date'],
            },
        ),
    ]
