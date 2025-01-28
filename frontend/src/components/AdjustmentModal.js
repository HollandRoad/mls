import React, { useState, useEffect } from 'react';
import {
    Modal,
    Box,
    Typography,
    TextField,
    Button,
    FormControlLabel,
    Checkbox,
    InputAdornment,
    Alert
} from '@mui/material';
import { createAdjustment, updateAdjustment, getYearlyUtilities, deleteAdjustment } from '../services/api';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRefresh } from '../context/RefreshContext';


const AdjustmentModal = ({ open, onClose, flat, selectedAdjustment, onSave }) => {
    const [formData, setFormData] = useState({
        reference_year: new Date().getFullYear(),
        payment_date: null,
        lift_amount: '0.00',
        heating_amount: '0.00',
        other_amount: '0.00',
        is_paid: false,
        tenant: null
    });
    const [error, setError] = useState(null);
    const { triggerRefreshAdjustment } = useRefresh();


    useEffect(() => {
        if (open) {
            const year = selectedAdjustment ? selectedAdjustment.reference_year : new Date().getFullYear();
            console.log('selectedAdjustment',selectedAdjustment)
            const getUtilities = async () => {
                try {
                    const data = await getYearlyUtilities(flat?.flat?.id, year, flat?.active_tenant?.id);
                    
                    if (selectedAdjustment) {
                        setFormData({
                            reference_year: selectedAdjustment.reference_year,
                            payment_date: selectedAdjustment.payment_date || '',
                            lift_amount: selectedAdjustment.lift_amount,
                            heating_amount: selectedAdjustment.heating_amount,
                            other_amount: selectedAdjustment.other_amount || '0.00',
                            is_paid: selectedAdjustment.is_paid,
                            yearly_utilities_paid: data.yearly_utilities_paid || '0.00',
                            tenant: flat?.active_tenant?.id || null
                        });
                    } else {
                        setFormData({
                            reference_year: year,
                            payment_date: null,
                            lift_amount: '0.00',
                            heating_amount: '0.00',
                            other_amount: '0.00',
                            is_paid: false,
                            yearly_utilities_paid: data.yearly_utilities_paid || '0.00',
                            tenant: flat?.active_tenant?.id || null
                        });
                    }
                } catch (error) {
                    console.error('Error fetching yearly utilities:', error);
                    const defaultFormData = {
                        reference_year: year,
                        payment_date: selectedAdjustment?.payment_date || null,
                        lift_amount: selectedAdjustment?.lift_amount || '0.00',
                        heating_amount: selectedAdjustment?.heating_amount || '0.00',
                        other_amount: '0.00',
                        is_paid: selectedAdjustment?.is_paid || false,
                        yearly_utilities_paid: '0.00',
                        tenant: null
                    };
                    setFormData(defaultFormData);
                }
            };
            
            getUtilities();
        }
    }, [selectedAdjustment, flat, open]);

    const handleChange = async (field, value) => {
        
        if (field === 'reference_year') {
            try {
                
                const data = await getYearlyUtilities(flat?.flat?.id, value, flat?.active_tenant?.id);
                setFormData(prev => ({
                    ...prev,
                    [field]: value,
                    yearly_utilities_paid: data.yearly_utilities_paid || '0.00'
                }));
            } catch (error) {
                console.error('Error fetching yearly utilities:', error);
                setFormData(prev => ({
                    ...prev,
                    [field]: value,
                    yearly_utilities_paid: '0.00'
                }));
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        
        try {
            const adjustmentData = {
                ...formData,
                flat: flat.flat.id,
                payment_date: formData.payment_date || null,
                lift_amount: formData.lift_amount || '0.00',
                heating_amount: formData.heating_amount || '0.00',
                other_amount: formData.other_amount || '0.00',
                tenant: flat?.active_tenant?.id || null
            };

            console.log('Sending adjustment data:', adjustmentData);

            if (selectedAdjustment) {
                await updateAdjustment(selectedAdjustment.id, adjustmentData);
            } else {
                await createAdjustment(adjustmentData);
            }
            
            triggerRefreshAdjustment();
            await onSave(formData);
            onClose();
        } catch (err) {
            console.log('Error response:', err.response?.data);
            const errorMessage = err.response?.data?.error || 'Une erreur est survenue';
            setError(errorMessage);
        }
    };

    const calculateTotal = () => {
        const lift = Number(formData.lift_amount) || 0;
        const heating = Number(formData.heating_amount) || 0;
        const other = Number(formData.other_amount) || 0;
        return (lift + heating + other).toFixed(2);
    };

    const calculateBalanceTotal = () => {
        const utilities_paid = Number(formData.yearly_utilities_paid) || 0;
        const utilities_real = Number(calculateTotal()) || 0;
        return (utilities_paid - utilities_real).toFixed(2);
    };

    const handleDelete = async () => {
        try {
            await deleteAdjustment(selectedAdjustment.id);
            triggerRefreshAdjustment();
            await onSave();
            onClose();
        } catch (error) {
            console.error('Error deleting adjustment:', error);
            setError('Failed to delete adjustment');
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
                    {selectedAdjustment ? 'Modifier' : 'Ajouter'} une régularisation
                </Typography>

                {error && (
                    <Alert 
                        severity="error" 
                        sx={{ mb: 2 }}
                        onClose={() => setError(null)}
                    >
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <TextField
                        label="Année de référence"
                        type="number"
                        value={formData.reference_year}
                        onChange={(e) => handleChange('reference_year', e.target.value)}
                        fullWidth
                        margin="normal"
                        required
                    />

                    <TextField
                        label="Montant ascenseur"
                        type="number"
                        value={formData.lift_amount}
                        onChange={(e) => handleChange('lift_amount', e.target.value)}
                        fullWidth
                        margin="normal"
                        required
                        InputProps={{
                            startAdornment: <InputAdornment position="start">€</InputAdornment>,
                        }}
                    />

                    <TextField
                        label="Montant chauffage"
                        type="number"
                        value={formData.heating_amount}
                        onChange={(e) => handleChange('heating_amount', e.target.value)}
                        fullWidth
                        margin="normal"
                        required
                        InputProps={{
                            startAdornment: <InputAdornment position="start">€</InputAdornment>,
                        }}
                    />

                    <TextField
                        label="Montant autres charges"
                        type="number"
                        value={formData.other_amount}
                        onChange={(e) => handleChange('other_amount', e.target.value)}
                        fullWidth
                        margin="normal"
                        required
                        InputProps={{
                            startAdornment: <InputAdornment position="start">€</InputAdornment>,
                        }}
                    />

                    <TextField
                        label="Charges payées sur l'année"
                        type="number"
                        value={formData.yearly_utilities_paid || '0.00'}
                        fullWidth
                        margin="normal"
                        disabled
                        InputProps={{
                            startAdornment: <InputAdornment position="start">€</InputAdornment>,
                        }}
                    />

                    <TextField
                        label="Total des charges réelles"
                        type="number"
                        value={calculateTotal()}
                        fullWidth
                        margin="normal"
                        disabled
                        InputProps={{
                            startAdornment: <InputAdornment position="start">€</InputAdornment>,
                        }}
                    />

                    <TextField
                        label="Balance des charges"
                        type="number"
                        value={calculateBalanceTotal()}
                        fullWidth
                        margin="normal"
                        disabled
                        InputProps={{
                            startAdornment: <InputAdornment position="start">€</InputAdornment>,
                        }}
                        sx={{
                            '& input': {
                                color: calculateBalanceTotal() >= 0 ? 'green' : 'red'
                            }
                        }}
                    />

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                        {calculateBalanceTotal() >= 0 ? 
                            "Le locataire a payé plus que les charges réelles" :
                            "Le locataire doit recevoir la différence"
                        }
                    </Typography>

                    <TextField
                        label="Date de paiement"
                        type="date"
                        value={formData.payment_date}
                        onChange={(e) => handleChange('payment_date', e.target.value)}
                        fullWidth
                        margin="normal"
                        InputLabelProps={{
                            shrink: true,
                        }}
                    />

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={formData.is_paid}
                                onChange={(e) => handleChange('is_paid', e.target.checked)}
                            />
                        }
                        label="Payé"
                    />

                    <TextField
                        label="Locataire"
                        value={flat?.active_tenant?.name || 'Aucun locataire'}
                        fullWidth
                        margin="normal"
                        disabled
                    />

                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                        <Button onClick={onClose}>
                            Annuler
                        </Button>
                        {selectedAdjustment && (
                            <Button 
                                onClick={handleDelete}
                                variant="outlined" 
                                color="error"
                                startIcon={<DeleteIcon />}
                            >
                                Supprimer
                            </Button>
                        )}
                        <Button type="submit" variant="contained">
                            {selectedAdjustment ? 'Modifier' : 'Ajouter'}
                        </Button>
                    </Box>
                </form>
            </Box>
        </Modal>
    );
};

export default AdjustmentModal;
