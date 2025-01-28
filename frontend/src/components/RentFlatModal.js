import React, { useState, useEffect } from 'react';
import {
    Modal,
    Box,
    Typography,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert
} from '@mui/material';
import { getAvailableTenants, assignFlat } from '../services/api';

const RentFlatModal = ({ open, onClose, flat, onSuccess }) => {
    const [availableTenants, setAvailableTenants] = useState([]);
    const [selectedTenant, setSelectedTenant] = useState('');
    const [startDate, setStartDate] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const loadTenants = async () => {
            try {
                const tenants = await getAvailableTenants();
                setAvailableTenants(tenants);
            } catch (error) {
                console.error('Error loading available tenants:', error);
                setError('Erreur lors du chargement des locataires disponibles');
            }
        };
        loadTenants();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        try {
            await assignFlat(selectedTenant, flat.id, startDate);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error assigning tenant:', error);
            setError('Erreur lors de l\'attribution du locataire');
        }
    };

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 400,
                bgcolor: 'background.paper',
                boxShadow: 24,
                p: 4,
                borderRadius: 2
            }}>
                <Typography variant="h6" gutterBottom>
                    Louer {flat.flat_name}
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Locataire</InputLabel>
                        <Select
                            value={selectedTenant}
                            onChange={(e) => setSelectedTenant(e.target.value)}
                            label="Locataire"
                            required
                        >
                            {availableTenants.map((tenant) => (
                                <MenuItem key={tenant.id} value={tenant.id}>
                                    {tenant.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        label="Date d'entrée"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        fullWidth
                        required
                        InputLabelProps={{
                            shrink: true,
                        }}
                        sx={{ mb: 2 }}
                    />

                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <Button onClick={onClose}>
                            Annuler
                        </Button>
                        <Button 
                            type="submit" 
                            variant="contained"
                            disabled={!selectedTenant || !startDate}
                        >
                            Confirmer
                        </Button>
                    </Box>
                </form>
            </Box>
        </Modal>
    );
};

export default RentFlatModal;
