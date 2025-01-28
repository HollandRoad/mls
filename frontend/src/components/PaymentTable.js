import React, { useState, useEffect } from 'react';

import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    IconButton,
    Menu,
    MenuItem,
    Paper,
    Typography,
    Divider,
    Box,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert'; // Import the three dots icon
import { useRefresh } from '../context/RefreshContext';
import PaymentIcon from '@mui/icons-material/Payment'; // Import the payment icon
import AddIcon from '@mui/icons-material/Add'; // Add this import
import { CommunicationItem } from './TenantSummary';  // Import the CommunicationItem component
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'; // Add this import
import AccessTimeIcon from '@mui/icons-material/AccessTime'; // Add this import
import ExtraChargeModal from './ExtraChargeModal';
import { getExtraCharges, deleteExtraCharge, getFlatSummary, updateAdjustmentReferenceMonth } from '../services/api'; // Add this import at the top with other imports
import { DropTarget } from 'react-dnd';
import { useDrop } from 'react-dnd';


const PaymentTable = ({ 
    payments = [], 
    flatDetails,
    setFlatDetails,
    onEditClick, 
    onAddClick, 
    onAction1Click,
    onRentNoticeClick,  
    onRentNoticeWithUtilitiesClick,
    onDeleteCommunication,
    onAdjustmentDrop,
}) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [selectedMonthYear, setSelectedMonthYear] = useState(null); // Add this state
    const { refreshFlatFlag , triggerRefreshFlat } = useRefresh();
    const [openExtraChargeModal, setOpenExtraChargeModal] = useState(false);
    const [extraCharges, setExtraCharges] = useState({});

    console.log(flatDetails,'aaaa')
    const handleMenuClick = (event, paymentData) => {
    
    
        
        if (event?.target) {
            setAnchorEl(event.currentTarget);
            setSelectedPayment(paymentData);
            setSelectedMonthYear(paymentData.month_year);
            console.log('Selected month year:', paymentData.month_year); // Debug log
        }
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedPayment(null); // Clear the selected payment
        setSelectedMonthYear(null);
    };

    const handleAction1 = (payment) => {
        const monthYear = payment.month_year; // Access monthYear directly
        const tenant = flatDetails.name // Adjust based on your data structure

        // Check if the payment is missing
        if (!payment.isPaid) { // Assuming isPaid is a boolean indicating payment status
            const missingPayment = {
                monthYear: monthYear
            }; // Create an object for missing payment info
            onAction1Click(flatDetails, missingPayment); // Call the action handler for missing payment
        } else {
            console.log('Payment is not missing for:', monthYear);
        }
    };


    const handleExtraChargeClick = () => {
        setOpenExtraChargeModal(true);
        handleMenuClose();
    };


    useEffect(() => {
        // This effect runs whenever refreshFlag or payments changes
        console.log('triggerRefreshFlat',refreshFlatFlag)
    }, [refreshFlatFlag, payments]); // Add both dependencies

    // Move fetchExtraCharges outside useEffect and make it a function declaration
    const fetchExtraCharges = async () => {
        try {
            const allExtraCharges = await getExtraCharges(
                flatDetails?.flat?.id,
                flatDetails?.active_tenant?.id
            );
            const chargesByMonth = allExtraCharges.reduce((acc, charge) => {
                const monthKey = charge.reference_month_str;
                if (!acc[monthKey]) {
                    acc[monthKey] = [];
                }
                acc[monthKey].push(charge);
                return acc;
            }, {});
            setExtraCharges(chargesByMonth);
        } catch (error) {
            console.error('Error fetching extra charges:', error);
        }
    };

    useEffect(() => {
        if (flatDetails?.flat?.id && flatDetails?.active_tenant?.id) {
            fetchExtraCharges();
        }
    }, [flatDetails, openExtraChargeModal]);

    const handleDeleteCharge = async (chargeId) => {
        try {
            await deleteExtraCharge(chargeId);
            // Refresh extra charges
            fetchExtraCharges();
            triggerRefreshFlat();
            // Only update flatDetails if setFlatDetails is provided
            if (flatDetails?.flat?.id) {
                const updatedDetails = await getFlatSummary(flatDetails.flat.id);
                console.log('typeof setFlatDetails',typeof setFlatDetails)
                if (typeof setFlatDetails === 'function') {
                    console.log('setting flatdetails',setFlatDetails)
                    setFlatDetails(updatedDetails);
                    console.log('flatDetails',flatDetails)
                }
            }
        } catch (error) {
            console.error('Error deleting extra charge:', error);
        }
    };

    const getStatusDisplay = (data) => {
        if (data.is_upcoming) {
            return {
                label: 'À venir',
                color: '#e3f2fd',
                textColor: '#1976d2',
            };
        }

        if (data.is_paid) {
            // Calculate total expected amount
            const rentAmount = data.payment?.amount || 0;
            const utilitiesAmount = data.payment?.utilities_amount || 0;
            const extraChargesTotal = data.extra_charges?.reduce((sum, charge) => 
                sum + parseFloat(charge.charge_amount), 0) || 0;

            // Get adjustment for this month
            const adjustment = flatDetails?.all_adjustments?.find(adj => 
                adj.reference_month && 
                new Date(adj.reference_month).toISOString().slice(0, 7) === data.payment.payment_month_str
            );

            const adjustmentAmount = adjustment ? 
                parseFloat(adjustment.lift_amount || 0) + 
                parseFloat(adjustment.heating_amount || 0) + 
                parseFloat(adjustment.other_amount || 0) - 
                parseFloat(adjustment.yearly_utilities_paid || 0) : 0;
            
            console.log('adjustment',adjustment)
            console.log('flatDetails',flatDetails)
            console.log('data',data)
            const totalExpected = rentAmount + utilitiesAmount + extraChargesTotal + adjustmentAmount;
            const amountPaid = data.payment?.amount_paid || 0;
            const paymentDate = data.payment?.payment_date ? 
                new Date(data.payment.payment_date).toLocaleDateString('fr-FR') : '';

            // Check if amount_paid is less than total expected
            if (amountPaid < totalExpected) {
                const difference = (totalExpected - amountPaid).toFixed(2);
                return {
                    label: `Payé le ${paymentDate} (reste ${difference} €)`,
                    color: '#fff3e0', // Light orange background
                    textColor: '#ffa726', // Orange text
                };
            }
            // Check if amount_paid is greater than total expected
            if (amountPaid > totalExpected) {
                const difference = (amountPaid - totalExpected).toFixed(2);
                return {
                    label: `Payé le ${paymentDate} (excédent de ${difference} €)`,
                    color: '#e8f5e9', // Light green background
                    textColor: '#2e7d32', // Green text
                };
            }

            return {
                label: `Payé le ${paymentDate}`,
                color: '#e8f5e9',
                textColor: '#2e7d32',
            };
        }

        return {
            label: 'Non payé',
            color: '#ffebee',
            textColor: '#c62828',
        };
    };
    
    const renderExtraCharges = (month_year, extra_charges) => {
        // Get the adjustment for this month
        const adjustment = flatDetails?.all_adjustments?.find(adj => 
            adj.reference_month && 
            new Date(adj.reference_month).toISOString().slice(0, 7) === month_year
        );

        const handleRemoveAdjustment = async (e, adjustmentId) => {
            e.stopPropagation();
            e.preventDefault();
            try {
                await updateAdjustmentReferenceMonth(adjustmentId, null);
                // Refresh flat details
                const updatedDetails = await getFlatSummary(flatDetails?.flat?.id);
                if (typeof setFlatDetails === 'function') {
                    setFlatDetails(updatedDetails);
                }
            } catch (error) {
                console.error('Error removing adjustment reference:', error);
            }
        };

        return (
            <>
                {/* First render extra charges */}
                {extra_charges?.map((charge, index) => (
                    <div key={index} style={{ 
                        color: '#666',
                        fontSize: '0.9em',
                        marginTop: index > 0 ? '4px' : '0',
                        display: 'flex',
                        alignItems: 'center',
                        whiteSpace: 'nowrap'
                    }}>
                        + {charge.charge_amount} € ({charge.charge_type_display})
                        <IconButton 
                            size="small" 
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleDeleteCharge(charge.id);
                            }}
                            sx={{ marginLeft: '8px' }}
                        >
                            <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                    </div>
                ))}

                {/* Then render adjustment if exists */}
                {adjustment && (
                    <div style={{ 
                        color: '#1976d2',
                        fontSize: '0.9em',
                        marginTop: '4px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        whiteSpace: 'nowrap'
                    }}>
                        <span>
                            {adjustment.utilities_balance > 0 ? '+' : ''} 
                            {adjustment.utilities_balance} € (Régularisation {adjustment.reference_year})
                        </span>
                        <IconButton 
                            size="small" 
                            onClick={(e) => handleRemoveAdjustment(e, adjustment.id)}
                            sx={{ 
                                marginLeft: '8px',
                                padding: '2px',
                                '&:hover': { color: 'error.main' }
                            }}
                        >
                            <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                    </div>
                )}
            </>
        );
    };


    const calculateTotalAmount = (payment) => {
        const rentAmount = payment.is_paid ? 
            parseFloat(payment.payment.amount || 0) : 
            parseFloat(flatDetails?.flat?.rent_amount || 0);
        
        const utilitiesAmount = payment.is_paid ? 
            parseFloat(payment.payment.utilities_amount || 0) : 
            parseFloat(flatDetails?.flat?.utilities_amount || 0);
        
        // Calculate extra charges
        const extraChargesTotal = payment.extra_charges?.reduce((sum, charge) => 
            sum + parseFloat(charge.charge_amount), 0) || 0;

        // Get adjustment for this month
        const adjustment = flatDetails?.all_adjustments?.find(adj => 
            adj.reference_month && 
            new Date(adj.reference_month).toISOString().slice(0, 7) === payment.month_year
        );

        const adjustmentAmount = adjustment ? 
            parseFloat(adjustment.lift_amount || 0) + 
            parseFloat(adjustment.heating_amount || 0) + 
            parseFloat(adjustment.other_amount || 0) - 
            parseFloat(adjustment.yearly_utilities_paid || 0) : 0;

        return rentAmount + utilitiesAmount + extraChargesTotal + adjustmentAmount;
    };

    const handleExtraChargeSave = async () => {
        setOpenExtraChargeModal(false);
        // Refresh both flat details and extra charges
        if (flatDetails?.flat?.id) {
            try {
                // Refresh extra charges
                await fetchExtraCharges();
                // Refresh flat details
                const updatedDetails = await getFlatSummary(flatDetails.flat.id);
                if (typeof setFlatDetails === 'function') {
                    setFlatDetails(updatedDetails);
                }
                // Trigger refresh flag
                triggerRefreshFlat();
            } catch (error) {
                console.error('Error refreshing data:', error);
            }
        }
    };

    return (
        <Paper 
            elevation={3} 
            sx={{ 
                p: 2, 
                mb: 2,
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <PaymentIcon sx={{ mr: 1 }} />
                    Historique des loyers
                </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            
            <TableContainer 
                sx={{ 
                    maxHeight: 400,  // Fixed height
                    overflow: 'auto',  // Enable scrolling
                    '&::-webkit-scrollbar': {
                        width: '8px',
                        height: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                        backgroundColor: '#f1f1f1',
                        borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        backgroundColor: '#888',
                        borderRadius: '4px',
                        '&:hover': {
                            backgroundColor: '#555',
                        },
                    },
                }}
            >
                <Table stickyHeader size="small">  {/* Add stickyHeader */}
                    <TableHead>
                        <TableRow>
                            <TableCell>Mois</TableCell>
                            <TableCell>Loyer</TableCell>
                            <TableCell>Charges</TableCell>
                            <TableCell>Extra</TableCell>
                            <TableCell>Total à payer</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Communications</TableCell>
                            <TableCell>Options</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {payments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} style={{ textAlign: 'center' }}>
                                    Aucune donnée de paiement disponible.
                                </TableCell>
                            </TableRow>
                        ) : (
                            payments.map(({ month_year, is_paid, is_upcoming, payment, extra_charges }) => (
                                <PaymentRow key={month_year} month_year={month_year} onAdjustmentDrop={onAdjustmentDrop}>
                                    <TableCell>{new Date(month_year).toLocaleString('default', { month: 'long', year: 'numeric' })}</TableCell>
                                    <TableCell>
                                        <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
                                            {is_paid ? 
                                                `${payment.amount} €` : 
                                                `${flatDetails?.flat?.rent_amount} €`
                                            }
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
                                            {is_paid ? 
                                                `${payment.utilities_amount} €` : 
                                                `${flatDetails?.flat?.utilities_amount} €`
                                            }
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        {renderExtraCharges(month_year, extra_charges)}
                                    </TableCell>
                                    <TableCell>
                                        <Box component="span" sx={{ 
                                            whiteSpace: 'nowrap',
                                            fontWeight: 'bold',
                                            color: 'primary.main'
                                        }}>
                                            {calculateTotalAmount({ month_year, is_paid, is_upcoming, payment, extra_charges }).toFixed(2)} €
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (is_upcoming) {
                                                    return;
                                                }
                                                if (is_paid) {
                                                    onEditClick(month_year, payment);
                                                } else {
                                                    onAddClick(month_year);
                                                }
                                            }}
                                            sx={{
                                                display: 'inline-block',
                                                padding: '6px 12px',
                                                borderRadius: '16px',
                                                backgroundColor: getStatusDisplay({ is_paid, is_upcoming, extra_charges , payment}).color,
                                                color: getStatusDisplay({ is_paid, is_upcoming, extra_charges , payment}).textColor,
                                                fontWeight: 500,
                                                cursor: is_upcoming ? 'default' : 'pointer',
                                                '&:hover': is_upcoming ? {} : {
                                                    opacity: 0.8,
                                                    transform: 'scale(1.02)',
                                                    transition: 'all 0.2s ease-in-out'
                                                }
                                            }}
                                        >
                                            {getStatusDisplay({ is_paid, is_upcoming, extra_charges , payment}).label}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        {flatDetails?.communications?.filter(comm => 
                                            new Date(comm.reference_month_str).getTime() === new Date(month_year).getTime()
                                        ).map((comm, index) => (
                                            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <CommunicationItem
                                                    type={comm.communication_type}
                                                    date={comm.date_sent}
                                                />
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => onDeleteCommunication(comm.id)}
                                                    sx={{ 
                                                        padding: '2px',
                                                        '&:hover': { color: 'error.main' }
                                                    }}
                                                >
                                                    <DeleteOutlineIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        )) || (
                                            <div style={{ 
                                                color: '#666',
                                                fontStyle: 'italic',
                                                padding: '4px'
                                            }}>
                                                Aucune communication
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <IconButton
                                            onClick={(event) => handleMenuClick(event, {
                                                month_year,
                                                is_paid,
                                                payment
                                            })}
                                            size="small"
                                            id={`menu-button-${month_year}`}
                                            aria-controls={Boolean(anchorEl) ? 'payment-menu' : undefined}
                                            aria-haspopup="true"
                                            aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
                                        >
                                            <MoreVertIcon />
                                        </IconButton>
                                    </TableCell>
                                </PaymentRow>

                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Dropdown Menu */}
            <Menu
                id="payment-menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                {/* Only show Relancer for unpaid payments that are not upcoming */}
                {selectedPayment && !selectedPayment.is_paid && !selectedPayment.is_upcoming && (
                    <MenuItem onClick={() => {
                        handleAction1(selectedPayment);
                        handleMenuClose();
                    }}>
                        Relancer
                    </MenuItem>
                )}
                <MenuItem onClick={() => {
                    onRentNoticeClick(selectedPayment?.month_year, false);
                    handleMenuClose();
                }}>
                    Avis d'échéance
                </MenuItem>
                <MenuItem onClick={() => {
                    onRentNoticeWithUtilitiesClick(selectedPayment?.month_year, true);
                    handleMenuClose();
                }}>
                    Avis d'échéance + Rappel de charges
                </MenuItem>
                <MenuItem onClick={handleExtraChargeClick}>
                    Ajouter charge
                </MenuItem>
            </Menu>

            <ExtraChargeModal
                open={openExtraChargeModal}
                onClose={() => setOpenExtraChargeModal(false)}
                tenant={flatDetails?.active_tenant}
                flat={flatDetails?.flat}
                monthYear={selectedPayment?.month_year}
                onSave={handleExtraChargeSave}
            />

        </Paper>
    );
};

const PaymentRow = ({ month_year, onAdjustmentDrop, children }) => {
    const [{ isOver }, drop] = useDrop(() => ({
        accept: 'adjustment',
        drop: (item) => onAdjustmentDrop(item.adjustmentId, month_year),
        collect: monitor => ({
            isOver: !!monitor.isOver(),
        }),
    }));

    return (
        <TableRow 
            ref={drop}
            style={{
                backgroundColor: isOver ? '#e3f2fd' : 'white',
            }}
        >
            {children}
        </TableRow>
    );
};

export default PaymentTable;
