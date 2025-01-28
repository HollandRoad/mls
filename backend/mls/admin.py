from django.contrib import admin
from .models import BuildingManager, Tenant, Flat, Payment, Communication, Landlord, UtilitiesAdjustment, ExtraCharge

class TenantAdmin(admin.ModelAdmin):
    list_display = ('name', 'flat', 'has_rent_receipt_sent', 'has_annual_receipt_sent')

    def has_rent_receipt_sent(self, obj):
        # Check if any rent receipt communication exists for the tenant
        return obj.communications.filter(communication_type='rent_receipt').exists()
    has_rent_receipt_sent.short_description = 'Rent Receipt Sent'

    def has_annual_receipt_sent(self, obj):
        # Check if any annual receipt communication exists for the tenant
        return obj.communications.filter(communication_type='annual_receipt').exists()
    has_annual_receipt_sent.short_description = 'Annual Receipt Sent'

admin.site.register(BuildingManager)
admin.site.register(Tenant, TenantAdmin)
admin.site.register(Flat)
admin.site.register(Payment)
admin.site.register(Communication)
admin.site.register(Landlord)  # Register the Landlord model
admin.site.register(UtilitiesAdjustment)
admin.site.register(ExtraCharge)
