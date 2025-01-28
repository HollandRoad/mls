import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Paper,
    Box,
} from '@mui/material';
import { addPayment, getFlatSummary } from '../services/api';
import Draggable from 'react-draggable';

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

const AddPaymentModal = ({ monthYear, open, onClose, flatDetails, setFlatDetails , onSave }) => {
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [amountPaid, setAmountPaid] = useState('');
    const [monthYearState, setMonthYearState] = useState(monthYear || new Date().toISOString().slice(0, 7));

    useEffect(() => {
        setMonthYearState(monthYear || new Date().toISOString().slice(0, 7));
    }, [monthYear]);

    useEffect(() => {
        if (!monthYear) return;

        const currentDate = new Date();
        const [year, month] = monthYear.split('-').map(Number);
        const paymentDate = new Date(year, month - 1);
        
        if (paymentDate > currentDate) {
            onClose();
            return;
        }
        
        if (open && flatDetails?.flat) {
            const total = calculateTotal();
            setAmountPaid(total.toString());
        }
    }, [open]);

    const calculateTotal = () => {
        if (!flatDetails?.flat) return 0;
        
        const rentAmount = flatDetails.flat.rent_amount || 0;
        const utilitiesAmount = flatDetails.flat.utilities_amount || 0;
        
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
            tenant: flatDetails?.active_tenant?.id,
            flat: flatDetails?.flat?.id,
            amount: flatDetails?.flat?.rent_amount,
            utilities_amount: flatDetails?.flat?.utilities_amount,
            amount_paid: parseFloat(amountPaid),
            payment_date: paymentDate,
            payment_type: 'loyer',
            payment_month: monthYearState,
        };

        try {
            await addPayment(paymentData);
            if (typeof onSave === 'function') {
                await onSave({ refreshFlatDetails: true });
            }
            onClose();
        } catch (error) {
            console.error('Error adding payment:', error);
        }
    };

    const renderSummary = () => {
        if (!flatDetails?.flat) return null;

        const rentAmount = flatDetails.flat.rent_amount || 0;
        const utilitiesAmount = flatDetails.flat.utilities_amount || 0;
        
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
                    <Typography>{rentAmount} €</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Charges</Typography>
                    <Typography>{utilitiesAmount} €</Typography>
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

    const renderAmountDifferenceWarning = () => {
        const expectedTotal = calculateTotal();
        const currentAmount = parseFloat(amountPaid);

        if (currentAmount && expectedTotal && currentAmount !== expectedTotal) {
            const difference = currentAmount - expectedTotal;
            const color = difference < 0 ? '#d32f2f' : '#2e7d32'; // Red for less, green for more
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

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            PaperComponent={PaperComponent}
            aria-labelledby="draggable-dialog-title"
        >
            <DialogTitle 
                style={{ cursor: 'move' }} 
                id="draggable-dialog-title"
            >
                Ajouter un Paiement
            </DialogTitle>
            <DialogContent>
                {flatDetails && (
                    <>
                        <TextField
                            label="Locataire"
                            value={flatDetails?.active_tenant?.name || ''}
                            InputProps={{ readOnly: true }}
                            fullWidth
                            margin="normal"
                            disabled
                        />
                        <TextField
                            label="Appartement"
                            value={flatDetails?.flat?.flat_name || ''}
                            InputProps={{ readOnly: true }}
                            fullWidth
                            margin="normal"
                            disabled
                        />
                    </>
                )}

                {renderSummary()}

                <TextField
                    label="Montant payé"
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    fullWidth
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                />
                {renderAmountDifferenceWarning()}

                <TextField
                    label="Date de Paiement"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    fullWidth
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Annuler</Button>
                <Button variant="contained" color="primary" onClick={handleSave}>
                    Ajouter le Paiement
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddPaymentModal;
