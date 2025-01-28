import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
    CircularProgress,
    Box
} from '@mui/material';
import { API_URL } from '../services/api';

const RestoreBackupModal = ({ open, onClose }) => {
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open) {
            fetchBackups();
        }
    }, [open]);

    const fetchBackups = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}available-backups/`);
            if (!response.ok) throw new Error('Failed to fetch backups');
            const data = await response.json();
            setBackups(data);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (fileId) => {
        if (window.confirm('Are you sure you want to restore this backup? Current data will be overwritten.')) {
            try {
                const response = await fetch(`${API_URL}restore/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ file_id: fileId }),
                });
                
                if (!response.ok) throw new Error('Restore failed');
                
                alert('Database restored successfully. The application will now refresh.');
                onClose();
                window.dispatchEvent(new Event('backup-updated'));
                window.location.reload();
            } catch (error) {
                alert('Error restoring backup: ' + error.message);
            }
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Select Backup to Restore</DialogTitle>
            <DialogContent>
                {loading ? (
                    <Box display="flex" justifyContent="center" p={2}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Box p={2} color="error.main">
                        Error: {error}
                    </Box>
                ) : (
                    <List sx={{ 
                        maxHeight: '400px', 
                        overflow: 'auto',
                        '&::-webkit-scrollbar': {
                            width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                            background: '#f1f1f1',
                            borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            background: '#888',
                            borderRadius: '4px',
                            '&:hover': {
                                background: '#555',
                            },
                        },
                    }}>
                        {backups.map((backup) => (
                            <ListItem
                                key={backup.id}
                                button
                                onClick={() => handleRestore(backup.id)}
                                sx={{
                                    '&:hover': {
                                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                    },
                                    borderBottom: '1px solid #eee'
                                }}
                            >
                                <ListItemText
                                    primary={backup.name}
                                    secondary={new Date(backup.created).toLocaleString()}
                                    primaryTypographyProps={{
                                        fontWeight: 'medium'
                                    }}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RestoreBackupModal;
