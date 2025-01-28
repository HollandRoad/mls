import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Button,
  Typography,
  Paper,
  Grid,
} from '@mui/material';
import { API_URL, getTenants, getTenantById, updateTenant } from '../services/api';

const EditTenant = () => {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [tenantData, setTenantData] = useState({
    name: '',
    email: '',
    phone_number: '',
    address: '',
    post_code: '',
    city: '',
    start_date: '',
    deposit_amount: '',
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const data = await getTenants();
      setTenants(data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const handleTenantSelect = async (event) => {
    const tenantId = event.target.value;
    setSelectedTenant(tenantId);
    
    try {
      const data = await getTenantById(tenantId);
      setTenantData(data);
    } catch (error) {
      console.error('Error fetching tenant details:', error);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setTenantData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await updateTenant(selectedTenant, tenantData);
      alert('Tenant updated successfully');
      fetchTenants(); // Refresh the list
    } catch (error) {
      alert('Error updating tenant: ' + error.message);
    }
  };

  console.log(tenants,'tenants')
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Modifier le Locataire
        </Typography>
        
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Sélectionner un Locataire</InputLabel>
          <Select
            value={selectedTenant}
            onChange={handleTenantSelect}
            label="Sélectionner un Locataire"
          >
            {tenants.map((tenant) => (
              <MenuItem key={tenant.id} value={tenant.id}>
                {`${tenant.name} `}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedTenant && (
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nom Complet"
                  name="name"
                  value={tenantData.name}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Adresse Email"
                  name="email"
                  type="email"
                  value={tenantData.email}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Numéro de Téléphone"
                  name="phone_number"
                  value={tenantData.phone_number}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Adresse"
                  name="address"
                  value={tenantData.address}
                  onChange={handleInputChange}
                  margin="normal"
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ville"
                  name="city"
                  value={tenantData.city}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Code Postal"
                  name="post_code"
                  value={tenantData.post_code}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Montant du Dépôt"
                  name="deposit_amount"
                  type="number"
                  value={tenantData.deposit_amount}
                  onChange={handleInputChange}
                  margin="normal"
                  InputProps={{
                    startAdornment: <span>€</span>,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Date de Début"
                  name="start_date"
                  type="date"
                  value={tenantData.start_date}
                  onChange={handleInputChange}
                  margin="normal"
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2 }}
                >
                  Mettre à Jour le Locataire
                </Button>
              </Grid>
            </Grid>
          </form>
        )}
      </Paper>
    </Box>
  );
};

export default EditTenant; 