from rest_framework import serializers
from .models import BuildingManager, Tenant, Flat, Payment, Communication, Landlord, UtilitiesAdjustment, LandlordExpense, ExtraCharge
import re
from django.db.models import Sum
from decimal import Decimal
from datetime import date

class BuildingManagerSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuildingManager
        fields = '__all__'

class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = [
            'id', 
            'name', 
            'email',
            'phone_number',
            'start_date',
            'flat',
            'deposit_amount',
            'address',
            'post_code',
            'city',
        ]

    def validate(self, data):
        # Validate phone number format if provided
        if 'phone_number' in data and data['phone_number']:
            # Add any specific phone number validation if needed
            pass

        # Validate email format if provided
        if 'email' in data and data['email']:
            # Email validation is handled by Django's EmailField
            pass

        return data

class FlatSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(read_only=True, allow_null=True)
    tenant_id = serializers.IntegerField(read_only=True, allow_null=True)
    tenant_end_date = serializers.DateField(read_only=True, allow_null=True)
    
    class Meta:
        model = Flat
        fields = [
            'id', 
            'flat_name', 
            'address', 
            'city', 
            'post_code',
            'rent_amount', 
            'utilities_amount',
            'number_of_rooms',
            'building_manager',
            'landlord',
            'tenant_name',
            'tenant_id',
            'tenant_end_date'
        ]

class PaymentSerializer(serializers.ModelSerializer):
    payment_month_str = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = ['id', 'tenant', 'amount' ,'amount_paid','payment_date', 'flat', 'payment_type', 'payment_month', 'payment_month_str', 'utilities_amount']  # Include utilities_amount

    def get_payment_month_str(self, obj):
        return obj.payment_month_str

class CommunicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Communication
        fields = ['id', 'tenant','reference_month_str' ,'communication_type', 'date_sent', 'notes', 'reference_month']  # Specify the fields to serialize

    def create(self, validated_data):
        """Create a new Communication instance."""
        return Communication.objects.create(**validated_data)

    def update(self, instance, validated_data):
        """Update an existing Communication instance."""
        instance.tenant = validated_data.get('tenant', instance.tenant)
        instance.communication_type = validated_data.get('communication_type', instance.communication_type)
        instance.date_sent = validated_data.get('date_sent', instance.date_sent)
        instance.notes = validated_data.get('notes', instance.notes)
        instance.reference_month = validated_data.get('reference_month', instance.reference_month)
        instance.save()
        return instance

class FlatBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flat
        fields = [
            'id', 
            'flat_name', 
            'address', 
            'city',
            'post_code',
            'rent_amount',
            'utilities_amount',
            'number_of_rooms'
        ]

class LandlordSerializer(serializers.ModelSerializer):
    flats = FlatBasicSerializer(many=True, read_only=True, source='flat_set')
    
    class Meta:
        model = Landlord
        fields = [
            'id', 
            'name', 
            'email',
            'phone_number',
            'address', 
            'city', 
            'post_code',
            'flats'
        ]

class FlatListSerializer(serializers.ModelSerializer):
    """Simplified Flat serializer for listing flats in landlord details"""
    class Meta:
        model = Flat
        fields = ['id', 'name', 'address', 'city', 'rent_amount']

class UtilitiesAdjustmentSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    utilities_balance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    yearly_utilities_paid = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True, allow_null=True)

    class Meta:
        model = UtilitiesAdjustment
        fields = [
            'id',
            'flat',
            'tenant',
            'tenant_name',
            'reference_year',
            'payment_date',
            'lift_amount',
            'heating_amount',
            'other_amount',
            'amount',
            'reference_month',
            'utilities_balance',
            'yearly_utilities_paid',
            'is_paid'
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # Calculate total charges including other_amount
        total_charges = (
            Decimal(str(instance.lift_amount or '0')) + 
            Decimal(str(instance.heating_amount or '0')) + 
            Decimal(str(instance.other_amount or '0'))
        )
        
        # Get yearly utilities paid
        from mls.models import Payment
        yearly_utilities = Payment.objects.filter(
            flat=instance.flat,
            payment_date__year=instance.reference_year
        ).aggregate(total=Sum('utilities_amount'))['total'] or Decimal('0.00')
        
        # Calculate balance
        data['utilities_balance'] = yearly_utilities - total_charges
        data['yearly_utilities_paid'] = yearly_utilities
        
        return data

class LandlordExpenseSerializer(serializers.ModelSerializer):
    expense_type_display = serializers.CharField(source='get_expense_type_display', read_only=True)
    reference_month_str = serializers.CharField(read_only=True)

    class Meta:
        model = LandlordExpense
        fields = [
            'id', 'flat', 'expense_type', 'expense_type_display', 'amount',
            'payment_date', 'reference_year', 'reference_month', 'reference_month_str',
            'description', 'receipt', 'created_at', 'updated_at'
        ]

class ExtraChargeSerializer(serializers.ModelSerializer):
    charge_type_display = serializers.CharField(source='get_charge_type_display', read_only=True)
    reference_month_str = serializers.CharField(read_only=True)

    class Meta:
        model = ExtraCharge
        fields = '__all__'

    def validate(self, data):
        # Validate that charge_amount is positive
        if data.get('charge_amount', 0) <= 0:
            raise serializers.ValidationError({"charge_amount": "Le montant doit être supérieur à 0"})

        return data