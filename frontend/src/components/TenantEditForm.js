import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid
} from '@mui/material';
import { updateTenant } from '../services/api';

const TenantEditForm = ({ open, onClose, tenant, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone_number: '',
        address: '',
        post_code: '',
        city: '',
        start_date: '',
        deposit_amount: '',
        flat: null
    });

    useEffect(() => {
        if (tenant) {
            setFormData({
                name: tenant.name || '',
                email: tenant.email || '',
                phone_number: tenant.phone_number || '',
                address: tenant.address || '',
                post_code: tenant.post_code || '',
                city: tenant.city || '',
                start_date: tenant.start_date || '',
                deposit_amount: tenant.deposit_amount || '',
                flat: tenant.flat?.id || null
            });
        }
    }, [tenant]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateTenant(tenant.id, formData);
            onSave();
            onClose();
        } catch (error) {
            console.error('Error updating tenant:', error);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Modifier le locataire</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Grid container spacing={2}>
                        {/* Tenant Information */}
                        <Grid item xs={12}>
                            <h4>Informations du locataire</h4>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Nom"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Téléphone"
                                name="phone_number"
                                value={formData.phone_number}
                                onChange={handleChange}
                            />
                        </Grid>

                        {/* Address Information */}
                        <Grid item xs={12}>
                            <h4>Adresse</h4>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Adresse"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Code postal"
                                name="post_code"
                                value={formData.post_code}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Ville"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                required
                            />
                        </Grid>

                        {/* Lease Information */}
                        <Grid item xs={12}>
                            <h4>Informations du bail</h4>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Date de début"
                                name="start_date"
                                type="date"
                                value={formData.start_date}
                                onChange={handleChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Montant du dépôt"
                                name="deposit_amount"
                                type="number"
                                value={formData.deposit_amount}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Annuler</Button>
                    <Button type="submit" variant="contained" color="primary">
                        Sauvegarder
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default TenantEditForm;
