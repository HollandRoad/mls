from django.core.management.base import BaseCommand
from backend.backup_db import backup_database

class Command(BaseCommand):
    help = 'Backup database to Google Drive'

    def handle(self, *args, **kwargs):
        backup_database()
