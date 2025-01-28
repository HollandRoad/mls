import React, { useState, useEffect } from 'react';
import {
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Box,
    Button
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import { getVacantFlats } from '../services/api';
import RentFlatModal from './RentFlatModal';
import { useRefresh } from '../context/RefreshContext';

const VacantFlats = () => {
    const [vacantFlats, setVacantFlats] = useState([]);
    const [selectedFlat, setSelectedFlat] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { refreshFlatFlag, triggerRefreshFlat  } = useRefresh();

    useEffect(() => {
        const loadVacantFlats = async () => {
            try {
                const vacant = await getVacantFlats();
                setVacantFlats(vacant);
            } catch (error) {
                console.error('Error loading vacant flats:', error);
            }
        };
        loadVacantFlats();
    }, [refreshFlatFlag]);

    const handleRentClick = (flat) => {
        setSelectedFlat(flat);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setSelectedFlat(null);
        setIsModalOpen(false);
    };

    const handleSuccess = async () => {
        // Refresh the vacant flats list
        const data = await getVacantFlats();
        setVacantFlats(data);
        // Trigger refresh of TenantSummary
        triggerRefreshFlat();
    };

    return (
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <HomeIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" color="primary">
                    Appartements Vacants
                </Typography>
            </Box>

            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Appartement</TableCell>
                            <TableCell>Adresse</TableCell>
                            <TableCell>Loyer</TableCell>
                            <TableCell>Charges</TableCell>
                            <TableCell>Vacant depuis</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {vacantFlats.length > 0 ? (
                            vacantFlats.map((flat) => (
                                <TableRow key={flat.id}>
                                    <TableCell>{flat.flat_name}</TableCell>
                                    <TableCell>{flat.address}, {flat.city}</TableCell>
                                    <TableCell>{flat.rent_amount} €</TableCell>
                                    <TableCell>{flat.utilities_amount} €</TableCell>
                                    <TableCell>
                                        {flat.last_tenant_end_date ? 
                                            new Date(flat.last_tenant_end_date).toLocaleDateString('fr-FR') : 
                                            'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={() => handleRentClick(flat)}
                                        >
                                            Louer
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    Aucun appartement vacant
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {selectedFlat && (
                <RentFlatModal
                    open={isModalOpen}
                    onClose={handleModalClose}
                    flat={selectedFlat}
                    onSuccess={handleSuccess}
                />
            )}
        </Paper>
    );
};

export default VacantFlats;
