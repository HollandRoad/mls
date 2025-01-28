from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
import os
import datetime
from django.conf import settings

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/drive.file']
client_secrets_file = settings.GOOGLE_CREDENTIALS_PATH
db_path = settings.DB_PATH
backup_folder = settings.GOOGLE_DRIVE_BACKUP_FOLDER  # Use the setting here

def get_google_drive_service():
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first time.
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                client_secrets_file, SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    return build('drive', 'v3', credentials=creds)

def get_or_create_backup_folder(service):
    """Get the backup folder ID, create it if it doesn't exist."""
    # First, try to find the existing folder
    results = service.files().list(
        q=f"name='{backup_folder}' and mimeType='application/vnd.google-apps.folder'",
        spaces='drive',
        fields='files(id, name)'
    ).execute()
    folders = results.get('files', [])

    if folders:
        return folders[0]['id']
    
    # If folder doesn't exist, create it
    file_metadata = {
        'name': backup_folder,
        'mimeType': 'application/vnd.google-apps.folder'
    }
    
    try:
        file = service.files().create(
            body=file_metadata,
            fields='id'
        ).execute()
        print(f"Created '{backup_folder}' folder in Google Drive")
        return file.get('id')
    except Exception as e:
        print(f"Error creating folder: {e}")
        return None

def backup_database():
    # Create Google Drive API service
    service = get_google_drive_service()

    # Get or create the backup folder
    folder_id = get_or_create_backup_folder(service)
    
    if not folder_id:
        print(f"Error: Could not find or create '{backup_folder}' folder")
        return None

    # Current timestamp for the backup file name
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_name = f'db_backup_{timestamp}.sqlite3'
    
    # File metadata with folder ID
    file_metadata = {
        'name': backup_name,
        'parents': [folder_id],
        'mimeType': 'application/x-sqlite3'
    }
    
    # Upload file
    media = MediaFileUpload(
        db_path,
        mimetype='application/x-sqlite3',
        resumable=True
    )
    
    try:
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id'
        ).execute()
        print(f'Backup successful! File ID: {file.get("id")}')
        return file.get('id')
    except Exception as e:
        print(f'An error occurred: {e}')
        return None

def list_backups():
    """List all available backups from Google Drive."""
    service = get_google_drive_service()
    
    try:
        # Get or create the backup folder
        folder_id = get_or_create_backup_folder(service)
        
        if not folder_id:
            print(f"Error: Could not find or create '{backup_folder}' folder")
            return []

        # Search for database backup files in the specific folder
        results = service.files().list(
            q=f"'{folder_id}' in parents and name contains 'db_backup_'",
            pageSize=10,
            fields="files(id, name, createdTime)"
        ).execute()
        
        backups = results.get('files', [])
        return [
            {
                'id': backup['id'],
                'name': backup['name'],
                'created': backup['createdTime']
            }
            for backup in backups
        ]
    except Exception as e:
        print(f'An error occurred: {e}')
        return []

if __name__ == '__main__':
    backup_database()
