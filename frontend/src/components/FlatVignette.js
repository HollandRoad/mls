import React, { useState, useEffect } from 'react';
import { 
    Paper, Typography, Box, Grid, Divider, IconButton, Menu, MenuItem,
    Card, CardContent, Chip, Tooltip
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import EuroIcon from '@mui/icons-material/Euro';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import HotelIcon from '@mui/icons-material/Hotel';  // For number of rooms
import { getAvailableTenants } from '../services/api';
import TenantTransitionModal from './TenantTransitionModal';
import { useRefresh } from '../context/RefreshContext';

const FlatVignette = ({ flatDetails, onEditClick , payments }) => {
    const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
    const [availableTenants, setAvailableTenants] = useState([]);
    const [anchorEl, setAnchorEl] = useState(null);
    const { refreshFlag } = useRefresh();

    useEffect(() => {
        const loadAvailableTenants = async () => {
            try {
                const tenants = await getAvailableTenants();
                setAvailableTenants(tenants);
            } catch (error) {
                console.error('Error loading available tenants:', error);
            }
        };
        loadAvailableTenants();
    }, [refreshFlag]);

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleTransitionClick = () => {
        setIsTransitionModalOpen(true);
        handleMenuClose();
    };

    // Calculate total outstanding amount
    const calculateOutstandingAmount = () => {
        if (!payments) return 0;

        return payments.reduce((total, payment) => {
            // Skip upcoming payments
            if (payment.is_upcoming) {
                return total;
            }

            if (!payment.is_paid) {
                // Add full amount for unpaid months including rent and utilities
                return total + parseFloat(flatDetails?.flat?.rent_amount || 0) + 
                              parseFloat(flatDetails?.flat?.utilities_amount || 0);
            } else if (payment.is_paid && payment.payment) {
                // Calculate difference for partially paid months
                const expectedAmount = (payment.payment.amount || 0) + 
                                    (payment.payment.utilities_amount || 0) +
                                    (payment.extra_charges?.reduce((sum, charge) => 
                                        sum + parseFloat(charge.charge_amount), 0) || 0);

                // Get adjustment for this month
                const adjustment = flatDetails?.all_adjustments?.find(adj => 
                    adj.reference_month && 
                    new Date(adj.reference_month).toISOString().slice(0, 7) === payment.month_year
                );

                // Add adjustment amount if exists
                const adjustmentAmount = adjustment ? 
                    parseFloat(adjustment.lift_amount || 0) + 
                    parseFloat(adjustment.heating_amount || 0) + 
                    parseFloat(adjustment.other_amount || 0) - 
                    parseFloat(adjustment.yearly_utilities_paid || 0) : 0;

                const totalExpected = expectedAmount + adjustmentAmount;
                const amountPaid = payment.payment.amount_paid || 0;
                const difference = totalExpected - amountPaid;
                return total + (difference > 0 ? difference : 0);
            }
            return total;
        }, 0);
    };

    const outstandingAmount = calculateOutstandingAmount();

    return (
        <Card 
            elevation={2}
            sx={{
                mb: 4,
                borderRadius: '12px',
                background: 'linear-gradient(to right, #ffffff, #f8f9fa)',
                position: 'relative',
                overflow: 'visible'
            }}
        >
            {/* Top Status Bar */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: '20px',
                    transform: 'translateY(-50%)',
                    zIndex: 1,
                }}
            >
                <Chip
                    label={flatDetails?.active_tenant.name ? 'Occupé' : 'Vacant'}
                    color={flatDetails?.active_tenant.name ? 'success' : 'error'}
                    size="small"
                    sx={{ fontWeight: 500 }}
                />
            </Box>  

            <CardContent sx={{ pt: 3 }}>
                <Grid container spacing={3}>
                    {/* Header Section */}
                    <Grid item xs={12}>
                        <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            mb: 2 
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <HomeIcon sx={{ color: 'primary.main', fontSize: '2rem' }} />
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                        {flatDetails?.flat.flat_name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        <HotelIcon sx={{ fontSize: '1rem', mr: 0.5, verticalAlign: 'text-bottom' }}/>
                                        {flatDetails?.flat.number_of_rooms} pièces
                                    </Typography>
                                </Box>
                            </Box>
                            <IconButton 
                                onClick={onEditClick}
                                sx={{ 
                                    bgcolor: 'primary.light',
                                    '&:hover': { bgcolor: 'primary.main', color: 'white' }
                                }}
                            >
                                <EditIcon />
                            </IconButton>
                        </Box>
                        <Divider />
                    </Grid>

                    {/* Info Cards Section */}
                    <Grid item xs={12} md={8}>
                        {/* Address Card */}
                        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: '8px', boxShadow: 1 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Adresse
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LocationOnIcon color="action" />
                                <Typography>
                                    {flatDetails?.flat.address}, {flatDetails?.flat.post_code} {flatDetails?.flat.city}
                                </Typography>
                            </Box>
                        </Box>

                        {/* People Card */}
                        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: '8px', boxShadow: 1 }}>
                            <Grid container spacing={2}>
                                {/* Tenant */}
                                <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <PersonIcon color="action" />
                                            <Box>
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Locataire
                                                </Typography>
                                                <Typography>
                                                    {flatDetails?.active_tenant.name || 'Vacant'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <IconButton size="small" onClick={handleMenuOpen}>
                                            <MoreVertIcon />
                                        </IconButton>
                                    </Box>
                                </Grid>

                                {/* Landlord & Building Manager */}
                                <Grid item xs={6}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <BusinessIcon color="action" />
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Propriétaire
                                            </Typography>
                                            <Typography>
                                                {flatDetails?.landlord.name || 'Non spécifié'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                                <Grid item xs={6}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <PersonIcon color="action" />
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Gestionnaire
                                            </Typography>
                                            <Typography>
                                                {flatDetails?.building_manager.name || 'Non spécifié'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>
                    </Grid>

                    {/* Financial Card */}
                    <Grid item xs={12} md={4} sx={{ display: 'flex' }}>
                        <Box sx={{ 
                            p: 2.5, 
                            bgcolor: 'background.paper', 
                            borderRadius: '8px', 
                            boxShadow: 1,
                            width: '100%', 
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <Typography 
                                variant="subtitle1" 
                                sx={{ 
                                    color: 'text.primary',
                                    fontWeight: 600,
                                    mb: 1.5
                                }}
                            >
                                Détails financiers
                            </Typography>
                            
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: 1.5,
                            }}>
                                {/* Loyer */}
                                <Box>
                                    <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        mb: 0.5
                                    }}>
                                        <Typography 
                                            variant="body2" 
                                            sx={{ 
                                                color: 'text.secondary',
                                                fontWeight: 500 
                                            }}
                                        >
                                            Loyer
                                        </Typography>
                                        <Typography 
                                            variant="h6" 
                                            sx={{ 
                                                color: 'primary.main',
                                                fontWeight: 600,
                                                letterSpacing: '0.5px',
                                                fontSize: '1.1rem'
                                            }}
                                        >
                                            {flatDetails?.flat.rent_amount}€
                                        </Typography>
                                    </Box>
                                    <Divider sx={{ opacity: 0.6 }} />
                                </Box>

                                {/* Charges */}
                                <Box>
                                    <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        mb: 0.5
                                    }}>
                                        <Typography 
                                            variant="body2" 
                                            sx={{ 
                                                color: 'text.secondary',
                                                fontWeight: 500 
                                            }}
                                        >
                                            Charges
                                        </Typography>
                                        <Typography 
                                            variant="h6" 
                                            sx={{ 
                                                color: 'primary.main',
                                                fontWeight: 600,
                                                letterSpacing: '0.5px',
                                                fontSize: '1.1rem'
                                            }}
                                        >
                                            {flatDetails?.flat.utilities_amount}€
                                        </Typography>
                                    </Box>
                                    <Divider sx={{ opacity: 0.6 }} />
                                </Box>

                                {/* Outstanding Amount - Only show if there is an outstanding amount or if there is an excess payment.

                                */}
                                {outstandingAmount > 0 && (
                                    <Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                            <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 500 }}>
                                                Reste à payer
                                            </Typography>
                                            <Typography variant="h6" sx={{ color: 'error.main', fontWeight: 600, letterSpacing: '0.5px', fontSize: '1.1rem' }}>
                                                {outstandingAmount.toFixed(2)}€
                                            </Typography>
                                        </Box>
                                        <Divider sx={{ opacity: 0.6 }} />
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
            </CardContent>

            {/* Menus and Modals */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                    elevation: 3,
                    sx: { borderRadius: '8px' }
                }}
            >
                <MenuItem 
                    onClick={handleTransitionClick}
                    sx={{ 
                        color: 'error.main',
                        fontSize: '0.875rem'
                    }}
                >
                    Fin de bail
                </MenuItem>
            </Menu>

            <TenantTransitionModal
                open={isTransitionModalOpen}
                onClose={() => setIsTransitionModalOpen(false)}
                flat={flatDetails.flat}
                tenant={flatDetails.active_tenant}
                tenant_id={flatDetails.active_tenant.id}
                currentTenant={flatDetails.active_tenant}
                availableTenants={availableTenants}
                onTransitionComplete={onEditClick}
            />
        </Card>
    );
};

export default FlatVignette;
