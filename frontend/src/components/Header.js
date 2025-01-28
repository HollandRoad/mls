// src/components/Header.js
import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import { API_URL } from '../services/api';

const Header = () => {
    const [lastBackup, setLastBackup] = useState(null);

    const fetchLastBackup = async () => {
        try {
            const response = await fetch(`${API_URL}last-backup/`);
            const data = await response.json();
            if (data.timestamp) {
                setLastBackup(data);
            }
        } catch (error) {
            console.error('Error fetching last backup:', error);
        }
    };

    useEffect(() => {
        fetchLastBackup();
        
        // Listen for backup updates
        window.addEventListener('backup-updated', fetchLastBackup);
        
        // Refresh every minute
        const interval = setInterval(fetchLastBackup, 60000);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('backup-updated', fetchLastBackup);
        };
    }, []);

    return (
        <AppBar position="fixed" style={{ zIndex: 1201 }}>
            <Toolbar>
                <Typography variant="h6" style={{ flexGrow: 1, color: 'white' }}>
                    Les apparts de Marie-Laurence
                </Typography>
                {lastBackup && (
                    <Box sx={{ mr: 2, color: 'white' }}>
                        <Typography variant="body2">
                            Last {lastBackup.operation}: {new Date(lastBackup.timestamp).toLocaleString()}
                            {lastBackup.status !== 'success' && ` (${lastBackup.status})`}
                        </Typography>
                    </Box>
                )}
                <Button color="inherit" component={Link} to="/" startIcon={<HomeIcon />} />
            </Toolbar>
        </AppBar>
    );
};

export default Header;
