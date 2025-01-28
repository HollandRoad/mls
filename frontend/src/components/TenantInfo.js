import React, { useState } from 'react';
import { Typography, IconButton, Box } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import TenantEditForm from './TenantEditForm';

const TenantInfo = ({ flatDetails }) => {
    const [isEditFormOpen, setIsEditFormOpen] = useState(false);

    const handleEditClick = () => {
        setIsEditFormOpen(true);
    };

    return (
        <Box>
            <Box display="flex" alignItems="center" gap={1}>

                <IconButton 
                    onClick={handleEditClick}
                    size="small"
                    color="primary"
                >
                    <EditIcon />
                </IconButton>
            </Box>
            
            <Typography variant="h6">Adresse: {flatDetails.flat.address}</Typography>
            <Typography variant="h6">Loyer: {flatDetails.flat.rent_amount} €</Typography>
            <Typography variant="h6">Montant des charges: {flatDetails.flat.utilities_amount} €</Typography>

            <TenantEditForm
                open={isEditFormOpen}
                onClose={() => setIsEditFormOpen(false)}
                tenant={flatDetails}
                onSave={() => {
                    // Refresh the data if needed
                    setIsEditFormOpen(false);
                    window.location.reload(); // Consider using a more elegant way to refresh data
                }}
            />
        </Box>
    );
};

export default TenantInfo;
