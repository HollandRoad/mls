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
import { API_URL, getLandlords } from '../services/api';

const EditLandlord = () => {
  const [landlords, setLandlords] = useState([]);
  const [selectedLandlord, setSelectedLandlord] = useState('');
  const [landlordData, setLandlordData] = useState({
    name: '',
    email: '',
    phone_number: '',
    address: '',
    city: '',
    post_code: '',
  });

  useEffect(() => {
    fetchLandlords();
  }, []);

  const fetchLandlords = async () => {
    try {
      const data = await getLandlords();
      setLandlords(data);
    } catch (error) {
      console.error('Error fetching landlords:', error);
    }
  };

  const handleLandlordSelect = async (event) => {
    const landlordId = event.target.value;
    setSelectedLandlord(landlordId);
    
    try {
      const response = await fetch(`${API_URL}landlords/${landlordId}/`);
      const data = await response.json();
      setLandlordData(data);
    } catch (error) {
      console.error('Error fetching landlord details:', error);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setLandlordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(`${API_URL}landlords/${selectedLandlord}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(landlordData),
      });

      if (response.ok) {
        alert('Landlord updated successfully');
        fetchLandlords();
      } else {
        throw new Error('Failed to update landlord');
      }
    } catch (error) {
      alert('Error updating landlord: ' + error.message);
    }
  };
  console.log(landlords,'landlords')
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Edit Landlord
        </Typography>
        
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Select Landlord</InputLabel>
          <Select
            value={selectedLandlord}
            onChange={handleLandlordSelect}
            label="Select Landlord"
          >
            {landlords.map((landlord) => (
              <MenuItem key={landlord.id} value={landlord.id}>
                {landlord.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedLandlord && (
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="name"
                  value={landlordData.name}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={landlordData.email}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone_number"
                  value={landlordData.phone_number}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  value={landlordData.address}
                  onChange={handleInputChange}
                  margin="normal"
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="City"
                  name="city"
                  value={landlordData.city}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Post Code"
                  name="post_code"
                  value={landlordData.post_code}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2 }}
                >
                  Update Landlord
                </Button>
              </Grid>
            </Grid>
          </form>
        )}
      </Paper>
    </Box>
  );
};

export default EditLandlord; 