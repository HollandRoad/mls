from django.shortcuts import render
from rest_framework import viewsets, generics
# Ensure the mls directory is a package
# Add an __init__.py file in the mls directory if it doesn't exist
from .models import BuildingManager, Tenant, Flat, Payment, Communication, Backup, Landlord, UtilitiesAdjustment, LandlordExpense, ExtraCharge
from mls.serializers import BuildingManagerSerializer, TenantSerializer, FlatSerializer, PaymentSerializer,CommunicationSerializer, LandlordSerializer, UtilitiesAdjustmentSerializer, LandlordExpenseSerializer, ExtraChargeSerializer
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status
from datetime import datetime, date  # Import date class
import re
from .utils import count_missing_payments
from django.core.mail import EmailMultiAlternatives
from rest_framework.decorators import api_view
from datetime import datetime
from dateutil.relativedelta import relativedelta
from django.db.models import Q
from django.http import HttpResponse
from weasyprint import HTML, CSS
from django.template.loader import render_to_string
from django.shortcuts import get_object_or_404
from django.core.management import call_command
from backend.backup_db import list_backups
from backend.restore_db import restore_database
from django.db.models import Subquery, OuterRef
from django.db.models.functions import Coalesce
from django.db.models import Sum, F, Value, DecimalField
from decimal import Decimal
from django.template.loader import get_template
import tempfile
from django.conf import settings
import os

# Create your views here.

class BuildingManagerViewSet(viewsets.ModelViewSet):
    queryset = BuildingManager.objects.all()
    serializer_class = BuildingManagerSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer

    @action(detail=False, methods=['get'], url_path='unpaid')
    def unpaid_tenants(self, request):
        current_month = timezone.now().month
        current_year = timezone.now().year

        # Get the tenant_id from query parameters
        tenant_id = request.query_params.get('tenant_id', None)

        # Filter tenants based on tenant_id if provided
        if tenant_id:
            tenants = Tenant.objects.filter(id=tenant_id)
        else:
            tenants = self.get_queryset()

        unpaid_tenants_info = []

        for tenant in tenants:
            # Get the start date for the tenant
            start_date = tenant.start_date

            # Get all payment months for the tenant
            paid_months = Payment.objects.filter(tenant=tenant).values_list('payment_month', flat=True)

            # Check for unpaid months starting from the start_date
            if start_date:
                start_month = start_date.month
                start_year = start_date.year
            else:
                # If no start_date is set, skip this tenant
                continue

            for month in range(start_month, current_month + 1):
                # Adjust year if necessary
                year = current_year if month >= start_month else current_year - 1

                # Check if the tenant has paid for the month
                payment_made = any(payment_month.month == month and payment_month.year == year for payment_month in paid_months)

                # Assuming rent amount is stored in the Payment model
                rent_amount = tenant.flat.rent_amount  # Adjust this line based on your model structure
                unpaid_tenants_info.append({
                    'tenant_id': tenant.id,
                    'tenant_name': tenant.name,
                    'flat_name': tenant.flat.flat_name,
                    'month': month,
                    'rent': rent_amount,
                    'payment_made': payment_made
                })

        return Response(unpaid_tenants_info)

    @action(detail=False, methods=['get'], url_path='payment-status')
    def payment_status(self, request):
        current_date = timezone.now()
        current_month = current_date.month
        current_year = current_date.year

        # Get all tenants
        tenants = self.get_queryset()
        payment_status_info = []

        for tenant in tenants:
            # Get the start date for the tenant
            start_date = tenant.start_date

            if start_date:
                # Calculate the number of months from start_date to now
                start_month = start_date.month
                start_year = start_date.year

                # Iterate through each month from start_date to current date
                for year in range(start_year, current_year + 1):
                    for month in range(1, 13):
                        if year == start_year and month < start_month:
                            continue  # Skip months before the start date
                        if year == current_year and month > current_month:
                            break  # Stop if we exceed the current month

                        # Check if the payment was made for this month
                        payment_made = Payment.objects.filter(
                            tenant=tenant,
                            payment_month__year=year,
                            payment_month__month=month
                        ).exists()

                        # Assuming rent amount is stored in the Payment model
                        rent_amount = tenant.flat.rent_amount  # Adjust this line based on your model structure
                        payment_status_info.append({
                            'tenant_id': tenant.id,
                            'tenant_name': tenant.name,
                            'flat_name': tenant.flat.flat_name,
                            'month': month,
                            'year': year,
                            'rent': rent_amount,
                            'payment_made': payment_made  # Only keep payment_made
                        })

        return Response(payment_status_info)

    @action(detail=False, methods=['get'], url_path='tenant-summary')
    def tenant_summary(self, request):
        current_date = timezone.now()
        current_month = current_date.month
        current_year = current_date.year

        # Get month_year from query parameters
        month_year = request.query_params.get('month_year', None)

        # Initialize month and year
        month = current_month
        year = current_year

        # Validate month_year input
        if month_year:
            try:
                year_str, month_str = month_year.split('-')
                year = int(year_str)
                month = int(month_str)

                if month < 1 or month > 12:
                    return Response({"error": "Month must be between 1 and 12."}, status=400)
            except ValueError:
                return Response({"error": "Invalid month_year format. Use 'YYYY-MM'."}, status=400)
            
        # Get tenant_id from query parameters
        tenant_id = request.query_params.get('tenant_id', None)
        
        # Get all active tenants and filter if tenant_id is provided
        tenants = self.get_queryset().filter(is_active=True)
        if tenant_id:
            tenants = tenants.filter(id=tenant_id)

        tenant_summary_info = []

        for tenant in tenants:
            # Count missed payments prior to the specified month_year
            missed_payments_count = count_missing_payments(tenant)

            # Check if a missing payment email was sent for the specified month_year
            email_relance_sent = Communication.objects.filter(
                tenant=tenant,
                communication_type='missing_payment_notice',
                reference_month=date(year, month, 1)  # First day of the month
            ).exists()

            # Serialize tenant data
            tenant_data = TenantSerializer(tenant).data  # Serialize tenant data
            tenant_id = tenant_data.get('id')

            # Get landlord information
            landlord_info = None
            if tenant.flat and tenant.flat.landlord:
                landlord_info = {
                    'id': tenant.flat.landlord.id,
                    'name': tenant.flat.landlord.name,
                    'phone_number': tenant.flat.landlord.phone_number,
                    'email': tenant.flat.landlord.email,    
                    'address': tenant.flat.landlord.address,
                    'post_code': tenant.flat.landlord.post_code,
                    'city': tenant.flat.landlord.city,
                }

            # Get building manager information
            building_manager_info = None
            if tenant.flat and tenant.flat.building_manager:
                building_manager_info = {
                    'id': tenant.flat.building_manager.id,
                    'name': tenant.flat.building_manager.name,
                    'email': tenant.flat.building_manager.email,
                    'phone_number': tenant.flat.building_manager.phone_number
                }

            tenant_summary_info.append({
                **tenant_data,
                'missed_payments_count': missed_payments_count,  # Add missed payments count
                'communications': CommunicationSerializer(Communication.objects.filter(tenant=tenant_id), many=True).data if tenant_id  else None,  # Renamed field indicating if email was sent
                'flat': FlatSerializer(tenant.flat).data if tenant.flat else None,
                'payments': PaymentSerializer(Payment.objects.filter(tenant=tenant), many=True).data,
                'landlord': landlord_info,  # Include landlord information
                'building_manager': building_manager_info,  # Add building manager info
                'adjustments': UtilitiesAdjustmentSerializer(UtilitiesAdjustment.objects.filter(flat=tenant.flat), many=True).data if tenant.flat else None,
            })

        return Response(tenant_summary_info)

    def update(self, request, *args, **kwargs):
        try:
            tenant = self.get_object()
            data = request.data.copy()
            
            print("Original tenant phone:", tenant.phone_number)  # Debug print
            print("Incoming data:", data)  # Debug print
            
            # Handle empty strings for optional fields
            if 'start_date' in data and data['start_date'] == '':
                data['start_date'] = None
                
            if 'phone_number' in data and data['phone_number'] == '':
                data['phone_number'] = None
            
            serializer = self.get_serializer(
                tenant,
                data=data,
                partial=kwargs.pop('partial', False)
            )

            if not serializer.is_valid():
                print("Validation errors:", serializer.errors)
                return Response(
                    {"error": "Invalid data", "details": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            print("Valid serializer data:", serializer.validated_data)  # Debug print
            
            updated_tenant = serializer.save()
            print("Updated tenant phone:", updated_tenant.phone_number)  # Debug print

            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Error updating tenant: {str(e)}")
            return Response(
                {"error": "Failed to update tenant", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request, *args, **kwargs):
        try:
            print("Received data:", request.data)  # Debug print
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                self.perform_create(serializer)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            print("Validation errors:", serializer.errors)  # Debug print
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print("Exception:", str(e))  # Debug print
            return Response(
                {"error": f"Error creating tenant: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def end_tenancy(self, request, pk=None):
        """End a tenant's tenancy and mark flat as vacant"""
        tenant = self.get_object()
        end_date = request.data.get('end_date', timezone.now().date())
        
        tenant.end_date = end_date
        tenant.is_active = False
        tenant.flat = None  # Remove flat association
        tenant.save()
        
        return Response({'status': 'Tenancy ended successfully'})

    @action(detail=True, methods=['post'])
    def assign_flat(self, request, pk=None):
        """Assign a flat to a tenant"""
        tenant = self.get_object()
        flat_id = request.data.get('flat_id')
        start_date = request.data.get('start_date')
        
        if not flat_id or not start_date:
            return Response(
                {'error': 'flat_id and start_date are required'}, 
                status=400
            )
            
        # End previous tenant's tenancy if exists
        Tenant.objects.filter(
            flat_id=flat_id, 
            is_active=True
        ).update(
            is_active=False,
            end_date=start_date
        )
        
        # Assign new tenant
        tenant.flat_id = flat_id
        tenant.start_date = start_date
        tenant.is_active = True
        tenant.end_date = None
        tenant.save()
        
        return Response({'status': 'Flat assigned successfully'})

    @action(detail=False, methods=['get'])
    def available(self, request):
        """Get tenants without an active flat assignment"""
        tenants = Tenant.objects.filter(
            Q(is_active=False) | Q(flat__isnull=True)
        )
        serializer = self.get_serializer(tenants, many=True)
        return Response(serializer.data)

class FlatViewSet(viewsets.ModelViewSet):
    queryset = Flat.objects.all()
    serializer_class = FlatSerializer

    def get_queryset(self):
        """
        Enhance queryset with tenant information and last tenant end date
        Also handle filtering by landlord and manager
        """
        queryset = Flat.objects.all()

        # Get filter parameters
        landlord_id = self.request.query_params.get('landlord', None)
        manager_id = self.request.query_params.get('manager', None)

        # Apply filters if provided
        if landlord_id:
            queryset = queryset.filter(landlord_id=landlord_id)
        if manager_id:
            queryset = queryset.filter(building_manager_id=manager_id)

        # Add annotations
        return queryset.annotate(
            tenant_name=Subquery(
                Tenant.objects.filter(
                    flat=OuterRef('pk'),
                    is_active=True
                ).values('name')[:1]
            ),
            tenant_id=Subquery(
                Tenant.objects.filter(
                    flat=OuterRef('pk'),
                    is_active=True
                ).values('id')[:1]
            ),
            tenant_end_date=Coalesce(
                Subquery(
                    Tenant.objects.filter(
                        flat=OuterRef('pk'),
                        is_active=False
                    ).order_by('-end_date').values('end_date')[:1]
                ),
                None
            )
        )

    @action(detail=False, methods=['get'])
    def available(self, request):
        """Get flats that don't have active tenants"""
        available_flats = Flat.objects.filter(tenant__isnull=True)
        serializer = self.get_serializer(available_flats, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def vacant(self, request):
        """Get flats that don't have active tenants"""
        vacant_flats = Flat.objects.filter(tenant__isnull=True).annotate(
            tenant_end_date=Coalesce(
                Subquery(
                    Tenant.objects.filter(
                        flat=OuterRef('pk'),
                        is_active=False
                    ).order_by('-end_date').values('end_date')[:1]
                ),
                None
            )
        )
        serializer = self.get_serializer(vacant_flats, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='summary')
    def flat_summary(self, request, pk=None):
        """Get comprehensive summary of flat including related entities"""
        try:
            flat = self.get_object()
            
            # Get active tenant
            active_tenant = Tenant.objects.filter(
                flat=flat,
                is_active=True
            ).first()

            # Get communications if there's an active tenant
            communications = []
            if active_tenant:
                communications = Communication.objects.filter(
                    tenant=active_tenant
                ).order_by('-date_sent')

            # Get all adjustments
            adjustments = UtilitiesAdjustment.objects.filter(
                flat=flat
            ).order_by('-reference_year')

            # Process each adjustment to include yearly utilities paid
            processed_adjustments = []
            for adj in adjustments:
                yearly_utilities = Payment.objects.filter(
                    flat=flat,
                    payment_month__year=adj.reference_year,
                ).aggregate(
                    total=Coalesce(Sum('utilities_amount'), Value(0, output_field=DecimalField()))
                )['total'] or Decimal('0.00')

                processed_adj = {
                    'id': adj.id,
                    'reference_year': adj.reference_year,
                    'amount': adj.amount,
                    'is_paid': adj.is_paid,
                    'yearly_utilities_paid': yearly_utilities,
                    'utilities_balance': adj.amount - yearly_utilities  if yearly_utilities else None,
                    'reference_month': adj.reference_month,
                    'lift_amount': adj.lift_amount,
                    'heating_amount': adj.heating_amount,
                    'other_amount': adj.other_amount
                }
                processed_adjustments.append(processed_adj)

            # Get latest adjustment
            latest_adjustment = adjustments.first()
            if latest_adjustment:
                yearly_utilities = Payment.objects.filter(
                    flat=flat,
                    payment_date__year=latest_adjustment.reference_year,
                ).aggregate(
                    total=Coalesce(Sum('utilities_amount'), Value(0, output_field=DecimalField()))
                )['total'] or Decimal('0.00')

            # Get extra charges
            extra_charges = {}
            if active_tenant:
                charges = ExtraCharge.objects.filter(
                    flat=flat,
                    tenant=active_tenant
                ).order_by('-reference_month')
                
                # Group charges by month
                for charge in charges:
                    month_key = charge.reference_month_str
                    if month_key not in extra_charges:
                        extra_charges[month_key] = []
                    extra_charges[month_key].append(ExtraChargeSerializer(charge).data)

            # Construct response data
            data = {
                'flat': {
                    'id': flat.id,
                    'flat_name': flat.flat_name,
                    'address': flat.address,
                    'post_code': flat.post_code,
                    'city': flat.city,
                    'rent_amount': flat.rent_amount,
                    'utilities_amount': flat.utilities_amount,
                    'number_of_rooms': flat.number_of_rooms,
                },
                'communications': CommunicationSerializer(communications, many=True).data,
                'all_adjustments': processed_adjustments,
                'latest_adjustment': {
                    'id': latest_adjustment.id,
                    'reference_year': latest_adjustment.reference_year,
                    'amount': latest_adjustment.amount,
                    'is_paid': latest_adjustment.is_paid,
                    'yearly_utilities_paid': yearly_utilities,
                    'utilities_balance': yearly_utilities - latest_adjustment.amount if yearly_utilities else None,
                    'reference_month': latest_adjustment.reference_month,
                    'lift_amount': latest_adjustment.lift_amount,
                    'heating_amount': latest_adjustment.heating_amount,
                    'other_amount': latest_adjustment.other_amount
                } if latest_adjustment else None,
                'landlord': {
                    'id': flat.landlord.id,
                    'name': flat.landlord.name,
                    'email': flat.landlord.email,
                    'post_code': flat.landlord.post_code,
                    'city': flat.landlord.city,
                    'phone_number': flat.landlord.phone_number,
                    'address': flat.landlord.address,
                } if flat.landlord else None,
                'building_manager': {
                    'id': flat.building_manager.id,
                    'name': flat.building_manager.name,
                    'email': flat.building_manager.email,
                    'phone_number': flat.building_manager.phone_number,
                } if flat.building_manager else None,
                'active_tenant': {
                    'id': active_tenant.id,
                    'name': active_tenant.name,
                    'email': active_tenant.email,
                    'address': active_tenant.address,
                    'post_code': active_tenant.post_code,
                    'city': active_tenant.city,
                    'phone_number': active_tenant.phone_number,
                    'start_date': active_tenant.start_date,
                } if active_tenant else None,
                'extra_charges': extra_charges,  # Add extra charges to the response
            }

            return Response(data)

        except Exception as e:
            return Response(
                {"error": f"Error retrieving flat summary: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], url_path='yearly-utilities/(?P<year>\d+)')
    def yearly_utilities(self, request, pk=None, year=None):
        """Get yearly utilities total with optional tenant filtering"""
        try:
            tenant_id = request.query_params.get('tenant')
            query = Payment.objects.filter(
                flat_id=pk,
                payment_month__year=year
            )
            
            if tenant_id:
                query = query.filter(tenant_id=tenant_id)

            yearly_utilities = query.aggregate(
                total=Coalesce(Sum('utilities_amount'), Value(0, output_field=DecimalField()))
            )['total']

            return Response({
                'yearly_utilities_paid': yearly_utilities,
                'year': year,
                'flat_id': pk,
                'tenant_id': tenant_id
            })
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer

    def create(self, request, *args, **kwargs):
        # Extract parameters from request.data
        tenant = request.data.get('tenant')
        flat = request.data.get('flat')
        amount = request.data.get('amount')
        amount_paid = request.data.get('amount_paid')
        payment_date = request.data.get('payment_date')
        utilities_amount = request.data.get('utilities_amount')
        payment_type = request.data.get('payment_type')
        payment_month = request.data.get('payment_month')

        # Check if payment_month is a valid string in the format YYYY-MM
        if payment_month:
            if re.match(r'^\d{4}-\d{2}$', payment_month):  # Regex to check YYYY-MM format
                year, month = map(int, payment_month.split('-'))
                payment_month_date = date(year, month, 1)  # Create a date object for the first day of the month
            else:
                return Response({"error": "Invalid payment_month format. Use 'YYYY-MM'."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            payment_month_date = request.data.get('payment_month')  # Keep the existing value if not provided

             # Create a dictionary with the updated values
        payment_data = {
            'tenant': tenant,
            'flat': flat,
            'amount': amount,
            'amount_paid':amount_paid,
            'payment_date': payment_date,
            'utilities_amount': utilities_amount,
            'payment_type': payment_type,
            'payment_month': payment_month_date,  # Use the date object
        }

        serializer = self.get_serializer(data=payment_data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        payment = self.get_object()  # This retrieves the payment instance based on the ID in the URL

        # Extract parameters from request.data
        amount = request.data.get('amount', payment.amount)
        payment_date = request.data.get('payment_date', payment.payment_date)
        amount_paid = request.data.get('amount_paid', payment.amount_paid)
        utilities_amount = request.data.get('utilities_amount', payment.utilities_amount)
        payment_type = request.data.get('payment_type', payment.payment_type)
        payment_month = request.data.get('payment_month', payment.payment_month)

        # Check if payment_month is a valid string in the format YYYY-MM
        if payment_month:
            if re.match(r'^\d{4}-\d{2}$', payment_month):  # Regex to check YYYY-MM format
                year, month = map(int, payment_month.split('-'))
                payment_month_date = date(year, month, 1)  # Create a date object for the first day of the month
            else:
                return Response({"error": "Invalid payment_month format. Use 'YYYY-MM'."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            payment_month_date = payment.payment_month  # Keep the existing value if not provided

        # Create a dictionary with the updated values
        payment_data = {
            'amount': amount,
            'amount_paid': amount_paid,
            'payment_date': payment_date,
            'utilities_amount': utilities_amount,
            'payment_type': payment_type,
            'payment_month': payment_month_date,  # Use the date object
        }

        # Validate and update the payment instance
        serializer = self.get_serializer(payment, data=payment_data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        else:
            # Log or return the validation errors
            print("Validation errors:", serializer.errors)  # Log to console
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        payment = self.get_object()  # This retrieves the payment instance based on the ID in the URL
        payment.delete()  # Delete the payment instance
        return Response(status=status.HTTP_204_NO_CONTENT)  # Return a 204 No Content response

class FlatPaymentsView(generics.ListAPIView):
    """
    API endpoint that returns all payments for a given flat_id.
    """
    serializer_class = PaymentSerializer

    def get_queryset(self):
        flat_id = self.kwargs['flat_id']  # Get the flat_id from the URL
        return Payment.objects.filter(flat__id=flat_id)  # Filter payments by flat_id

    def get(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['POST'])
def send_email(request):
    # Extract email data from the request
    to = request.data.get('to')
    communication_type = request.data.get('communication_type')
    subject = request.data.get('subject')
    body = request.data.get('body')
    tenant_id = request.data.get('tenant_id')  # Assuming tenant_id is sent in the request
    monthYear = request.data.get('monthYear')  # Assuming monthYear is sent in the request

    if not to or not subject or not body or not tenant_id or not monthYear:
        return Response({"error": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST)

    # Create the email
    email = EmailMultiAlternatives(subject, body, 'your-email@gmail.com', [to])
    email.attach_alternative(body, "text/html")  # Attach HTML version of the email

    try:
        email.send()  # Send the email

        # Parse monthYear to get the first day of the month
        year, month = map(int, monthYear.split('-'))  # Split the string into year and month
        first_day_of_month = date(year, month, 1)  # Create a date object for the first day

        # Create a new Communication record
        communication = Communication(
            tenant_id=tenant_id,  # Set the tenant using the tenant_id
            communication_type=communication_type,  # Set the communication type
            date_sent=date.today(),  # Set today's date
            notes=body,  # Set the body of the email as notes
            reference_month=first_day_of_month  # Set the reference month to the first day of the month
        )
        communication.save()  # Save the new record to the database

        return Response({"message": "Email sent successfully and communication record created."}, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error sending email: {e}")
        return Response({"error": "Failed to send email."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def tenant_payment_history(request, tenant_id, flat_id):
    try:
        tenant = Tenant.objects.get(id=tenant_id)
        today = datetime.now().date()
        
        start_date = tenant.start_date or today.replace(day=1)
        months = []
        current_date = start_date.replace(day=1)
        
        while current_date <= today:
            month_data = {
                'month_year': current_date.strftime('%Y-%m'),
                'is_paid': False,
                'email_relance_sent': None,
                'payment': None
            }
            
            # Check for payment in this month
            payment = Payment.objects.filter(
                tenant=tenant,
                flat_id=flat_id,
                payment_month__year=current_date.year,
                payment_month__month=current_date.month
            ).first()
            
            # Get extra charges for this month
            extra_charges = ExtraCharge.objects.filter(
                tenant=tenant,
                flat_id=flat_id,
                reference_month__year=current_date.year,
                reference_month__month=current_date.month
            )
            
            # Get utilities adjustment for this month
            adjustment = UtilitiesAdjustment.objects.filter(
                flat_id=flat_id,
                reference_year=current_date.year,
                reference_month__month=current_date.month
            ).first() or 0
            
            # Serialize extra charges
            month_data['extra_charges'] = ExtraChargeSerializer(extra_charges, many=True).data

            # Get extra charges total for the month. 0 if null.
            # extra_charges_total = extra_charges.aggregate(total=Sum('charge_amount'))['total'] or 0
            if payment:
                month_data['is_paid'] = True
                month_data['payment'] = {
                    'id': payment.id,
                    'amount': payment.amount,
                    'amount_paid':payment.amount_paid,
                    'utilities_amount': payment.utilities_amount,
                    # 'amount_due': payment.amount + payment.utilities_amount + extra_charges_total + adjustment - payment.amount_paid,
                    'payment_date': payment.payment_date,
                    'payment_month': payment.payment_month,
                    'payment_month_str': payment.payment_month_str,
                    'payment_type': payment.payment_type,
                    'tenant': payment.tenant.id,
                    'flat': payment.flat.id,
                }

            # Get the communication date if it exists
            communication = Communication.objects.filter(
                tenant=tenant,
                communication_type='missing_payment_notice',
                reference_month__year=current_date.year,
                reference_month__month=current_date.month
            ).first()
            
            month_data['email_relance_sent'] = communication.date_sent if communication else None
            
            months.append(month_data)
            current_date += relativedelta(months=1)
        
        months.sort(key=lambda x: x['month_year'], reverse=True)
        
        return Response(months)
    
    except Tenant.DoesNotExist:
        return Response({'error': 'Tenant not found'}, status=404)

@api_view(['POST'])
def generate_pdf(request):
    try:
        content = request.data.get('content')
        tenant_id = request.data.get('tenant_id')
        month_year = request.data.get('monthYear')
        current_date = datetime.now().strftime("%d/%m/%Y")

        # Create HTML content with proper styling
        html_string = f"""
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    @page {{
                        margin: 10mm;  /* Réduit les marges de la page */
                        size: A4;
                    }}
                    body {{
                        font-family: Arial, sans-serif;
                        margin: 0;
                        line-height: 1.6;
                    }}
                    .header {{
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 50px;
                    }}
                    .sender-info {{
                        text-align: left;
                    }}
                    .date {{
                        text-align: right;
                    }}
                    .content {{
                        margin: 20px 0;
                        text-align: justify;
                        padding: 0 20px;
                    }}
                    .signature {{
                        margin-top: 50px;
                        text-align: right;
                        padding-right: 50px;
                    }}
                </style>
            </head>
            <body>
                <div class="content">
                    {content}
                </div>
                <div class="signature">
                    Marie-Laurence Moulonguet
                </div>
            </body>
        </html>
        """

        # Generate PDF
        html = HTML(string=html_string)
        pdf = html.write_pdf()

        # Create response
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="relance_paiement_{month_year}.pdf"'
        
        return response

    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
def trigger_backup(request):
    try:
        call_command('backup_db')
        Backup.objects.create(operation='backup')
        return Response({'status': 'success'})
    except Exception as e:
        Backup.objects.create(operation='backup', status=str(e))
        return Response({'status': 'error', 'message': str(e)}, status=500)

@api_view(['POST'])
def trigger_restore(request):
    try:
        call_command('restore_db')
        Backup.objects.create(operation='restore')
        return Response({'status': 'success'})
    except Exception as e:
        Backup.objects.create(operation='restore', status=str(e))
        return Response({'status': 'error', 'message': str(e)}, status=500)

@api_view(['GET'])
def get_last_backup(request):
    last_backup = Backup.objects.first()  # Thanks to ordering in Meta
    if last_backup:
        return Response({
            'operation': last_backup.operation,
            'timestamp': last_backup.timestamp,
            'status': last_backup.status
        })
    return Response({})

@api_view(['GET'])
def list_available_backups(request):
    """Get list of available backups."""
    try:
        backups = list_backups()
        return Response(backups)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
def trigger_restore(request):
    """Restore database from a specific backup."""
    file_id = request.data.get('file_id')
    if not file_id:
        return Response({'error': 'file_id is required'}, status=400)
    
    try:
        restore_database(file_id)
        Backup.objects.create(
            operation='restore',
            status='success',
            details=f'Restored from file_id: {file_id}'
        )
        return Response({'status': 'success'})
    except Exception as e:
        Backup.objects.create(
            operation='restore',
            status='error',
            details=str(e)
        )
        return Response({'error': str(e)}, status=500)

class LandlordViewSet(viewsets.ModelViewSet):
    queryset = Landlord.objects.all()
    serializer_class = LandlordSerializer

    def create(self, request, *args, **kwargs):
        """Create a new landlord with validation"""
        try:
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                # Check if landlord with same email already exists
                email = serializer.validated_data.get('email')
                if email and Landlord.objects.filter(email=email).exists():
                    return Response(
                        {"error": "Un propriétaire avec cet email existe déjà"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                self.perform_create(serializer)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"Une erreur est survenue: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request, *args, **kwargs):
        """Update an existing landlord"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(
                instance,
                data=request.data,
                partial=kwargs.pop('partial', False)
            )
            
            if serializer.is_valid():
                # Check if email is being changed and new email already exists
                new_email = serializer.validated_data.get('email')
                if new_email and new_email != instance.email:
                    if Landlord.objects.filter(email=new_email).exists():
                        return Response(
                            {"error": "Un propriétaire avec cet email existe déjà"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                
                self.perform_update(serializer)
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"Une erreur est survenue: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        """Delete a landlord with validation"""
        try:
            landlord = self.get_object()
            # Check if landlord has any associated flats
            if Flat.objects.filter(landlord=landlord).exists():
                return Response(
                    {"error": "Impossible de supprimer ce propriétaire car il possède des appartements"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            landlord.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {"error": f"Une erreur est survenue: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def flats(self, request, pk=None):
        """Get all flats belonging to a landlord"""
        try:
            landlord = self.get_object()
            flats = Flat.objects.filter(landlord=landlord)
            serializer = FlatSerializer(flats, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"error": f"Une erreur est survenue: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search landlords by name, email, or phone"""
        try:
            query = request.query_params.get('q', '')
            if query:
                landlords = Landlord.objects.filter(
                    Q(name__icontains=query) |
                    Q(email__icontains=query) |
                    Q(phone__icontains=query)
                )
                serializer = self.get_serializer(landlords, many=True)
                return Response(serializer.data)
            return Response([])
        except Exception as e:
            return Response(
                {"error": f"Une erreur est survenue: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def list(self, request, *args, **kwargs):
        """Get all landlords with optional filtering"""
        try:
            queryset = self.get_queryset()
            
            # Filter by city if provided
            city = request.query_params.get('city', None)
            if city:
                queryset = queryset.filter(city__icontains=city)
            
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"error": f"Une erreur est survenue: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CommunicationViewSet(viewsets.ModelViewSet):
    queryset = Communication.objects.all()
    serializer_class = CommunicationSerializer

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                self.perform_create(serializer)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"Error creating communication: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def by_tenant(self, request):
        tenant_id = request.query_params.get('tenant_id')
        if not tenant_id:
            return Response({"error": "tenant_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        communications = self.queryset.filter(tenant_id=tenant_id)
        serializer = self.get_serializer(communications, many=True)
        return Response(serializer.data)

class UtilitiesAdjustmentViewSet(viewsets.ModelViewSet):
    queryset = UtilitiesAdjustment.objects.all()
    serializer_class = UtilitiesAdjustmentSerializer

    def list(self, request, *args, **kwargs):
        """Get all utilities adjustments with optional flat filtering"""
        try:
            flat_id = request.query_params.get('flat_id')
            queryset = self.queryset

            if flat_id:
                queryset = queryset.filter(flat_id=flat_id)\
                    .select_related('flat')\
                    .annotate(
                        flat_name=F('flat__flat_name'),
                        tenant_name=F('flat__tenant__name')
                    )\
                    .order_by('-reference_year')

                # Calculate yearly utilities for each adjustment
                data = []
                for adj in queryset:
                    yearly_utilities = Payment.objects.filter(
                        flat_id=flat_id,
                        payment_month__year=adj.reference_year,
                    ).aggregate(
                        total=Coalesce(Sum('utilities_amount'), Value(0, output_field=DecimalField()))
                    )['total']

                data.append({
                    'id': adj.id,
                    'reference_year': adj.reference_year,
                    'payment_date': adj.payment_date,
                    'lift_amount': adj.lift_amount,
                    'heating_amount': adj.heating_amount,
                    'amount': adj.amount,
                    'is_paid': adj.is_paid,
                    'flat_name': adj.flat_name,
                    'tenant_name': adj.tenant_name,
                    'yearly_utilities_paid': yearly_utilities,
                    'utilities_balance': yearly_utilities - adj.amount
                })

                return Response(data)
            
            # If no flat_id, return regular serialized data
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {"error": f"Error retrieving adjustments: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='by-flat/(?P<flat_id>\d+)')
    def flat_adjustments(self, request, flat_id=None):
        """
        Get all utilities adjustments for a specific flat with optional tenant filtering
        """
        try:
            # Get tenant_id from query params and validate it
            tenant_id = request.query_params.get('tenant')
            
            # Base query with flat filter
            query = UtilitiesAdjustment.objects.filter(flat_id=flat_id)\
                .select_related('flat', 'tenant')\
                .annotate(
                    flat_name=F('flat__flat_name'),
                    tenant_name=F('tenant__name')
                )\
                .order_by('-reference_year')

            # Add tenant filter only if a valid tenant_id is provided
            if tenant_id and tenant_id.isdigit():
                query = query.filter(tenant_id=tenant_id)

            # Calculate yearly utilities for each adjustment
            data = []
            for adj in query:
                yearly_utilities = Payment.objects.filter(
                    flat_id=flat_id,
                    payment_month__year=adj.reference_year,
                ).aggregate(
                    total=Coalesce(Sum('utilities_amount'), Value(0, output_field=DecimalField()))
                )['total']

                data.append({
                    'id': adj.id,
                    'tenant_id': adj.tenant_id,
                    'tenant_name': adj.tenant_name,
                    'reference_month': adj.reference_month,
                    'reference_year': adj.reference_year,
                    'payment_date': adj.payment_date,
                    'lift_amount': adj.lift_amount,
                    'heating_amount': adj.heating_amount,
                    'other_amount': adj.other_amount,
                    'amount': adj.amount,
                    'is_paid': adj.is_paid,
                    'flat_name': adj.flat_name,
                    'yearly_utilities_paid': yearly_utilities,
                    'utilities_balance': yearly_utilities - adj.amount
                })

            return Response(data)

        except Exception as e:
            return Response(
                {"error": f"Error retrieving adjustments: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                # Check if adjustment already exists for this flat and year
                flat_id = serializer.validated_data['flat'].id
                year = serializer.validated_data['reference_year']
                tenant_id = serializer.validated_data.get('tenant').id if serializer.validated_data.get('tenant') else None

                existing = UtilitiesAdjustment.objects.filter(
                    flat_id=flat_id,
                    reference_year=year,
                    tenant_id=tenant_id
                ).first()

                if existing:
                    return Response(
                        {"error": f"Une régularisation existe déjà pour cet appartement et ce locataire en {year}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                self.perform_create(serializer)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(
                {"error": "Données invalides, assurez vous qu'il n'existe pas de régularisation pour cette année", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"Erreur lors de la création: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def by_flat(self, request):
        """Get all adjustments for a specific flat"""
        flat_id = request.query_params.get('flat_id')
        if not flat_id:
            return Response(
                {"error": "flat_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        adjustments = self.queryset.filter(flat_id=flat_id)
        serializer = self.get_serializer(adjustments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_year(self, request):
        """Get all adjustments for a specific year"""
        year = request.query_params.get('year')
        if not year:
            return Response(
                {"error": "year parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        adjustments = self.queryset.filter(reference_year=year)
        serializer = self.get_serializer(adjustments, many=True)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(
                instance,
                data=request.data,
                partial=kwargs.pop('partial', False)
            )
            
            if serializer.is_valid():
                self.perform_update(serializer)
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"Erreur lors de la mise à jour: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        """Delete a utilities adjustment"""
        try:
            adjustment = self.get_object()
            adjustment.delete()
            return Response(
                {"message": "Adjustment deleted successfully"},
                status=status.HTTP_204_NO_CONTENT
            )
        except Exception as e:
            return Response(
                {"error": f"Error deleting adjustment: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['GET'])
def get_communications_by_month(request, tenant_id, month_year):
    try:
        communications = Communication.objects.filter(
            tenant_id=tenant_id,
            reference_month_str=month_year
        )
        serializer = CommunicationSerializer(communications, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class LandlordExpenseViewSet(viewsets.ModelViewSet):
    queryset = LandlordExpense.objects.all()
    serializer_class = LandlordExpenseSerializer

    def _parse_reference_month(self, reference_month):
        """Helper method to parse and validate reference_month"""
        if not reference_month:
            return None, None
            
        # If reference_month is already a date object, extract year and month
        if isinstance(reference_month, date):
            return reference_month.year, reference_month.month

        # Handle string format
        if isinstance(reference_month, str):
            # Check if the format matches YYYY-MM-DD
            if not re.match(r'^\d{4}-\d{2}-\d{2}$', reference_month):
                raise ValueError("Invalid reference_month format. Use YYYY-MM-DD format.")
                
            try:
                year = int(reference_month[:4])
                month = int(reference_month[5:7])
                # Validate month range
                if month < 1 or month > 12:
                    raise ValueError("Month must be between 1 and 12")
                return year, month
            except ValueError as e:
                if "too many values to unpack" in str(e):
                    raise ValueError("Invalid reference_month format. Use YYYY-MM-DD format.")
                raise

        raise ValueError("Invalid reference_month type. Expected string in YYYY-MM-DD format or date object.")

    def create(self, request, *args, **kwargs):
        try:
            data = request.data.copy()  # Create a mutable copy of the data

            # Handle reference_month conversion
            if 'reference_month' in data:
                try:
                    year, month = self._parse_reference_month(data['reference_month'])
                    if year and month:
                        data['reference_month'] = date(year, month, 1)
                        data['reference_year'] = year
                except ValueError as e:
                    return Response(
                        {"error": str(e)},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            serializer = self.get_serializer(data=data)
            if serializer.is_valid():
                self.perform_create(serializer)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(
                {"error": "Validation failed", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"Error creating expense: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request, *args, **kwargs):
        try:
            data = request.data.copy()  # Create a mutable copy of the data

            # Handle reference_month conversion
            if 'reference_month' in data:
                try:
                    year, month = self._parse_reference_month(data['reference_month'])
                    if year and month:
                        data['reference_month'] = date(year, month, 1)
                        data['reference_year'] = year
                except ValueError as e:
                    return Response(
                        {"error": str(e)},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            instance = self.get_object()
            serializer = self.get_serializer(instance, data=data, partial=kwargs.pop('partial', False))
            
            if serializer.is_valid():
                self.perform_update(serializer)
                return Response(serializer.data)
            return Response(
                {"error": "Validation failed", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"Error updating expense: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='by-flat/(?P<flat_id>\d+)')
    def by_flat(self, request, flat_id=None):
        """Get all expenses for a specific flat"""
        try:
            expenses = self.queryset.filter(flat_id=flat_id).order_by('-reference_month', '-payment_date')
            serializer = self.get_serializer(expenses, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"error": f"Error retrieving expenses: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='export-pdf/(?P<flat_id>\d+)/(?P<year>\d+)')
    def export_pdf(self, request, flat_id=None, year=None):
        try:
            flat = Flat.objects.get(id=flat_id)
            expenses = self.queryset.filter(
                flat_id=flat_id,
                reference_year=year
            ).order_by('-reference_month', '-payment_date')

            # Calculate totals by type
            totals_by_type = {}
            total_amount = 0
            EXPENSE_TYPES = [
                { 'value': 'property_tax', 'label': 'Taxe Foncière' },
                { 'value': 'works', 'label': 'Travaux' },
                { 'value': 'plumbing', 'label': 'Plomberie' },
                { 'value': 'condo_fees', 'label': 'Charges de Copropriété' },
                { 'value': 'insurance', 'label': 'Assurance' },
                { 'value': 'other', 'label': 'Autres' }
            ]

            for expense in expenses:
                expense_type = next((t['label'] for t in EXPENSE_TYPES if t['value'] == expense.expense_type), expense.expense_type)
                totals_by_type[expense_type] = totals_by_type.get(expense_type, 0) + expense.amount
                total_amount += expense.amount

            # Prepare template context
            context = {
                'flat': flat,
                'year': year,
                'expenses': expenses,
                'totals_by_type': totals_by_type,
                'total_amount': total_amount,
                'EXPENSE_TYPES': EXPENSE_TYPES,
            }

            # Render template
            template = get_template('landlord_expenses_report.html')
            html_string = template.render(context)

            # Generate PDF
            pdf = HTML(string=html_string, base_url=request.build_absolute_uri('/')).write_pdf()

            # Create response
            response = HttpResponse(pdf, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="depenses_{flat.flat_name}_{year}.pdf"'
            
            return response

        except Exception as e:
            print(f"PDF Generation Error: {str(e)}")  # Add this for debugging
            return Response(
                {"error": f"Error generating PDF: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ExtraChargeViewSet(viewsets.ModelViewSet):
    queryset = ExtraCharge.objects.all()
    serializer_class = ExtraChargeSerializer

    def _parse_reference_month(self, month_str):
        """Convert YYYY-MM to YYYY-MM-DD date object"""
        try:
            year, month = map(int, month_str.split('-'))
            return date(year, month, 1)
        except (ValueError, TypeError):
            raise ValueError("Invalid reference_month format. Use YYYY-MM")

    def create(self, request, *args, **kwargs):
        try:
            data = request.data.copy()
            
            # Convert charge_amount to Decimal
            if 'charge_amount' in data:
                data['charge_amount'] = Decimal(str(data['charge_amount']))

            # Parse reference_month from YYYY-MM to date
            if 'reference_month' in data:
                data['reference_month'] = data['reference_month']

            serializer = self.get_serializer(data=data)
            if serializer.is_valid():
                self.perform_create(serializer)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            
            print("Serializer errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print("Error creating extra charge:", str(e))
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def get_queryset(self):
        queryset = ExtraCharge.objects.all()
        flat_id = self.request.query_params.get('flat', None)
        tenant_id = self.request.query_params.get('tenant', None)
        month_year = self.request.query_params.get('month_year', None)

        if flat_id:
            queryset = queryset.filter(flat_id=flat_id)
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
        if month_year:
            try:
                date = datetime.strptime(month_year, '%Y-%m')
                queryset = queryset.filter(reference_month__year=date.year,
                                        reference_month__month=date.month)
            except ValueError:
                pass

        return queryset

def generate_bordereau(request, flat_id, year):
    flat = get_object_or_404(Flat, id=flat_id)
    
    # Get expenses for the specified year, ordered by type and date
    expenses = LandlordExpense.objects.filter(
        flat=flat,
        reference_year=year
    ).order_by('expense_type', 'payment_date')
    
    # Calculate total amount
    total_amount = sum(expense.amount for expense in expenses)
    
    # Render the template
    template = get_template('mls/bordereau.html')
    html_string = template.render({
        'flat': flat,
        'year': year,
        'expenses': expenses,
        'total_amount': total_amount,
    })
    
    # Generate PDF
    html = HTML(string=html_string)
    
    # Create response with PDF
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="bordereau_{flat.id}_{year}.pdf"'
    
    html.write_pdf(response)
    return response
