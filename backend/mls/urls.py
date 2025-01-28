from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TenantViewSet, PaymentViewSet, FlatPaymentsView, send_email, tenant_payment_history, generate_pdf, trigger_backup, trigger_restore, get_last_backup, list_available_backups, FlatViewSet, LandlordViewSet, BuildingManagerViewSet, CommunicationViewSet, UtilitiesAdjustmentViewSet, get_communications_by_month, LandlordExpenseViewSet, ExtraChargeViewSet, generate_bordereau

router = DefaultRouter()
router.register(r'tenants', TenantViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'flats', FlatViewSet)
router.register(r'landlords', LandlordViewSet)
router.register(r'managers', BuildingManagerViewSet)
router.register(r'communications', CommunicationViewSet)
router.register(r'utilities-adjustments', UtilitiesAdjustmentViewSet)
router.register(r'landlord-expenses', LandlordExpenseViewSet)
router.register(r'extra-charges', ExtraChargeViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('flats/<int:flat_id>/payments/', FlatPaymentsView.as_view(), name='flat-payments'),
    path('send-email/', send_email, name='send_email'),
    path('tenant-payment-history/<int:tenant_id>/<int:flat_id>/', tenant_payment_history, name='tenant-payment-history'),
    path('generate-pdf/', generate_pdf, name='generate-pdf'),
    path('backup/', trigger_backup, name='trigger-backup'),
    path('restore/', trigger_restore, name='trigger-restore'),
    path('last-backup/', get_last_backup, name='last-backup'),
    path('available-backups/', list_available_backups, name='available-backups'),
    path('communications/by-month/<int:tenant_id>/<str:month_year>/', get_communications_by_month, name='communications-by-month'),
    path('flat/<int:flat_id>/bordereau/<int:year>/', generate_bordereau, name='generate_bordereau'),
]

