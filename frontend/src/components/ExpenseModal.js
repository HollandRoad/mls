import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Typography
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const EXPENSE_TYPES = [
    { value: 'property_tax', label: 'Taxe Foncière' },
    { value: 'works', label: 'Travaux' },
    { value: 'plumbing', label: 'Plomberie' },
    { value: 'condo_fees', label: 'Charges de Copropriété' },
    { value: 'insurance', label: 'Assurance' },
    { value: 'other', label: 'Autres' }
];

const ExpenseModal = ({ open, onClose, expense, onSave, flat }) => {
    const [formData, setFormData] = useState({
        expense_type: 'other',
        amount: '',
        payment_date: '',
        reference_year: new Date().getFullYear(),
        reference_month: new Date().toISOString().slice(0, 7),
        description: '',
        flat: '',
        receipt: null
    });

    useEffect(() => {
        if (expense) {
            setFormData({
                ...expense,
                reference_month: expense.reference_month_str || new Date().toISOString().slice(0, 7),
                flat: flat?.id || ''
            });
        } else {
            setFormData(prev => ({
                ...prev,
                flat: flat?.id || '',
                reference_month: new Date().toISOString().slice(0, 7),
            }));
        }
    }, [expense, flat]);

    const handleFileChange = (event) => {
        setFormData({
            ...formData,
            receipt: event.target.files[0]
        });
    };

    const handleSubmit = async () => {
        try {
            if (!formData.flat) {
                alert('L\'appartement est requis');
                return;
            }
            if (!formData.expense_type) {
                alert('Le type de dépense est requis');
                return;
            }
            if (!formData.amount || formData.amount <= 0) {
                alert('Le montant doit être supérieur à 0');
                return;
            }
            if (!formData.payment_date) {
                alert('La date de paiement est requise');
                return;
            }
            if (!formData.reference_month) {
                alert('Le mois de référence est requis');
                return;
            }

            const expenseFormData = new FormData();
            
            expenseFormData.append('flat', formData.flat);
            expenseFormData.append('expense_type', formData.expense_type);
            expenseFormData.append('amount', parseFloat(formData.amount));
            expenseFormData.append('description', formData.description);
            expenseFormData.append('payment_date', formData.payment_date);
            expenseFormData.append('reference_month', `${formData.reference_month}-01`);
            expenseFormData.append('reference_year', formData.reference_month.split('-')[0]);
            if (formData.description) {
                expenseFormData.append('description', formData.description);
            }

            if (formData.receipt instanceof File) {
                expenseFormData.append('receipt', formData.receipt);
            }

            await onSave(expenseFormData);
            onClose();
        } catch (error) {
            console.error('Error saving expense:', error);
            alert('Erreur lors de l\'enregistrement de la dépense');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {expense ? 'Modifier la dépense' : 'Ajouter une dépense'}
            </DialogTitle>
            <DialogContent>
                <FormControl fullWidth margin="normal">
                    <InputLabel>Type de dépense</InputLabel>
                    <Select
                        value={formData.expense_type}
                        onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
                        label="Type de dépense"
                    >
                        {EXPENSE_TYPES.map(type => (
                            <MenuItem key={type.value} value={type.value}>
                                {type.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <TextField
                    fullWidth
                    margin="normal"
                    label="Montant"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />

                <TextField
                    fullWidth
                    margin="normal"
                    label="Date de paiement"
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                />

                <TextField
                    fullWidth
                    margin="normal"
                    label="Mois de référence"
                    type="month"
                    value={formData.reference_month}
                    onChange={(e) => setFormData({ ...formData, reference_month: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                />

                <TextField
                    fullWidth
                    margin="normal"
                    label="Description"
                    multiline
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />

                <Box sx={{ mt: 2, mb: 2 }}>
                    <input
                        accept="image/*,.pdf"
                        style={{ display: 'none' }}
                        id="receipt-file"
                        type="file"
                        onChange={handleFileChange}
                    />
                    <label htmlFor="receipt-file">
                        <Button
                            variant="outlined"
                            component="span"
                            startIcon={<CloudUploadIcon />}
                            fullWidth
                        >
                            {formData.receipt ? formData.receipt.name : 'Télécharger un justificatif'}
                        </Button>
                    </label>
                </Box>

                {expense?.receipt && (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                            Justificatif actuel: {expense.receipt.split('/').pop()}
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Annuler</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary">
                    {expense ? 'Modifier' : 'Ajouter'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ExpenseModal; 