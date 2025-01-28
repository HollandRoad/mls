import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Paper,
    Grid,
    Container,
    MenuItem,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { createFlat, getLandlords, getManagers } from '../services/api';

const AddFlatForm = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [landlords, setLandlords] = useState([]);
    const [managers, setManagers] = useState([]);
    
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        post_code: '',
        city: '',
        type: '',
        number_of_rooms: '',
        rent_amount: '',
        charges_amount: '',
        landlord_id: '',
        manager_id: '',
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [landlordsData, managersData] = await Promise.all([
                    getLandlords(),
                    getManagers()
                ]);
                console.log(landlordsData,'landlordsData');
                setLandlords(landlordsData);
                setManagers(managersData);
            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Erreur lors du chargement des données');
            }
        };

        fetchData();
    }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            await createFlat(formData);
            navigate('/');
        } catch (error) {
            setError('Une erreur est survenue lors de la création de l\'appartement.');
            console.error('Error submitting form:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md">
            <Box sx={{ mt: 4, mb: 4 }}>
                <Paper sx={{ p: 4 }}>
                    <Typography variant="h5" gutterBottom>
                        Ajouter un Appartement
                    </Typography>
                    <form onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
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
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Type de bien"
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    required
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Nombre de pièces"
                                    name="number_of_rooms"
                                    type="number"
                                    value={formData.number_of_rooms}
                                    onChange={handleChange}
                                    required
                                    InputProps={{ inputProps: { min: 1 } }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Montant du loyer"
                                    name="rent_amount"
                                    type="number"
                                    value={formData.rent_amount}
                                    onChange={handleChange}
                                    required
                                />
                            </Grid>
                            <Grid item xs={6}>
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
                            <Grid item xs={6}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Propriétaire"
                                    name="landlord"
                                    value={formData.landlord}
                                    onChange={handleChange}
                                    required
                                >
                                    {landlords.map((landlord) => (
                                        <MenuItem key={landlord.id} value={landlord.id}>
                                            {landlord.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Gestionnaire"
                                    name="building_manager"
                                    value={formData.building_manager}
                                    onChange={handleChange}
                                    required
                                >
                                    {managers.map((manager) => (
                                        <MenuItem key={manager.id} value={manager.id}>
                                            {manager.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            
                            {error && (
                                <Grid item xs={12}>
                                    <Typography color="error">{error}</Typography>
                                </Grid>
                            )}
                            
                            <Grid item xs={12}>
                                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                    <Button
                                        variant="outlined"
                                        onClick={() => navigate('/')}
                                        disabled={loading}
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        color="primary"
                                        disabled={loading}
                                    >
                                        {loading ? 'Création en cours...' : 'Ajouter'}
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

export default AddFlatForm;
