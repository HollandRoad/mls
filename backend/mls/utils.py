from django.utils import timezone
from mls.models import Payment

def count_missing_payments(tenant):
    current_date = timezone.now()
    current_month = current_date.month
    current_year = current_date.year

    # Get the start date for the tenant
    start_date = tenant.start_date
    if not start_date:
        return 0  # No start date means no missed payments

    start_month = start_date.month
    start_year = start_date.year

    # Initialize a counter for missed payments
    missed_payments_count = 0

    # Iterate through each month from start_date to current date
    for year in range(start_year, current_year + 1):
        for month in range(1, 13):
            if year == start_year and month < start_month:
                continue  # Skip months before the start date
            if year == current_year and month > current_month:
                break  # Stop if we exceed the current month

            # Check if the payment was made for this month
            payment_exists = Payment.objects.filter(
                tenant=tenant,
                payment_month__year=year,
                payment_month__month=month
            ).exists()

            if not payment_exists:
                missed_payments_count += 1  # Increment if no payment exists

    return missed_payments_count