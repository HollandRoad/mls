from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io
import os
from django.conf import settings

SCOPES = ['https://www.googleapis.com/auth/drive.file']
client_secrets_file = settings.GOOGLE_CREDENTIALS_PATH
db_path = settings.DB_PATH
backup_folder = settings.GOOGLE_DRIVE_BACKUP_FOLDER

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

def list_available_backups():
    """List all available backups from the mls_backup folder."""
    service = get_google_drive_service()
    
    try:
        # Find the backup folder using setting
        results = service.files().list(
            q=f"name='{backup_folder}' and mimeType='application/vnd.google-apps.folder'",
            spaces='drive',
            fields='files(id, name)'
        ).execute()
        folders = results.get('files', [])

        if not folders:
            print(f"Error: '{backup_folder}' folder not found in Google Drive")
            return []

        folder_id = folders[0]['id']

        # List all backup files in the folder
        results = service.files().list(
            q=f"'{folder_id}' in parents and name contains 'db_backup_'",
            pageSize=10,
            fields="files(id, name, createdTime)"
        ).execute()
        
        backups = results.get('files', [])
        
        # Sort backups by creation time (newest first)
        backups.sort(key=lambda x: x['createdTime'], reverse=True)
        
        return backups
    except Exception as e:
        print(f'An error occurred while listing backups: {e}')
        return []

def restore_database(file_id):
    """Restore the database from a specific backup file."""
    service = get_google_drive_service()
    
    try:
        # Verify the file is in the backup folder
        file = service.files().get(
            fileId=file_id,
            fields='parents'
        ).execute()
        
        # Find the backup folder using setting
        results = service.files().list(
            q=f"name='{backup_folder}' and mimeType='application/vnd.google-apps.folder'",
            spaces='drive',
            fields='files(id)'
        ).execute()
        folders = results.get('files', [])

        if not folders or folders[0]['id'] not in file.get('parents', []):
            print(f"Error: Selected file is not in the {backup_folder} folder")
            return False

        # Get the file from Drive
        request = service.files().get_media(fileId=file_id)
        file = io.BytesIO()
        downloader = MediaIoBaseDownload(file, request)
        done = False
        
        while done is False:
            status, done = downloader.next_chunk()
            print(f'Download {int(status.progress() * 100)}%')
        
        # Save the file
        file.seek(0)
        with open(db_path, 'wb') as f:
            f.write(file.read())
            
        print('Database restored successfully!')
        return True
        
    except Exception as e:
        print(f'An error occurred during restore: {e}')
        return False

if __name__ == '__main__':
    # List available backups
    print("Available backups:")
    backups = list_available_backups()
    
    if not backups:
        print(f"No backups found in the {backup_folder} folder")
        exit(1)
    
    # Print available backups
    for i, backup in enumerate(backups):
        print(f"{i+1}. {backup['name']} (Created: {backup['createdTime']})")
    
    # Ask user to select a backup
    while True:
        try:
            choice = int(input("\nSelect a backup to restore (number): ")) - 1
            if 0 <= choice < len(backups):
                break
            print("Invalid selection. Please try again.")
        except ValueError:
            print("Please enter a number.")
    
    # Restore selected backup
    selected_backup = backups[choice]
    print(f"\nRestoring backup: {selected_backup['name']}")
    restore_database(selected_backup['id'])
