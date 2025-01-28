import React from 'react';
import { 
    Dialog, 
    DialogTitle, 
    DialogContent,
    DialogContentText, 
    CircularProgress,
    Box 
} from '@mui/material';

const BackupProgressDialog = ({ open }) => (
    <Dialog 
        open={open}
        maxWidth="xs"
        fullWidth
        PaperProps={{
            sx: { 
                borderRadius: 2,
                p: 1
            }
        }}
    >
        <DialogTitle sx={{ textAlign: 'center' }}>
            Sauvegarde en cours
        </DialogTitle>
        <DialogContent>
            <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                py: 3
            }}>
                <CircularProgress size={50} sx={{ mb: 3 }} />
                <DialogContentText>
                    Veuillez patienter pendant la sauvegarde de la base de données...
                </DialogContentText>
            </Box>
        </DialogContent>
    </Dialog>
);

export default BackupProgressDialog;
