import React, { useState, useEffect } from 'react';
import {
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Divider,
    IconButton
} from '@mui/material';
import { getAllFlats, getLandlordExpenses, API_URL } from '../services/api';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import CommentIcon from '@mui/icons-material/Comment';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import Chart from 'chart.js/auto';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

const EXPENSE_TYPES = [
    { value: 'property_tax', label: 'Taxe Foncière' },
    { value: 'works', label: 'Travaux' },
    { value: 'plumbing', label: 'Plomberie' },
    { value: 'condo_fees', label: 'Charges de Copropriété' },
    { value: 'insurance', label: 'Assurance' },
    { value: 'other', label: 'Autres' }
];

const LandlordExpensesReport = () => {
    const [flats, setFlats] = useState([]);
    const [selectedFlat, setSelectedFlat] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [expenses, setExpenses] = useState([]);
    const [yearlyTotals, setYearlyTotals] = useState({});
    const currentYear = new Date().getFullYear();

    useEffect(() => {
        const loadFlats = async () => {
            try {
                const data = await getAllFlats();
                console.log('allflats',data);
                setFlats(data);
            } catch (error) {
                console.error('Error loading flats:', error);
            }
        };
        loadFlats();
    }, []);
    console.log('   ',selectedFlat);
    useEffect(() => {
        const loadExpenses = async () => {
            if (selectedFlat) {
                try {
                    const data = await getLandlordExpenses(selectedFlat.id);
                    setExpenses(data);
                    
                    // Calculate yearly totals
                    const totals = data.reduce((acc, expense) => {
                        const year = expense.reference_year;
                        const amount = parseFloat(expense.amount) || 0; // Ensure amount is a number
                        
                        if (!acc[year]) {
                            acc[year] = {
                                total: 0,
                                byType: {}
                            };
                        }
                        acc[year].total = (acc[year].total || 0) + amount;
                        
                        if (!acc[year].byType[expense.expense_type]) {
                            acc[year].byType[expense.expense_type] = 0;
                        }
                        acc[year].byType[expense.expense_type] = 
                            (acc[year].byType[expense.expense_type] || 0) + amount;
                        
                        return acc;
                    }, {});
                    setYearlyTotals(totals);
                } catch (error) {
                    console.error('Error loading expenses:', error);
                }
            }
        };
        loadExpenses();
    }, [selectedFlat]);

    const getChartData = (byType) => {
        const labels = [];
        const data = [];
        const colors = [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40'
        ];

        Object.entries(byType).forEach(([type, amount]) => {
            const label = EXPENSE_TYPES.find(t => t.value === type)?.label || type;
            labels.push(label);
            data.push(parseFloat(amount));
        });

        return {
            labels,
            datasets: [{
                data,
                backgroundColor: colors.slice(0, data.length),
                borderWidth: 1
            }]
        };
    };

    const getAvailableYears = () => {
        const years = new Set();
        expenses.forEach(expense => {
            years.add(expense.reference_year);
        });
        return Array.from(years).sort((a, b) => b - a);
    };

    const handleExportPDF = async () => {
        try {
            const response = await fetch(
                `${API_URL}landlord-expenses/export-pdf/${selectedFlat.id}/${selectedYear}/`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': '*/*'
                    }
                }
            );
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `depenses_${selectedFlat.flat_name}_${selectedYear}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Erreur lors de la génération du PDF');
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                            <AccountBalanceIcon sx={{ mr: 1 }} />
                            Dépenses Propriétaire
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Sélectionner un appartement</InputLabel>
                            <Select
                                value={selectedFlat}
                                onChange={(e) => setSelectedFlat(e.target.value)}
                                label="Sélectionner un appartement"
                            >
                                {flats.map((flat) => (
                                    <MenuItem key={flat.id} value={flat}>
                                        {flat.flat_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <FormControl fullWidth>
                            <InputLabel>Année</InputLabel>
                            <Select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                label="Année"
                            >
                                {getAvailableYears().map((year) => (
                                    <MenuItem key={year} value={year}>
                                        {year}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={1}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<FileDownloadIcon />}
                            onClick={handleExportPDF}
                            disabled={!selectedFlat || !selectedYear}
                            fullWidth
                            sx={{ height: '56px' }}  // Match height with selectors
                        >
                            PDF
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {selectedFlat && yearlyTotals[selectedYear] && (
                <>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <HomeIcon sx={{ mr: 1 }} />
                                        Informations de l'appartement
                                    </Typography>
                                    <Box sx={{ pl: 2 }}>
                                        <Typography variant="body1" gutterBottom>
                                            <strong>Adresse:</strong> {selectedFlat.address}
                                        </Typography>
                                        <Typography variant="body1" gutterBottom>
                                            <strong>Ville:</strong> {selectedFlat.postal_code} {selectedFlat.city}
                                        </Typography>
                                        <Typography variant="body1" gutterBottom>
                                            <strong>Loyer:</strong> {selectedFlat.rent_amount}€
                                        </Typography>
                                    </Box>
                                </Grid>
                                
                                <Grid item xs={12} md={6}>
                                    <Typography variant="h6" gutterBottom align="center">
                                        Année {selectedYear} - Total: {(parseFloat(yearlyTotals[selectedYear].total) || 0).toFixed(2)}€
                                    </Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                        <Box sx={{ width: '300px', height: '300px' }}>
                                            <Doughnut
                                                data={getChartData(yearlyTotals[selectedYear].byType)}
                                                options={{
                                                    plugins: {
                                                        legend: {
                                                            position: 'bottom',
                                                            labels: {
                                                                boxWidth: 15,
                                                                padding: 15,
                                                                generateLabels: (chart) => {
                                                                    const datasets = chart.data.datasets[0];
                                                                    return chart.data.labels.map((label, i) => ({
                                                                        text: `${label} (${datasets.data[i].toFixed(2)}€)`,
                                                                        fillStyle: datasets.backgroundColor[i],
                                                                        index: i
                                                                    }));
                                                                }
                                                            }
                                                        },
                                                        tooltip: {
                                                            callbacks: {
                                                                label: (context) => {
                                                                    const value = context.raw;
                                                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                                                    const percentage = ((value / total) * 100).toFixed(1);
                                                                    return `${context.label}: ${value.toFixed(2)}€ (${percentage}%)`;
                                                                }
                                                            }
                                                        },
                                                        datalabels: {
                                                            color: '#fff',
                                                            font: {
                                                                weight: 'bold',
                                                                size: 11
                                                            },
                                                            formatter: (value) => `${value.toFixed(0)}€`
                                                        }
                                                    },
                                                    cutout: '60%'
                                                }}
                                            />
                                        </Box>
                                    </Box>
                                </Grid>
                                
                                {selectedFlat.landlord_comments && (
                                    <Grid item xs={12}>
                                        <Divider sx={{ my: 2 }} />
                                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                            <CommentIcon sx={{ mr: 1 }} />
                                            Commentaires
                                        </Typography>
                                        <Box sx={{ 
                                            pl: 2, 
                                            p: 2, 
                                            bgcolor: '#f5f5f5', 
                                            borderRadius: 1,
                                            border: '1px solid #e0e0e0'
                                        }}>
                                            <Typography variant="body1">
                                                {selectedFlat.landlord_comments}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                )}
                            </Grid>
                        </CardContent>
                    </Card>

                    <Paper sx={{ p: 3, mb: 3 }}>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Montant</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {expenses
                                        .filter(expense => expense.reference_year === selectedYear)
                                        .map((expense) => (
                                            <TableRow key={expense.id}>
                                                <TableCell>
                                                    {EXPENSE_TYPES.find(t => t.value === expense.expense_type)?.label}
                                                    {expense.description && (
                                                        <Typography 
                                                            variant="body2" 
                                                            color="textSecondary" 
                                                            sx={{ fontStyle: 'italic' }}
                                                        >
                                                            ({expense.description})
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(expense.payment_date).toLocaleDateString('fr-FR')}
                                                </TableCell>
                                                <TableCell>{(parseFloat(expense.amount) || 0).toFixed(2)}€</TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}
        </Box>
    );
};

export default LandlordExpensesReport; 