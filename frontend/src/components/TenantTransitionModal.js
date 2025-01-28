import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { endTenancy, assignFlat } from '../services/api';

const TenantTransitionModal = ({ 
    open, 
    onClose, 
    flat, 
    tenant,
    tenant_id, 
    availableTenants,
    onTransitionComplete 
}) => {
    const [action, setAction] = useState('end');
    const [date, setDate] = useState('');
    const [selectedTenant, setSelectedTenant] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (action === 'end' && flat?.id) {
                await endTenancy(tenant_id, date);
            } else if (action === 'assign' && selectedTenant) {
                await assignFlat(selectedTenant, flat.id, date);
            }
            
            onClose();
            navigate('/');
        } catch (error) {
            console.error('Transition error:', error);
            setError('Une erreur est survenue lors de la transition');
        }
    };

    const handleClose = () => {
        setAction('end');
        setDate('');
        setSelectedTenant('');
        setError('');
        onClose();
    };

    return (
        <Modal open={open} onClose={handleClose}>
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
                    {action === 'end' ? 'Fin de bail' : 'Assigner un nouveau locataire'}
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Action</InputLabel>
                        <Select
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            label="Action"
                        >
                            {flat?.tenant && (
                                <MenuItem value="end">Fin de bail</MenuItem>
                            )}
                            <MenuItem value="assign">Nouveau locataire</MenuItem>
                        </Select>
                    </FormControl>

                    {action === 'assign' && (
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Nouveau locataire</InputLabel>
                            <Select
                                value={selectedTenant}
                                onChange={(e) => setSelectedTenant(e.target.value)}
                                label="Nouveau locataire"
                                required
                            >
                                {availableTenants.map((tenant) => (
                                    <MenuItem key={tenant.id} value={tenant.id}>
                                        {tenant.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    <TextField
                        label={action === 'end' ? "Date de fin" : "Date d'entrée"}
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        fullWidth
                        required
                        InputLabelProps={{
                            shrink: true,
                        }}
                        sx={{ mb: 2 }}
                    />

                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <Button onClick={handleClose}>
                            Annuler
                        </Button>
                        <Button 
                            type="submit" 
                            variant="contained"
                            disabled={!date || (action === 'assign' && !selectedTenant)}
                        >
                            Confirmer
                        </Button>
                    </Box>
                </form>
            </Box>
        </Modal>
    );
};

export default TenantTransitionModal;
