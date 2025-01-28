import React, { useState, useEffect } from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    CircularProgress,
    Grid,
    Divider
} from '@mui/material';
import { 
    getLandlords,
    getFlatSummary,
    getFlatAdjustments,
    getTenantPaymentHistory,
    getLandlordDetails,
} from '../../services/api';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const tableStyles = {
    // ... copy tableStyles from AnnualReport ...
};

const LandlordTaxReport = () => {
    const [landlords, setLandlords] = useState([]);
    const [selectedLandlord, setSelectedLandlord] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Create years array once when component mounts
    const [years] = useState(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    });

    useEffect(() => {
        loadLandlords();
    }, []);

    const loadLandlords = async () => {
        try {
            console.log('Fetching landlords...');
            const landlordsData = await getLandlords();
            console.log('Full landlords response:', landlordsData);
            if (Array.isArray(landlordsData)) {
                setLandlords(landlordsData);
            } else {
                console.error('Landlords data is not an array:', landlordsData);
            }
        } catch (error) {
            console.error('Error loading landlords:', error);
        }
    };

    const generateReport = async () => {
        if (!selectedLandlord || !selectedYear) {
            console.log('Please select both landlord and year');
            return;
        }

        setLoading(true);
        try {
            // Get detailed landlord information including flats
            const landlordDetails = await getLandlordDetails(selectedLandlord);
            console.log('Landlord details:', landlordDetails);
            
            if (!landlordDetails) {
                throw new Error('Landlord not found');
            }

            // Initialize flats array
            const landlordFlats = landlordDetails.flats || [];
            console.log('Landlord flats:', landlordFlats);

            if (landlordFlats.length === 0) {
                setReportData({
                    landlord: landlordDetails,
                    flats: [],
                    totals: {
                        total_rent: 0,
                        total_utilities: 0,
                        total_adjustments: 0,
                        grand_total: 0
                    }
                });
                return;
            }

            const flatsData = [];

            // Process each flat owned by the landlord
            for (const flat of landlordFlats) {
                console.log(`Processing flat: ${flat.id}`);
                
                try {
                    const flatSummary = await getFlatSummary(flat.id);
                    const adjustments = await getFlatAdjustments(flat.id);
                    console.log('Flat summary:', flatSummary);
                    console.log('Adjustments:', adjustments);

                    // Initialize annual totals
                    let annualRent = 0;
                    let annualUtilities = 0;
                    let annualAdjustments = 0;

                    // Get tenants for the selected year
                    const tenants = flatSummary.tenants?.filter(tenant => {
                        const startDate = new Date(tenant.start_date);
                        const endDate = tenant.end_date ? new Date(tenant.end_date) : new Date();
                        const startYear = startDate.getFullYear();
                        const endYear = endDate.getFullYear();
                        
                        return startYear <= selectedYear && endYear >= selectedYear;
                    }) || [];

                    console.log('Filtered tenants:', tenants);

                    // Process each tenant's payments
                    for (const tenant of tenants) {
                        const paymentHistory = await getTenantPaymentHistory(tenant.id, flat.id);
                        console.log('Payment history:', paymentHistory);
                        
                        const yearPayments = paymentHistory.filter(payment => {
                            const paymentDate = new Date(payment.month_year);
                            return paymentDate.getFullYear() === selectedYear;
                        });

                        yearPayments.forEach(payment => {
                            if (payment.is_paid) {
                                annualRent += parseFloat(payment.rent || 0);
                                annualUtilities += parseFloat(payment.utilities || 0);
                            }
                        });
                    }

                    // Calculate adjustments for the year
                    const yearAdjustments = adjustments.filter(adj => {
                        const adjDate = new Date(adj.date);
                        return adjDate.getFullYear() === selectedYear;
                    });

                    yearAdjustments.forEach(adj => {
                        annualAdjustments += (
                            parseFloat(adj.lift_amount || 0) +
                            parseFloat(adj.heating_amount || 0) +
                            parseFloat(adj.other_amount || 0) -
                            parseFloat(adj.yearly_utilities_paid || 0)
                        );
                    });

                    flatsData.push({
                        flat_name: flat.flat_name,
                        address: flat.address,
                        city: flat.city,
                        annual_rent: annualRent,
                        annual_utilities: annualUtilities,
                        annual_adjustments: annualAdjustments,
                        total_income: annualRent + annualUtilities + annualAdjustments
                    });

                } catch (error) {
                    console.error(`Error processing flat ${flat.id}:`, error);
                    // Continue processing other flats even if one fails
                    continue;
                }
            }

            console.log('Final flats data:', flatsData);

            // Calculate totals
            const totals = flatsData.reduce((acc, flat) => ({
                total_rent: acc.total_rent + flat.annual_rent,
                total_utilities: acc.total_utilities + flat.annual_utilities,
                total_adjustments: acc.total_adjustments + flat.annual_adjustments,
                grand_total: acc.grand_total + flat.total_income
            }), {
                total_rent: 0,
                total_utilities: 0,
                total_adjustments: 0,
                grand_total: 0
            });

            setReportData({
                landlord: landlordDetails,
                flats: flatsData,
                totals
            });

        } catch (error) {
            console.error('Error generating report:', error);
            // Set empty report data with landlord info
            setReportData({
                landlord: landlords.find(l => l.id === selectedLandlord),
                flats: [],
                totals: {
                    total_rent: 0,
                    total_utilities: 0,
                    total_adjustments: 0,
                    grand_total: 0
                }
            });
        } finally {
            setLoading(false);
        }
    };

    const exportToPdf = () => {
        const doc = new jsPDF();
        
        // Add landlord info
        doc.text(`Rapport Fiscal ${selectedYear} - ${reportData.landlord.name}`, 14, 15);
        
        // Add table
        doc.autoTable({
            head: [['Appartement', 'Adresse', 'Loyers', 'Charges', 'Régularisations', 'Total']],
            body: reportData.flats.map(flat => [
                flat.flat_name,
                `${flat.address}, ${flat.city}`,
                `${flat.annual_rent.toFixed(2)}€`,
                `${flat.annual_utilities.toFixed(2)}€`,
                `${flat.annual_adjustments.toFixed(2)}€`,
                `${flat.total_income.toFixed(2)}€`
            ]),
            startY: 25
        });

        doc.save(`rapport_fiscal_${reportData.landlord.name}_${selectedYear}.pdf`);
    };

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(reportData.flats.map(flat => ({
            'Appartement': flat.flat_name,
            'Adresse': `${flat.address}, ${flat.city}`,
            'Loyers': flat.annual_rent,
            'Charges': flat.annual_utilities,
            'Régularisations': flat.annual_adjustments,
            'Total': flat.total_income
        })));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Rapport Fiscal');
        XLSX.writeFile(workbook, `rapport_fiscal_${reportData.landlord.name}_${selectedYear}.xlsx`);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Rapport Fiscal
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                        <InputLabel>Propriétaire</InputLabel>
                        <Select
                            value={selectedLandlord}
                            label="Propriétaire"
                            onChange={(e) => setSelectedLandlord(e.target.value)}
                        >
                            {landlords.map(landlord => (
                                <MenuItem key={landlord.id} value={landlord.id}>
                                    {landlord.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                        <InputLabel>Année</InputLabel>
                        <Select
                            value={selectedYear}
                            label="Année"
                            onChange={(e) => setSelectedYear(e.target.value)}
                        >
                            {years.map(year => (
                                <MenuItem key={year} value={year}>
                                    {year}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item xs={12} md={2}>
                    <Button
                        variant="contained"
                        onClick={generateReport}
                        disabled={loading || !selectedLandlord || !selectedYear}
                        fullWidth
                    >
                        Générer
                    </Button>
                </Grid>

                {reportData && (
                    <>
                        <Grid item xs={6} md={1}>
                            <Button
                                variant="outlined"
                                startIcon={<FileDownloadIcon />}
                                onClick={exportToExcel}
                                fullWidth
                            >
                                Excel
                            </Button>
                        </Grid>

                        <Grid item xs={6} md={1}>
                            <Button
                                variant="outlined"
                                startIcon={<PictureAsPdfIcon />}
                                onClick={exportToPdf}
                                fullWidth
                            >
                                PDF
                            </Button>
                        </Grid>
                    </>
                )}
            </Grid>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <CircularProgress />
                </Box>
            ) : reportData && (
                <>
                    {/* Landlord Information */}
                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Information Propriétaire
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={3}>
                                <Typography variant="subtitle2">Nom</Typography>
                                <Typography>{reportData.landlord.name}</Typography>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Typography variant="subtitle2">Adresse</Typography>
                                <Typography>{reportData.landlord.address}</Typography>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Typography variant="subtitle2">Ville</Typography>
                                <Typography>{reportData.landlord.city}</Typography>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Typography variant="subtitle2">Code Postal</Typography>
                                <Typography>{reportData.landlord.post_code}</Typography>
                            </Grid>
                        </Grid>
                    </Paper>

                    {reportData.flats.length === 0 ? (
                        <Paper sx={{ p: 2, mb: 3 }}>
                            <Typography variant="subtitle1" color="text.secondary" align="center">
                                Aucun appartement trouvé pour ce propriétaire
                            </Typography>
                        </Paper>
                    ) : (
                        <>
                            {/* Properties Table */}
                            <TableContainer component={Paper} sx={tableStyles.tableContainer}>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={tableStyles.headerRow}>
                                            <TableCell>Appartement</TableCell>
                                            <TableCell>Adresse</TableCell>
                                            <TableCell align="right">Loyers Annuels</TableCell>
                                            <TableCell align="right">Charges Annuelles</TableCell>
                                            <TableCell align="right">Régularisations</TableCell>
                                            <TableCell align="right">Total</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {reportData.flats.map((flat, index) => (
                                            <TableRow key={index} sx={tableStyles.tableRow}>
                                                <TableCell>{flat.flat_name}</TableCell>
                                                <TableCell>{`${flat.address}, ${flat.city}`}</TableCell>
                                                <TableCell align="right" className="amount">
                                                    {Number(flat.annual_rent).toFixed(2)}€
                                                </TableCell>
                                                <TableCell align="right" className="amount">
                                                    {Number(flat.annual_utilities).toFixed(2)}€
                                                </TableCell>
                                                <TableCell align="right" className="amount">
                                                    {Number(flat.annual_adjustments).toFixed(2)}€
                                                </TableCell>
                                                <TableCell align="right" className="amount">
                                                    {Number(flat.total_income).toFixed(2)}€
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Annual Summary */}
                            <Paper sx={{ p: 2, mt: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Résumé Annuel {selectedYear}
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={3}>
                                        <Typography variant="subtitle2">Total Loyers</Typography>
                                        <Typography className="amount">
                                            {Number(reportData.totals.total_rent).toFixed(2)}€
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <Typography variant="subtitle2">Total Charges</Typography>
                                        <Typography className="amount">
                                            {Number(reportData.totals.total_utilities).toFixed(2)}€
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <Typography variant="subtitle2">Total Régularisations</Typography>
                                        <Typography className="amount">
                                            {Number(reportData.totals.total_adjustments).toFixed(2)}€
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <Typography variant="subtitle2">Total Général</Typography>
                                        <Typography className="amount" sx={{ fontWeight: 'bold' }}>
                                            {Number(reportData.totals.grand_total).toFixed(2)}€
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </>
                    )}
                </>
            )}
        </Box>
    );
};

export default LandlordTaxReport; 