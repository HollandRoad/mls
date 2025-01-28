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
    IconButton,
    Button,
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EuroIcon from '@mui/icons-material/Euro';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { 
    getLandlordExpenses, 
    createLandlordExpense, 
    updateLandlordExpense,
    deleteLandlordExpense 
} from '../services/api';

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
        flat: flat?.id || '',
        receipt: null
    });
    console.log(flat,'flat');
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
            
            console.log('Form Data before submission:', {
                flat: formData.flat,
                expense_type: formData.expense_type,
                amount: formData.amount,
                payment_date: formData.payment_date,
                reference_month: formData.reference_month,
                description: formData.description
            });

            Object.entries({
                flat: formData.flat,
                expense_type: formData.expense_type,
                amount: parseFloat(formData.amount),
                payment_date: formData.payment_date,
                reference_month: `${formData.reference_month}-01`,
                reference_year: parseInt(formData.reference_month.split('-')[0]),
                description: formData.description || ''
            }).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    expenseFormData.append(key, value);
                }
            });

            if (formData.receipt instanceof File) {
                expenseFormData.append('receipt', formData.receipt);
            }

            for (let pair of expenseFormData.entries()) {
                console.log(pair[0], pair[1]);
            }

            if (expense?.id) {
                await updateLandlordExpense(expense.id, expenseFormData);
            } else {
                await createLandlordExpense(expenseFormData);
            }
            onSave();
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
                    <Typography variant="caption" color="textSecondary">
                        Justificatif actuel: {expense.receipt.split('/').pop()}
                    </Typography>
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

const LandlordExpenses = ({ flat }) => {
    const [expenses, setExpenses] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);
    const currentYear = new Date().getFullYear();

    const loadExpenses = async () => {
        try {
            const flatId = flat?.id || flat?.flat?.id;
            if (!flatId) {
                setExpenses([]);
                return;
            }
            
            const data = await getLandlordExpenses(flatId);
            setExpenses(data);
        } catch (error) {
            console.error('Error loading landlord expenses:', error);
            setExpenses([]);
        }
    };

    useEffect(() => {
        if (flat?.id || flat?.flat?.id) {
            loadExpenses();
        }
    }, [flat]);

    const handleAddClick = () => {
        setSelectedExpense(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (expense) => {
        setSelectedExpense(expense);
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (expense) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) {
            try {
                await deleteLandlordExpense(expense.id);
                await loadExpenses();
            } catch (error) {
                console.error('Error deleting expense:', error);
            }
        }
    };

    useEffect(() => {
        console.log('Flat prop:', flat);
    }, [flat]);

    const handleGenerateBordereau = async (year) => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/flat/${flat.id}/bordereau/${year}/`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/pdf',
                    },
                }
            );
            
            if (response.ok) {
                // Create blob from response and download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bordereau_${flat.id}_${year}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } else {
                console.error('Failed to generate bordereau');
            }
        } catch (error) {
            console.error('Error generating bordereau:', error);
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 2, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <EuroIcon sx={{ mr: 1 }} />
                    Dépenses propriétaire
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddClick}
                    size="small"
                >
                    Ajouter
                </Button>
            </Box>

            <Button
                variant="contained"
                startIcon={<ReceiptIcon />}
                onClick={() => handleGenerateBordereau(currentYear)}
                sx={{ mb: 2 }}
            >
                Générer Bordereau
            </Button>

            <TableContainer sx={{ 
                maxHeight: 400,
                overflow: 'auto',
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
            }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Année</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Montant</TableCell>
                            <TableCell>Date de paiement</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {expenses.map((expense) => (
                            <TableRow key={expense.id}>
                                <TableCell>{expense.reference_year}</TableCell>
                                <TableCell>{EXPENSE_TYPES.find(t => t.value === expense.expense_type)?.label}</TableCell>
                                <TableCell>{expense.amount} €</TableCell>
                                <TableCell>
                                    {new Date(expense.payment_date).toLocaleDateString('fr-FR')}
                                </TableCell>
                                <TableCell>{expense.description}</TableCell>
                                <TableCell>
                                    <IconButton size="small" onClick={() => handleEditClick(expense)}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => handleDeleteClick(expense)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {expenses.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    Aucune dépense trouvée
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <ExpenseModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                expense={selectedExpense}
                onSave={loadExpenses}
                flat={flat?.flat || flat || {}}
            />
        </Paper>
    );
};

export default LandlordExpenses; 