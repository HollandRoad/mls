from django.db import models
from django.utils import timezone
from django.db.models import Sum
from decimal import Decimal
from django.core.exceptions import ValidationError
from datetime import datetime

# Create your models here.
class Landlord(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nom du propriétaire")
    phone_number = models.CharField(max_length=15, verbose_name="Numéro de téléphone")
    email = models.EmailField(verbose_name="Email")
    address = models.CharField(max_length=255, verbose_name="Adresse")
    post_code = models.CharField(max_length=20, verbose_name="Code postal")
    city = models.CharField(max_length=100, verbose_name="Ville")

    class Meta:
        verbose_name = "Propriétaire"
        verbose_name_plural = "Propriétaires"

    def __str__(self):
        return self.name  # Return the name for display in admin


class BuildingManager(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nom du gestionnaire")
    phone_number = models.CharField(max_length=15, verbose_name="Numéro de téléphone")
    email = models.EmailField(verbose_name="Email")
    address = models.CharField(max_length=255, verbose_name="Adresse")
    post_code = models.CharField(max_length=20, verbose_name="Code postal")
    city = models.CharField(max_length=100, verbose_name="Ville")

    class Meta:
        verbose_name = "Gestionnaire"
        verbose_name_plural = "Gestionnaires"

    def __str__(self):
        return self.name  # Return the name for display in admin

class Tenant(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nom du locataire")
    phone_number = models.CharField(blank=True, null=True,max_length=15, verbose_name="Numéro de téléphone")
    email = models.EmailField(verbose_name="Email")
    flat = models.ForeignKey('Flat', on_delete=models.SET_NULL, verbose_name="Appartement", null=True, blank=True)
    deposit_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Montant du dépôt de garantie", default=0.00, null=True, blank=True)
    
    # New address fields added
    address = models.CharField(max_length=255, verbose_name="Adresse")
    post_code = models.CharField(max_length=20, verbose_name="Code postal")
    city = models.CharField(max_length=100, verbose_name="Ville")
    
    # New start_date field added
    start_date = models.DateField(verbose_name="Date de début", null=True, blank=True)
    end_date = models.DateField(verbose_name="Date de sortie", null=True, blank=True)
    is_active = models.BooleanField(default=True, verbose_name="Locataire actif")
    
    class Meta:
        verbose_name = "Locataire"
        verbose_name_plural = "Locataires"

    def __str__(self):
        return self.name  # Return the name for display in admin

class Flat(models.Model):
    flat_name = models.CharField(max_length=100, verbose_name="Nom de l'appartement")
    address = models.CharField(max_length=255, verbose_name="Adresse")
    post_code = models.CharField(max_length=20, verbose_name="Code postal")
    city = models.CharField(max_length=100, verbose_name="Ville")
    number_of_rooms = models.IntegerField(verbose_name="Nombre de chambres")
    rent_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Montant du loyer")
    utilities_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Montant des charges", default=0.00)  # New field added
    building_manager = models.ForeignKey(BuildingManager, on_delete=models.CASCADE, verbose_name="Gestionnaire")
    landlord = models.ForeignKey(Landlord, on_delete=models.CASCADE, verbose_name="Propriétaire", related_name='flat_set')

    @property
    def is_vacant(self):
        return not self.tenant_set.filter(is_active=True).exists()

    @property
    def current_tenant(self):
        return self.tenant_set.filter(is_active=True).first()

    @property
    def last_tenant_end_date(self):
        """Get the end date of the last tenant"""
        last_tenant = Tenant.objects.filter(
            flat=self,
            end_date__isnull=False
        ).order_by('-end_date').first()
        return last_tenant.end_date if last_tenant else None

    class Meta:
        verbose_name = "Appartement"
        verbose_name_plural = "Appartements"

    def __str__(self):
        return self.flat_name  # Return the flat name for display in admin

class Payment(models.Model):
    PAYMENT_TYPE_CHOICES = [
        ('loyer', 'Loyer'),
        ('ajustement_charge', 'Ajustement Charge'),
        ('autre', 'Autre'),
    ]

    tenant = models.ForeignKey('Tenant', on_delete=models.CASCADE, verbose_name="Locataire")
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Montant Loyer")
    
    utilities_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Montant des charges", default=0.00)
    payment_date = models.DateField(verbose_name="Date de paiement")
    flat = models.ForeignKey('Flat', on_delete=models.CASCADE, verbose_name="Appartement")
    payment_type = models.CharField(max_length=50, choices=PAYMENT_TYPE_CHOICES, verbose_name="Type de paiement")
    payment_month = models.DateField(blank=True, null=True, verbose_name="Mois de paiement")
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Montant payé", default=0.00)

    class Meta:
        verbose_name = "Paiement"
        verbose_name_plural = "Paiements"

    @property
    def payment_month_str(self):
        """Return the payment month as a string in YYYY-MM format."""
        if self.payment_month:
            return self.payment_month.strftime('%Y-%m')
        return "Mois non spécifié"

    def __str__(self):
        # Format payment_month as YYYY-MM if it exists
        if self.payment_month:
            return f"Paiement de {self.amount} pour {self.tenant.name} en {self.payment_month_str}"
        return f"Paiement de {self.amount} pour {self.tenant.name} - Mois non spécifié"

class Communication(models.Model):
    COMMUNICATION_TYPE_CHOICES = [
        ('rent_receipt', 'Rent Receipt'),
        ('annual_receipt', 'Annual Receipt'),
        ('missing_payment_notice', 'Missing Payment Notice'),
        ('rent_notice', 'Rent Notice'),
        ('rent_notice_with_adjustment', 'Rent Notice with Adjustment'),
        ('charges_notice', 'Régularisation des charges'),
        ('other', 'Autre'),
    ]

    tenant = models.ForeignKey('Tenant', on_delete=models.CASCADE, related_name='communications', verbose_name="Locataire")
    communication_type = models.CharField(max_length=40, choices=COMMUNICATION_TYPE_CHOICES, verbose_name="Type de communication")
    date_sent = models.DateField(verbose_name="Date d'envoi")
    notes = models.TextField(blank=True, null=True, verbose_name="Notes")
    reference_month = models.DateField(blank=True, null=True, verbose_name="Mois de reference")


    @property
    def reference_month_str(self):
        """Return the payment month as a string in YYYY-MM format."""
        if self.reference_month:
            return self.reference_month.strftime('%Y-%m')
        return "Mois non spécifié"
    
    class Meta:
        verbose_name = "Communication"
        verbose_name_plural = "Communications"

    def __str__(self):
        return f"{self.tenant.name} - {self.communication_type} for {self.reference_month_str}"

class Backup(models.Model):
    OPERATION_CHOICES = [
        ('backup', 'Backup'),
        ('restore', 'Restore'),
    ]
    
    operation = models.CharField(max_length=7, choices=OPERATION_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50, default='success')
    details = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = "Backup"
        verbose_name_plural = "Backups"
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.operation} at {self.timestamp}"

class UtilitiesAdjustment(models.Model):
    flat = models.ForeignKey('Flat', on_delete=models.CASCADE, verbose_name="Appartement")
    tenant = models.ForeignKey('Tenant', on_delete=models.CASCADE, verbose_name="Locataire")
    reference_year = models.IntegerField(verbose_name="Année de référence")
    payment_date = models.DateField(verbose_name="Date de paiement", null=True, blank=True)
    lift_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Montant ascenseur", default=0.00)
    heating_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Montant chauffage", default=0.00)
    is_paid = models.BooleanField(default=False, verbose_name="Payé")
    other_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Montant autre", default=0.00)
    reference_month = models.DateField(
                    verbose_name="Mois de référence",
                    help_text="Month and year this expense is for (YYYY-MM)",
                    null=True,
                    blank=True
    )   
    class Meta:
        verbose_name = "Régularisation des charges"
        verbose_name_plural = "Régularisations des charges"
        unique_together = ['flat', 'reference_year']

    @property
    def amount(self):
        """Calculate total amount from lift and heating amounts"""
        return self.lift_amount + self.heating_amount + self.other_amount

    def calculate_utilities_balance(self):
        """Calculate the balance between paid utilities and actual charges"""
        # Calculate total charges including other_amount
        total_charges = (
            Decimal(str(self.lift_amount or '0')) + 
            Decimal(str(self.heating_amount or '0')) + 
            Decimal(str(self.other_amount or '0'))
        )
        
        # Get yearly utilities paid
        from .models import Payment  # Import here to avoid circular import
        yearly_utilities = Payment.objects.filter(
            flat=self.flat,
            payment_date__year=self.reference_year
        ).aggregate(total=Sum('utilities_amount'))['total'] or Decimal('0.00')

        # Return the difference
        return yearly_utilities - total_charges

    def __str__(self):
        return f"Régularisation {self.flat.flat_name} - {self.reference_year}"

class LandlordExpense(models.Model):
    EXPENSE_TYPES = [
        ('property_tax', 'Taxe Foncière'),
        ('works', 'Travaux'),
        ('plumbing', 'Plomberie'),
        ('condo_fees', 'Charges de Copropriété'),
        ('insurance', 'Assurance'),
        ('other', 'Autres'),
    ]

    flat = models.ForeignKey(
        'Flat',
        on_delete=models.CASCADE,
        related_name='landlord_expenses'
    )
    
    expense_type = models.CharField(
        max_length=20,
        choices=EXPENSE_TYPES,
        default='other'
    )
    
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )
    
    payment_date = models.DateField()
    
    reference_year = models.IntegerField(
        help_text="Year the expense is for"
    )
    
    reference_month = models.DateField(
        verbose_name="Mois de référence",
        help_text="Month and year this expense is for (YYYY-MM)",
        null=True,
        blank=True
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Additional details about the expense"
    )
    
    receipt = models.FileField(
        upload_to='landlord_expenses/',
        null=True,
        blank=True,
        help_text="Upload receipt or relevant documentation"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-payment_date']
        verbose_name = "Dépense propriétaire"
        verbose_name_plural = "Dépenses propriétaire"

    def __str__(self):
        month_str = self.reference_month.strftime('%Y-%m') if self.reference_month else str(self.reference_year)
        return f"{self.get_expense_type_display()} - {self.flat.flat_name} - {month_str}"

    @property
    def reference_month_str(self):
        """Return the reference month as a string in YYYY-MM format."""
        if self.reference_month:
            return self.reference_month.strftime('%Y-%m')
        return str(self.reference_year)

    def clean(self):
        if self.amount < 0:
            raise ValidationError("Le montant ne peut pas être négatif")
        
        if self.reference_year > datetime.now().year + 1:
            raise ValidationError("L'année de référence ne peut pas être future")
        
        if self.payment_date > datetime.now().date():
            raise ValidationError("La date de paiement ne peut pas être future")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

class ExtraCharge(models.Model):
    CHARGE_TYPE_CHOICES = [
        ('ordures_menageres', 'Ordures Ménagères'),
        ('entretien', 'Entretien'),
        ('autre', 'Autre'),
    ]

    tenant = models.ForeignKey('Tenant', on_delete=models.CASCADE, verbose_name="Locataire")
    flat = models.ForeignKey('Flat', on_delete=models.CASCADE, verbose_name="Appartement")
    charge_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Montant de la charge")
    charge_type = models.CharField(max_length=50, choices=CHARGE_TYPE_CHOICES, verbose_name="Type de charge")
    reference_month = models.DateField(verbose_name="Mois de référence")
    description = models.TextField(blank=True, null=True, verbose_name="Description")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Charge supplémentaire"
        verbose_name_plural = "Charges supplémentaires"
        ordering = ['-reference_month']

    def __str__(self):
        return f"{self.get_charge_type_display()} - {self.tenant.name} - {self.reference_month.strftime('%Y-%m')}"

    @property
    def reference_month_str(self):
        """Return the reference month as a string in YYYY-MM format."""
        return self.reference_month.strftime('%Y-%m')

