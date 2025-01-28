import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Typography,
    MenuItem,
    FormControl,
    InputLabel,
    Select
} from '@mui/material';
import { updateFlat, getManagers, getLandlords } from '../services/api';
import { useRefresh } from '../context/RefreshContext';

const FlatEditForm = ({ open, onClose, flat, onSave }) => {
    const [formData, setFormData] = useState({
        flat_name: '',
        address: '',
        post_code: '',
        city: '',
        number_of_rooms: '',
        rent_amount: '',
        utilities_amount: '',
        building_manager: '',
        landlord: ''
    });

    const [managers, setManagers] = useState([]);
    const [landlords, setLandlords] = useState([]);
    const { triggerRefresh } = useRefresh();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [managersData, landlordsData] = await Promise.all([
                    getManagers(),
                    getLandlords()
                ]);
                setManagers(managersData);
                setLandlords(landlordsData);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        if (open) {
            fetchData();
        }
    }, [open]);

    useEffect(() => {
        console.log('Managers:', managers);
        console.log('FormData building_manager:', formData.building_manager);
        if (flat) {
            setFormData({
                flat_name: flat.flat.flat_name || '',
                address: flat.flat.address || '',
                post_code: flat.flat.post_code || '',
                city: flat.flat.city || '',
                number_of_rooms: flat.flat.number_of_rooms || '',
                rent_amount: flat.flat.rent_amount || '',
                utilities_amount: flat.flat.utilities_amount || '',
                building_manager: flat.building_manager?.id || '',
                landlord: flat.landlord?.id || ''
            });
        }
    }, [flat]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const updatedFlat = await updateFlat(flat.flat.id, formData);
            // Pass the updated flat data to parent through onSave
            if (onSave) {

                await onSave(updatedFlat);
            }
            onClose();
        } catch (error) {
            console.error('Error updating flat:', error);
        }

    };


    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Modifier l'appartement</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Grid container spacing={3}>
                        {/* Basic Information */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" sx={{ mb: 2 }}>
                                Informations de base
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Nom de l'appartement"
                                name="flat_name"
                                value={formData.flat_name}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Nombre de chambres"
                                name="number_of_rooms"
                                type="number"
                                value={formData.number_of_rooms}
                                onChange={handleChange}
                                required
                            />
                        </Grid>

                        {/* Address Information */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" sx={{ mb: 2, mt: 2 }}>
                                Adresse
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
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

                        {/* Financial Information */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" sx={{ mb: 2, mt: 2 }}>
                                Informations financières
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Montant du loyer (charges incluses)"
                                name="rent_amount"
                                type="number"
                                value={formData.rent_amount}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Montant des charges"
                                name="utilities_amount"
                                type="number"
                                value={formData.utilities_amount}
                                onChange={handleChange}
                                required
                            />
                        </Grid>

                        {/* Management Information */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" sx={{ mb: 2, mt: 2 }}>
                                Gestion
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Gestionnaire</InputLabel>
                                <Select
                                    name="building_manager"
                                    value={formData.building_manager || ''}
                                    onChange={handleChange}
                                    label="Gestionnaire"
                                    required
                                >
                                    {managers.map((manager) => (
                                        <MenuItem key={manager.id} value={manager.id}>
                                            {manager.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Propriétaire</InputLabel>
                                <Select
                                    name="landlord"
                                    value={formData.landlord}
                                    onChange={handleChange}
                                    label="Propriétaire"
                                    required
                                >
                                    {landlords.map((landlord) => (
                                        <MenuItem key={landlord.id} value={landlord.id}>
                                            {landlord.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Add Tenant Field */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Locataire actuel"
                                value={flat?.active_tenant?.name || 'Aucun locataire'}
                                disabled
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

export default FlatEditForm;
