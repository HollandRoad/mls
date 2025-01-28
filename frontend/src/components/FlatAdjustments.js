import React, { useState, useEffect, useCallback } from 'react';
import { getFlatAdjustments, getTenantsByFlat, createUtilityAdjustment } from '../services/api';
import {
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Button,
    Box
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useRefresh } from '../context/RefreshContext';
import AdjustmentModal from './AdjustmentModal';

import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { DragSource } from 'react-dnd';
import { useDrag } from 'react-dnd';

const AddAdjustmentForm = ({ flat, onSubmit, onCancel, tenants }) => {
    const [formData, setFormData] = useState({
        reference_year: new Date().getFullYear(),
        payment_date: '',
        lift_amount: '',
        heating_amount: '',
        amount: '',
        tenant_id: '',
        is_paid: false
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <FormControl fullWidth margin="normal">
                <InputLabel>Locataire</InputLabel>
                <Select
                    name="tenant_id"
                    value={formData.tenant_id}
                    onChange={handleChange}
                    required
                >
                    {tenants.map(tenant => (
                        <MenuItem key={tenant.id} value={tenant.id}>
                            {tenant.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            {/* ... rest of the form ... */}
        </form>
    );
};

const getStatusDisplay = (isPaid) => {
    if (isPaid) {
        return {
            label: 'Payé',
            color: '#e8f5e9', // Light green background
            textColor: '#2e7d32', // Green text
        };
    }
    return {
        label: 'Non payé',
        color: '#ffebee', // Light red background
        textColor: '#c62828', // Red text
    };
};

// Define drag source
const adjustmentSource = {
    beginDrag(props) {
        return {
            adjustmentId: props.adjustment.id,
            adjustmentYear: props.adjustment.reference_year
        };
    }
};

const AdjustmentRow = ({ adjustment, onEditClick }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'adjustment',
        item: { 
            adjustmentId: adjustment.id,
            adjustmentYear: adjustment.reference_year
        },
        collect: monitor => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    return (
        <TableRow 
            ref={drag}
            style={{ 
                opacity: isDragging ? 0.5 : 1,
                cursor: 'move',
                backgroundColor: isDragging ? '#f5f5f5' : 'inherit'
            }}
        >
            <TableCell>{adjustment.reference_year}</TableCell>
            <TableCell>{adjustment.lift_amount} €</TableCell>
            <TableCell>{adjustment.heating_amount} €</TableCell>
            <TableCell>{adjustment.other_amount} €</TableCell>
            <TableCell>
                <strong>
                    {(
                        Number(adjustment.lift_amount) + 
                        Number(adjustment.heating_amount) + 
                        Number(adjustment.other_amount)
                    ).toFixed(2)} €
                </strong>
            </TableCell>
            <TableCell>{adjustment.yearly_utilities_paid} €</TableCell>
            <TableCell>
                <Box sx={{
                    color: adjustment.utilities_balance >= 0 ? 'success.main' : 'error.main',
                    fontWeight: 'bold'
                }}>
                    {adjustment.utilities_balance} €
                </Box>
            </TableCell>
            <TableCell>
                {adjustment.payment_date 
                    ? new Date(adjustment.payment_date).toLocaleDateString('fr-FR')
                    : '-'
                }
            </TableCell>
            <TableCell>
                {adjustment.reference_month 
                    ? new Date(adjustment.reference_month).toLocaleString('fr-FR', { 
                        month: 'long', 
                        year: 'numeric' 
                    })
                    : '-'
                }
            </TableCell>
            <TableCell>
                <Box sx={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    backgroundColor: getStatusDisplay(adjustment.is_paid).color,
                    color: getStatusDisplay(adjustment.is_paid).textColor,
                    fontWeight: 500,
                }}>
                    {getStatusDisplay(adjustment.is_paid).label}
                </Box>
            </TableCell>
            <TableCell>{adjustment.tenant_name}</TableCell>
            <TableCell>
                <IconButton size="small" onClick={() => onEditClick(adjustment)}>
                    <EditIcon fontSize="small" />
                </IconButton>
            </TableCell>
        </TableRow>
    );
};

const FlatAdjustments = ({ flat }) => {
    const { refreshAdjustmentFlag } = useRefresh();
    const [adjustments, setAdjustments] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAdjustment, setSelectedAdjustment] = useState(null);
    const [setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [tenants, setTenants] = useState([]);

    const loadAdjustments = useCallback(async () => {
        try {

            const flatId = flat?.id || flat?.flat?.id;
            const tenantId = flat?.active_tenant?.id;
            
            if (!flatId) {
                console.log('No flat ID available:', flat);
                return;
            }


            const data = await getFlatAdjustments(flatId, tenantId);
  
            setAdjustments(data);
        } catch (error) {
            console.error('Error loading adjustments:', error);
            setError('Erreur lors du chargement des régularisations');
        }
    }, [flat]);

    useEffect(() => {
        if (flat) {
            loadAdjustments();
        }
    }, [flat, loadAdjustments]);

    useEffect(() => {
        if (flat) {
            loadAdjustments();
        }
    }, [refreshAdjustmentFlag, flat, loadAdjustments]);

    const handleModalClose = () => {
        setIsModalOpen(false);
        // setSelectedAdjustment(null);
    };

    const handleSave = async () => {
        if (flat?.id) {
            try {
                await loadAdjustments();
                handleModalClose();
            } catch (error) {
                console.error('Error refreshing adjustments:', error);
                setError('Erreur lors du rafraîchissement des régularisations');
            }
        }
    };

    const handleEditClick = (adjustment) => {
        setSelectedAdjustment(adjustment);
        setIsModalOpen(true);
    };

    const handleAddClick = () => {
        setSelectedAdjustment(null);
        setIsModalOpen(true);
    };

    const loadTenants = useCallback(async () => {
        try {
            const flatId = flat?.id || flat?.flat?.id;
            if (!flatId) return;

            const data = await getTenantsByFlat(flatId);
            setTenants(data);
        } catch (error) {
            console.error('Error loading tenants:', error);
        }
    }, [flat]);

    useEffect(() => {
        if (flat) {
            loadTenants();
        }
    }, [flat, loadTenants]);

    const handleAddAdjustment = async (formData) => {
        try {
            const flatId = flat?.id || flat?.flat?.id;
            await createUtilityAdjustment({
                ...formData,
                flat: flatId,
            });
            loadAdjustments();  
            setShowAddForm(false);
        } catch (error) {
            console.error('Error adding adjustment:', error);
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 2, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <ReceiptLongIcon sx={{ mr: 1 }} />
                    Régularisation des charges
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    size="small"
                    onClick={handleAddClick}
                >
                    Ajouter
                </Button>
            </Box>

            <TableContainer sx={{ maxHeight: 400, overflow: 'auto' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Année</TableCell>
                            <TableCell>Ascenseur</TableCell>
                            <TableCell>Chauffage</TableCell>
                            <TableCell>Autres</TableCell>
                            <TableCell>Total charges</TableCell>
                            <TableCell>Charges payées</TableCell>
                            <TableCell>Balance</TableCell>
                            <TableCell>Date de paiement</TableCell>
                            <TableCell>Mois de référence</TableCell>
                            <TableCell>Statut</TableCell>
                            <TableCell>Locataire</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {adjustments && adjustments.map((adjustment) => (
                            <AdjustmentRow 
                                key={adjustment.id} 
                                adjustment={adjustment}
                                onEditClick={handleEditClick}
                            />
                        ))}
                        {(!adjustments || adjustments.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={9} align="center">
                                    Aucune régularisation trouvée
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <AdjustmentModal
                open={isModalOpen}
                onClose={handleModalClose}
                onSave={handleSave}
                flat={flat}
                selectedAdjustment={selectedAdjustment}
            />

            {showAddForm && (
                <AddAdjustmentForm
                    flat={flat}
                    onSubmit={handleAddAdjustment}
                    onCancel={() => setShowAddForm(false)}
                    tenants={tenants}
                />
            )}
        </Paper>
    );
};

export default FlatAdjustments;
