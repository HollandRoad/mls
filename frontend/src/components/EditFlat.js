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
import { API_URL } from '../services/api';

const EditFlat = () => {
  const [flats, setFlats] = useState([]);
  const [selectedFlat, setSelectedFlat] = useState('');
  const [managers, setManagers] = useState([]);
  const [landlords, setLandlords] = useState([]);
  const [flatData, setFlatData] = useState({
    address: '',
    city: '',
    post_code: '',
    rent_amount: '',
    utilities_amount: '',
    building_manager: '',
    landlord: '',
    number_of_room: '',
  });

  useEffect(() => {
    fetchFlats();
    fetchManagers();
    fetchLandlords();
  }, []);

  const fetchFlats = async () => {
    try {
      const response = await fetch(`${API_URL}flats/`);
      const data = await response.json();
      setFlats(data);
    } catch (error) {
      console.error('Error fetching flats:', error);
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await fetch(`${API_URL}managers/`);
      const data = await response.json();
      setManagers(data);
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const fetchLandlords = async () => {
    try {
      const response = await fetch(`${API_URL}landlords/`);
      const data = await response.json();
      setLandlords(data);
    } catch (error) {
      console.error('Error fetching landlords:', error);
    }
  };

  const handleFlatSelect = async (event) => {
    const flatId = event.target.value;
    setSelectedFlat(flatId);
    
    try {
      const response = await fetch(`${API_URL}flats/${flatId}/`);
      const data = await response.json();
      setFlatData(data);
    } catch (error) {
      console.error('Error fetching flat details:', error);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFlatData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(`${API_URL}flats/${selectedFlat}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flatData),
      });

      if (response.ok) {
        alert('Flat updated successfully');
        fetchFlats();
      } else {
        throw new Error('Failed to update flat');
      }
    } catch (error) {
      alert('Error updating flat: ' + error.message);
    }
  };
  console.log(flats,'flats')

  const commonTextFieldSx = {
    '& .MuiInputLabel-root': {
      backgroundColor: 'white',
      px: 1,
    },
    '& .MuiInputLabel-shrink': {
      backgroundColor: 'white',
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Modifier l'Appartement
        </Typography>
        
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Sélectionner un Appartement</InputLabel>
          <Select
            value={selectedFlat}
            onChange={handleFlatSelect}
            label="Sélectionner un Appartement"
          >
            {flats.map((flat) => (
              <MenuItem key={flat.id} value={flat.id}>
                {`${flat.address}, ${flat.city}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedFlat && (
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Gestionnaire d'Immeuble</InputLabel>
                  <Select
                    name="building_manager"
                    value={flatData.building_manager}
                    onChange={handleInputChange}
                    label="Gestionnaire d'Immeuble"
                  >
                    {managers.map((manager) => (
                      <MenuItem key={manager.id} value={manager.id}>
                        {`${manager.name}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Propriétaire</InputLabel>
                  <Select
                    name="landlord"
                    value={flatData.landlord}
                    onChange={handleInputChange}
                    label="Propriétaire"
                  >
                    {landlords.map((landlord) => (
                      <MenuItem key={landlord.id} value={landlord.id}>
                        {`${landlord.name}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Adresse"
                  name="address"
                  value={flatData.address}
                  onChange={handleInputChange}
                  margin="normal"
                  multiline
                  rows={2}
                  sx={commonTextFieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ville"
                  name="city"
                  value={flatData.city}
                  onChange={handleInputChange}
                  margin="normal"
                  sx={commonTextFieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Code Postal"
                  name="post_code"
                  value={flatData.post_code}
                  onChange={handleInputChange}
                  margin="normal"
                  sx={commonTextFieldSx}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nombre de Pièces"
                  name="number_of_room"
                  type="number"
                  value={flatData.number_of_room}
                  onChange={handleInputChange}
                  margin="normal"
                  InputProps={{
                    inputProps: { min: 0 }
                  }}
                  sx={commonTextFieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Montant du Loyer"
                  name="rent_amount"
                  type="number"
                  value={flatData.rent_amount}
                  onChange={handleInputChange}
                  margin="normal"
                  InputProps={{
                    startAdornment: <span>€</span>,
                  }}
                  sx={commonTextFieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Montant des Charges"
                  name="utilities_amount"
                  type="number"
                  value={flatData.utilities_amount}
                  onChange={handleInputChange}
                  margin="normal"
                  InputProps={{
                    startAdornment: <span>€</span>,
                  }}
                  sx={commonTextFieldSx}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2 }}
                >
                  Mettre à Jour
                </Button>
              </Grid>
            </Grid>
          </form>
        )}
      </Paper>
    </Box>
  );
};

export default EditFlat; 