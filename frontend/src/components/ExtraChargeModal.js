import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
} from '@mui/material';
import { createExtraCharge } from '../services/api';

const ExtraChargeModal = ({ open, onClose, tenant, flat, monthYear, onSave }) => {
    const [formData, setFormData] = useState({
        charge_amount: '',
        charge_type: '',
        description: '',
    });
    const [error, setError] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);

    // Update selectedMonth when monthYear prop changes
    useEffect(() => {
        if (monthYear) {
            setSelectedMonth(monthYear);
        }
    }, [monthYear]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        // Clear error when user starts typing
        setError(null);
    };

    const validateForm = () => {
        console.log('Validating form...');

        if (!formData.charge_type) {
            console.log('Validation failed: charge_type is required');
            setError('Le type de charge est requis');
            return false;
        }
        if (!formData.charge_amount || formData.charge_amount <= 0) {
            console.log('Validation failed: invalid charge_amount');
            setError('Le montant doit être supérieur à 0');
            return false;
        }
        if (selectedMonth) {
            console.log('selectedMonth:', selectedMonth);
            try {
                const [year, month] = selectedMonth.split('-');
                console.log('year:', year, 'month:', month);
                const referenceDate = new Date(year, parseInt(month) - 1, 1);
                console.log('referenceDate:', referenceDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
            } catch (error) {
                console.error('Error in date validation:', error);
                return false;
            }
        }
        console.log('Validation passed');
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!validateForm()) {
                return;
            }

            const [year, month] = selectedMonth.split('-');
            const formattedDate = `${year}-${month.padStart(2, '0')}-01`;

            const chargeData = {
                tenant: tenant?.id,
                flat: flat?.id,
                reference_month: formattedDate,
                charge_amount: parseFloat(formData.charge_amount),
                charge_type: formData.charge_type,
                description: formData.description || '',
            };

            await createExtraCharge(chargeData);
            
            // Call onSave to trigger refresh
            if (typeof onSave === 'function') {
                await onSave();
            }
            
            onClose();
            setFormData({
                charge_amount: '',
                charge_type: '',
                description: '',
            });
            setSelectedMonth(null);
            setError(null);
        } catch (error) {
            console.error('Error creating extra charge:', error);
            setError(error.response?.data?.error || 'Une erreur est survenue lors de la création de la charge');
        }
    };

    const handleClose = () => {
        // Reset form and error state when closing
        setFormData({
            charge_amount: '',
            charge_type: '',
            description: '',
        });
        setError(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Ajouter une charge supplémentaire</DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                        {error}
                    </Alert>
                )}
                
                <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Type de charge</InputLabel>
                    <Select
                        name="charge_type"
                        value={formData.charge_type}
                        onChange={handleChange}
                        label="Type de charge"
                        error={Boolean(error && !formData.charge_type)}
                    >
                        <MenuItem value="ordures_menageres">Ordures Ménagères</MenuItem>
                        <MenuItem value="entretien">Entretien</MenuItem>
                        <MenuItem value="autre">Autre</MenuItem>
                    </Select>
                </FormControl>

                <TextField
                    fullWidth
                    label="Montant"
                    type="number"
                    name="charge_amount"
                    value={formData.charge_amount}
                    onChange={handleChange}
                    sx={{ mt: 2 }}
                    error={Boolean(error && !formData.charge_amount)}
                    inputProps={{ min: "0", step: "0.01" }}
                />

                <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={4}
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    sx={{ mt: 2 }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Annuler</Button>
                <Button 
                    onClick={handleSubmit} 
                    variant="contained" 
                    color="primary"
                    disabled={!formData.charge_type || !formData.charge_amount}
                >
                    Sauvegarder
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ExtraChargeModal; 