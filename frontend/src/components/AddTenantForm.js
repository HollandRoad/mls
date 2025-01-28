import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Paper,
    Grid,
    Container,
    MenuItem
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getAvailableFlats, createTenant } from '../services/api';

const AddTenantForm = () => {
    const navigate = useNavigate();
    const [flats, setFlats] = useState([]); // Will be populated from API
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        flat_id: '',
        entry_date: '',
        deposit_amount: '',
        address: '',
        post_code: '',
        city: '',
    });

    useEffect(() => {
        const fetchFlats = async () => {
            try {
                const data = await getAvailableFlats();
                setFlats(data);
            } catch (error) {
                console.error('Error fetching flats:', error);
                // Add error handling here
            }
        };
        
        fetchFlats();
    }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createTenant(formData);
            navigate('/');
        } catch (error) {
            console.error('Error submitting form:', error);
            // Add error handling here
        }
    };

    return (
        <Container maxWidth="md">
            <Box sx={{ mt: 4, mb: 4 }}>
                <Paper sx={{ p: 4 }}>
                    <Typography variant="h5" gutterBottom>
                        Ajouter un Locataire
                    </Typography>
                    <form onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Nom complet"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </Grid>
                            <Grid item xs={6}>
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
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Téléphone"
                                    name="phone_number"
                                    value={formData.phone_number}
                                    onChange={handleChange}
                                    required
                                />
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
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Code Postal"
                                    name="post_code"
                                    value={formData.post_code}
                                    onChange={handleChange}
                                    required
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Ville"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Appartement"
                                    name="flat"
                                    value={formData.flat}
                                    onChange={handleChange}
                                    
                                >
                                    {flats.map((flat) => (
                                        <MenuItem key={flat.id} value={flat.id}>
                                            {flat.flat_name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Date d'entrée"
                                    name="start_date"
                                    type="date"
                                    value={formData.start_date}
                                    onChange={handleChange}
                                    InputLabelProps={{
                                        shrink: true,
                                    }}
                                    
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Montant du dépôt de garantie"
                                    name="deposit_amount"
                                    type="number"
                                    value={formData.deposit_amount}
                                    onChange={handleChange}
                                    
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                    <Button
                                        variant="outlined"
                                        onClick={() => navigate('/')}
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        color="primary"
                                    >
                                        Ajouter
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </form>
                </Paper>
            </Box>
        </Container>
    );
};

export default AddTenantForm;
