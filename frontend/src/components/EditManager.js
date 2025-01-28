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
import { getManagers, getManagerById, updateManager } from '../services/api';

const EditManager = () => {
  const [managers, setManagers] = useState([]);
  const [selectedManager, setSelectedManager] = useState('');
  const [managerData, setManagerData] = useState({
    name: '',
    email: '',
    phone_number: '',
    post_code: '',
  });

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const data = await getManagers();
      setManagers(data);
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const handleManagerSelect = async (event) => {
    const managerId = event.target.value;
    setSelectedManager(managerId);
    
    try {
      const data = await getManagerById(managerId);
      setManagerData(data);
    } catch (error) {
      console.error('Error fetching manager details:', error);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setManagerData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await updateManager(selectedManager, managerData);
      alert('Manager updated successfully');
      fetchManagers();
    } catch (error) {
      alert('Error updating manager: ' + error.message);
    }
  };
  console.log(managers,'managers')
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Edit Manager
        </Typography>
        
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Select Manager</InputLabel>
          <Select
            value={selectedManager}
            onChange={handleManagerSelect}
            label="Select Manager"
          >
            {managers.map((manager) => (
              <MenuItem key={manager.id} value={manager.id}>
                {manager.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedManager && (
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="name"
                  value={managerData.name}
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
                  value={managerData.email}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone_number"
                  value={managerData.phone_number}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Post Code"
                  name="post_code"
                  value={managerData.post_code}
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
                  Update Manager
                </Button>
              </Grid>
            </Grid>
          </form>
        )}
      </Paper>
    </Box>
  );
};

export default EditManager; 