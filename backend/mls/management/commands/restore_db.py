from django.core.management.base import BaseCommand
from backend.restore_db import restore_database

class Command(BaseCommand):
    help = 'Restore database from Google Drive backup'

    def handle(self, *args, **kwargs):
        restore_database()
