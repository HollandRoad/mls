import React, { useState, useEffect } from 'react';
import {
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    TextField,
    Button,
    MenuItem,
    Paper,
    InputAdornment,
    IconButton,
} from '@mui/material';
import { addPayment, updatePayment, deletePayment } from '../services/api'; // Ensure API functions are imported
import Draggable from 'react-draggable';
import EditIcon from '@mui/icons-material/Edit';

// Add this function for the draggable paper component
function PaperComponent(props) {
    return (
        <Draggable
            handle="#draggable-dialog-title"
            cancel={'[class*="MuiDialogContent-root"]'}
        >
            <Paper {...props} />
        </Draggable>
    );
}
const PaymentModal = ({ open, onClose, selectedPayment, flatDetails, onSave, monthYear }) => {
    
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [utilities, setUtilities] = useState('');
    const [amountPaid, setAmountPaid] = useState('');
    const [paymentType, setPaymentType] = useState('loyer');
    const [monthYearState, setMonthYearState] = useState(monthYear || new Date().toISOString().slice(0, 7));
    const [showEditableFields, setShowEditableFields] = useState(false);


    useEffect(() => {
        if (selectedPayment?.is_upcoming) {
            onClose();
            return;
        }
        
        if (selectedPayment) {
            setAmount(selectedPayment.amount);
            setUtilities(selectedPayment.utilities_amount);
            setAmountPaid(selectedPayment.amount_paid || selectedPayment.amount);
            setPaymentType(selectedPayment.payment_type || 'loyer');
            setPaymentDate(selectedPayment.payment_date);
            setMonthYearState(selectedPayment.payment_month_str || monthYear);
        } else if (flatDetails?.flat) {  // Add safety check
            setAmount(flatDetails?.flat.rent_amount || '');
            setUtilities(flatDetails?.flat.utilities_amount || '');
        }
    }, [selectedPayment, flatDetails]);

    useEffect(() => {
        if (open && flatDetails?.flat?.flat?.rent_amount) {
            setAmount(flatDetails.flat.flat.rent_amount);
            setUtilities(flatDetails.flat.flat.utilities_amount || 0);
        }
    }, [open, flatDetails]);

    const calculateTotal = () => {
        if (!flatDetails?.flat) return 0;
        
        // Use the current editable values
        const rentAmount = parseFloat(amount) || 0;
        const utilitiesAmount = parseFloat(utilities) || 0;
        
        // Get extra charges for this month
        const extraCharges = flatDetails.extra_charges?.[monthYear]?.reduce((sum, charge) => 
            sum + parseFloat(charge.charge_amount), 0) || 0;

        // Get adjustment for this month
        const adjustment = flatDetails?.all_adjustments?.find(adj => 
            adj.reference_month && 
            new Date(adj.reference_month).toISOString().slice(0, 7) === monthYear
        );

        const adjustmentAmount = adjustment ? 
            parseFloat(adjustment.lift_amount || 0) + 
            parseFloat(adjustment.heating_amount || 0) + 
            parseFloat(adjustment.other_amount || 0) - 
            parseFloat(adjustment.yearly_utilities_paid || 0) : 0;

        return rentAmount + utilitiesAmount + extraCharges + adjustmentAmount;
    };

    const handleSave = async () => {
        const paymentData = {
            amount,
            payment_date: paymentDate,
            utilities_amount: utilities,
            amount_paid: parseFloat(amountPaid),
            payment_type: paymentType,
            payment_month: monthYearState,
        };

        try {
            if (selectedPayment) {
                await updatePayment(selectedPayment.id, paymentData);
            } else {
                await addPayment(flatDetails.flat.id, paymentData);
            }
            await onSave(); // Just call onSave without parameters
            onClose();
        } catch (error) {
            console.error('Error saving payment:', error);
        }
    };

    const handleDelete = async () => {
        try {
            if (selectedPayment) {

                await deletePayment(selectedPayment.id); // Call the delete function with the payment ID
                onSave(); // Refresh the payment list after deletion
                onClose(); // Close the modal after deleting
            }
        } catch (error) {
            console.error('Error deleting payment:', error);
        }
    };

    const renderAmountDifferenceWarning = () => {
        const expectedTotal = calculateTotal();
        const currentAmount = parseFloat(amountPaid);

        if (currentAmount && expectedTotal && currentAmount !== expectedTotal) {
            const difference = currentAmount - expectedTotal;
            const color = difference < 0 ? '#d32f2f' : '#2e7d32';
            return (
                <Typography 
                    variant="body2" 
                    sx={{ 
                        color: color,
                        mt: 1,
                        fontStyle: 'italic'
                    }}
                >
                    {difference < 0 ? 
                        `Montant inférieur de ${Math.abs(difference).toFixed(2)} €` : 
                        `Montant supérieur de ${difference.toFixed(2)} €`
                    }
                </Typography>
            );
        }
        return null;
    };

    const renderSummary = () => {
        if (!flatDetails?.flat) return null;

        // Use different variable names to avoid conflict with state variables
        const currentRentAmount = amount || 0;
        const currentUtilitiesAmount = utilities || 0;
        
        // Get extra charges
        const extraCharges = flatDetails.extra_charges?.[monthYear] || [];

        // Get adjustment for this month
        const adjustment = flatDetails?.all_adjustments?.find(adj => 
            adj.reference_month && 
            new Date(adj.reference_month).toISOString().slice(0, 7) === monthYear
        );

        return (
            <Paper elevation={2} sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
                <Typography variant="h6" gutterBottom>Résumé du paiement</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Loyer</Typography>
                    <Typography>{parseFloat(currentRentAmount).toFixed(2)} €</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Charges</Typography>
                    <Typography>{parseFloat(currentUtilitiesAmount).toFixed(2)} €</Typography>
                </Box>
                {extraCharges.map((charge, index) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>
                            {charge.charge_type === 'autre' ? charge.description : charge.charge_type_display}
                        </Typography>
                        <Typography>{charge.charge_amount} €</Typography>
                    </Box>
                ))}
                {adjustment && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography sx={{ color: '#1976d2' }}>
                            Régularisation {adjustment.reference_year}
                        </Typography>
                        <Typography sx={{ color: '#1976d2' }}>
                            {(
                                parseFloat(adjustment.lift_amount || 0) + 
                                parseFloat(adjustment.heating_amount || 0) + 
                                parseFloat(adjustment.other_amount || 0) - 
                                parseFloat(adjustment.yearly_utilities_paid || 0)
                            ).toFixed(2)} €
                        </Typography>
                    </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '1px solid #ddd' }}>
                    <Typography variant="h6">Total attendu</Typography>
                    <Typography variant="h6">{calculateTotal()} €</Typography>
                </Box>
            </Paper>
        );
    };

    console.log('selectedPayment', selectedPayment)
    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            PaperComponent={PaperComponent}
            aria-labelledby="draggable-dialog-title"
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle 
                style={{ cursor: 'move' }} 
                id="draggable-dialog-title"
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {selectedPayment ? 'Modifier le Paiement' : 'Ajouter un Paiement'}
                    <IconButton 
                        size="small" 
                        onClick={() => setShowEditableFields(!showEditableFields)}
                        sx={{ ml: 2 }}
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {showEditableFields ? (
                        <>
                            <TextField
                                label="Loyer"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">€</InputAdornment>,
                                }}
                                fullWidth
                            />
                            <TextField
                                label="Charges"
                                type="number"
                                value={utilities}
                                onChange={(e) => setUtilities(e.target.value)}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">€</InputAdornment>,
                                }}
                                fullWidth
                            />
                        </>
                    ) : null}
                    {renderSummary()}
                    <TextField
                        label="Montant payé"
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">€</InputAdornment>,
                        }}
                        fullWidth
                    />
                    {renderAmountDifferenceWarning()}
                    <TextField
                        label="Date de paiement"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        fullWidth
                        InputLabelProps={{
                            shrink: true,
                        }}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Annuler</Button>
                {selectedPayment && (
                    <Button variant="contained" color="secondary" onClick={handleDelete}>
                        Supprimer
                    </Button>
                )}
                <Button variant="contained" color="primary" onClick={handleSave}>
                    {selectedPayment ? 'Mettre à jour' : 'Ajouter'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PaymentModal;
