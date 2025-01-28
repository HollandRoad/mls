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
    Chip
} from '@mui/material';
import { 
    getFlatSummary, 
    getAllFlats, 
    getAnnualFlatAdjustments, 
    getTenantPaymentHistory,
} from '../../services/api';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Define tableStyles properly
const tableStyles = {
    tableContainer: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        borderRadius: '8px',
        overflow: 'hidden',
    },
    headerRow: {
        backgroundColor: '#f8fafc',
        '& th': {
            fontWeight: 600,
            color: '#334155',
            borderBottom: '2px solid #e2e8f0',
            padding: '16px',
            fontSize: '0.875rem',
            lineHeight: '1.25rem',
            whiteSpace: 'nowrap',
        }
    },
    tableRow: {
        '& td': {
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            fontSize: '0.875rem',
            lineHeight: '1.25rem',
        },
        '&:hover': {
            backgroundColor: '#f8fafc',
        }
    },
    cell: {
        '&.amount': {
            fontFamily: 'monospace',
            fontWeight: 500,
        }
    },
    regularizationBox: {
        backgroundColor: '#ffffff',
        borderRadius: '6px',
        padding: '12px',
        margin: '4px 0',
        fontFamily: 'monospace',
        fontSize: '0.875rem',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0',
    },
    regTitle: {
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '8px',
        marginBottom: '8px',
        fontWeight: 600,
        color: '#334155',
    },
    regRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '4px 0',
        '&.total': {
            borderTop: '1px dashed #e2e8f0',
            borderBottom: '1px dashed #e2e8f0',
            margin: '4px 0',
            padding: '8px 0',
        },
        '&.result': {
            borderTop: '2px solid #e2e8f0',
            marginTop: '8px',
            paddingTop: '8px',
            fontWeight: 600,
        }
    }
};

const renderExtraCharges = (payment, flatDetails) => {
    // Get extra charges
    const extraCharges = payment.extra_charges?.reduce((sum, charge) => 
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

    return extraCharges + adjustmentAmount;
};

const calculateNetTotal = (payment, flatDetails) => {
    if (!payment.is_paid) return 0;

    const amountPaid = parseFloat(payment.payment?.amount_paid || 0);
    const rentAmount = parseFloat(payment.payment?.amount || 0);
    const utilitiesAmount = parseFloat(payment.payment?.utilities_amount || 0);

    // Calculate extra charges
    const extraCharges = payment.extra_charges?.reduce((sum, charge) => 
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

    const totalExpected = rentAmount + utilitiesAmount + extraCharges + adjustmentAmount;
    return amountPaid - totalExpected;
};

const getPaymentStatus = (payment, flatDetails) => {
    if (payment.is_upcoming) {
        return {
            label: 'À venir',
            color: '#1976d2'
        };
    }

    if (payment.is_paid) {
        // Calculate total expected amount
        const rentAmount = parseFloat(payment.payment?.amount || 0);
        const utilitiesAmount = parseFloat(payment.payment?.utilities_amount || 0);
        const extraChargesTotal = payment.extra_charges?.reduce((sum, charge) => 
            sum + parseFloat(charge.charge_amount), 0) || 0;

        // Get adjustment for this month
        const adjustment = flatDetails?.all_adjustments?.find(adj => 
            adj.reference_month && 
            new Date(adj.reference_month).toISOString().slice(0, 7) === payment.month
        );

        const adjustmentAmount = adjustment ? 
            parseFloat(adjustment.lift_amount || 0) + 
            parseFloat(adjustment.heating_amount || 0) + 
            parseFloat(adjustment.other_amount || 0) - 
            parseFloat(adjustment.yearly_utilities_paid || 0) : 0;

        const totalExpected = rentAmount + utilitiesAmount + extraChargesTotal + adjustmentAmount;
        const amountPaid = parseFloat(payment.payment?.amount_paid || 0);

        if (amountPaid < totalExpected) {
            return {
                label: `Reste: ${(totalExpected - amountPaid).toFixed(2)} €`,
                color: '#d32f2f'
            };
        } else if (amountPaid > totalExpected) {
            return {
                label: `Excédent: ${(amountPaid - totalExpected).toFixed(2)} €`,
                color: '#2e7d32'
            };
        }
        return {
            label: 'Payé',
            color: '#2e7d32'
        };
    }

    return {
        label: 'Non payé',
        color: '#d32f2f'
    };
};

const renderAdjustmentDetails = (adjustments) => {
    return adjustments.map(adj => {
        const totalCharges = (
            parseFloat(adj.lift_amount || 0) +
            parseFloat(adj.heating_amount || 0) +
            parseFloat(adj.other_amount || 0)
        );
        const netRegularization = totalCharges - parseFloat(adj.yearly_utilities_paid || 0);

        return (
            <Box key={adj.id} sx={tableStyles.regularizationBox}>
                <Typography sx={tableStyles.regTitle}>
                    Régularisation {adj.reference_year}
                </Typography>
                {adj.yearly_utilities_paid > 0 && (
                    <Box sx={tableStyles.regRow}>
                        <span>Provision {adj.reference_year}:</span>
                        <span className="amount">{Number(adj.yearly_utilities_paid).toFixed(2)}€</span>
                    </Box>
                )}
                {adj.lift_amount > 0 && (
                    <Box sx={tableStyles.regRow}>
                        <span>+ Charge ascenseur {adj.reference_year}:</span>
                        <span className="amount">{Number(adj.lift_amount).toFixed(2)}€</span>
                    </Box>
                )}
                {adj.heating_amount > 0 && (
                    <Box sx={tableStyles.regRow}>
                        <span>+ Charge chauffage {adj.reference_year}:</span>
                        <span className="amount">{Number(adj.heating_amount).toFixed(2)}€</span>
                    </Box>
                )}
                {adj.other_amount > 0 && (
                    <Box sx={tableStyles.regRow}>
                        <span>+ Autres charges {adj.reference_year}:</span>
                        <span className="amount">{Number(adj.other_amount).toFixed(2)}€</span>
                    </Box>
                )}
                <Box sx={{ ...tableStyles.regRow, className: 'total' }}>
                    <span>Total charges {adj.reference_year}:</span>
                    <span className="amount">{Number(totalCharges).toFixed(2)}€</span>
                </Box>
                <Box sx={{ ...tableStyles.regRow, className: 'result' }}>
                    <span>= Régularisation net {adj.reference_year}:</span>
                    <span className="amount" style={{ 
                        color: netRegularization > 0 ? '#C62828' : '#2E7D32' 
                    }}>
                        {Number(netRegularization).toFixed(2)}€
                    </span>
                </Box>
            </Box>
        );
    });
};

const renderStatusBadge = (status) => {
    return (
        <Chip 
            label={status}
            color={status === 'Payé' ? 'success' : 'error'}
            size="small"
        />
    );
};

// Add this function to calculate yearly totals
const calculateYearlyTotals = (monthlyData) => {
    return monthlyData.reduce((totals, month) => {
        if (month.is_paid) {
            // Add rent and utilities from payment
            totals.totalRent += parseFloat(month.payment?.amount || 0);
            totals.totalUtilities += parseFloat(month.payment?.utilities_amount || 0);
            totals.totalPaid += parseFloat(month.payment?.amount_paid || 0);
        }

        // Add extra charges
        const extraTotal = month.extra_charges?.reduce((sum, charge) => 
            sum + parseFloat(charge.charge_amount), 0) || 0;
        totals.totalExtra += extraTotal;

        // Add adjustment if exists
        const adjustment = month.adjustment;
        if (adjustment) {
            const adjustmentAmount = 
                parseFloat(adjustment.lift_amount || 0) + 
                parseFloat(adjustment.heating_amount || 0) + 
                parseFloat(adjustment.other_amount || 0) - 
                parseFloat(adjustment.yearly_utilities_paid || 0);
            totals.totalExtra += adjustmentAmount;
        }

        return totals;
    }, {
        totalRent: 0,
        totalUtilities: 0,
        totalExtra: 0,
        totalPaid: 0
    });
};

const renderExtraDetails = (row, flatDetails) => {
    // Get extra charges
    const extraCharges = row.extra_charges || [];

    // Get adjustment for this month
    const adjustment = flatDetails?.all_adjustments?.find(adj => 
        adj.reference_month && 
        new Date(adj.reference_month).toISOString().slice(0, 7) === row.month
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {/* Render extra charges */}
            {extraCharges.map((charge, index) => (
                <Typography key={index} sx={{ 
                    color: '#666',
                    fontSize: '0.9em',
                    whiteSpace: 'nowrap'
                }}>
                    + {charge.charge_amount} € ({charge.charge_type_display})
                </Typography>
            ))}

            {/* Render adjustment if exists */}
            {adjustment && (
                <Typography sx={{ 
                    color: '#1976d2',
                    fontSize: '0.9em',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap'
                }}>
                    {adjustment.utilities_balance > 0 ? '+' : ''} 
                    {adjustment.utilities_balance} € (Régularisation {adjustment.reference_year})
                </Typography>
            )}

            {/* Show "Aucun" if no extras or adjustments */}
            {(!extraCharges.length && !adjustment) && (
                <Typography sx={{ 
                    color: '#666',
                    fontSize: '0.9em',
                    fontStyle: 'italic'
                }}>
                    Aucun
                </Typography>
            )}
        </Box>
    );
};

const AnnualReport = () => {
    const [flats, setFlats] = useState([]);
    const [selectedFlat, setSelectedFlat] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Create years array once when component mounts
    const [years] = useState(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    });

    useEffect(() => {
        loadFlats();
    }, []);

    const loadFlats = async () => {
        try {
            const flatsData = await getAllFlats();
            setFlats(flatsData);
        } catch (error) {
            console.error('Error loading flats:', error);
        }
    };

    const generateReport = async () => {
        if (!selectedFlat || !selectedYear) return;

        setLoading(true);
        try {
            const flatSummary = await getFlatSummary(selectedFlat);
            const adjustments = await getAnnualFlatAdjustments(selectedFlat);
            
            let paymentHistory = [];
            if (flatSummary.active_tenant?.id) {
                paymentHistory = await getTenantPaymentHistory(flatSummary.active_tenant.id, selectedFlat);
            }

            // Filter payment history for selected year
            const yearPayments = paymentHistory.filter(payment => 
                payment.month_year.startsWith(selectedYear.toString())
            );

            // Generate monthly data
            const monthlyData = Array.from({ length: 12 }, (_, index) => {
                const month = index + 1;
                const monthStr = `${selectedYear}-${month.toString().padStart(2, '0')}`;
                
                // Find payment data for this month
                const paymentData = yearPayments.find(p => p.month_year === monthStr);

                // Get extra charges for this month
                const extraCharges = flatSummary.extra_charges?.[monthStr] || [];
                const extraChargesTotal = extraCharges.reduce((sum, charge) => 
                    sum + parseFloat(charge.charge_amount), 0) || 0;

                // Get adjustment for this month
                const adjustment = flatSummary.all_adjustments?.find(adj => 
                    adj.reference_month && 
                    new Date(adj.reference_month).toISOString().slice(0, 7) === monthStr
                );

                const adjustmentAmount = adjustment ? 
                    parseFloat(adjustment.lift_amount || 0) + 
                    parseFloat(adjustment.heating_amount || 0) + 
                    parseFloat(adjustment.other_amount || 0) - 
                    parseFloat(adjustment.yearly_utilities_paid || 0) : 0;

                // Calculate net total
                const amountPaid = paymentData?.payment?.amount_paid || 0;
                const expectedAmount = paymentData?.payment?.amount || 0;
                const utilitiesAmount = paymentData?.payment?.utilities_amount || 0;
                const totalExtra = extraChargesTotal + adjustmentAmount;
                const netTotal = paymentData?.is_paid ? 
                    amountPaid - (expectedAmount + utilitiesAmount + totalExtra) : 0;

                return {
                    month: monthStr,
                    tenant: flatSummary.active_tenant?.name || 'Vacant',
                    is_paid: paymentData?.is_paid || false,
                    payment: paymentData?.payment,
                    extra_charges: extraCharges,
                    adjustment: adjustment,
                    net_total: netTotal,
                    payment_status: paymentData?.is_paid ? 
                        netTotal > 0 ? `Excédent: ${netTotal.toFixed(2)} €` :
                        netTotal < 0 ? `Reste: ${Math.abs(netTotal).toFixed(2)} €` :
                        'Payé' : 'Non payé'
                };
            });

            setReportData({
                flatInfo: flatSummary,
                monthlyData,
            });

        } catch (error) {
            console.error('Error generating report:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateMonthTotal = (rent, utilities, adjustments) => {
        const baseAmount = parseFloat(rent || 0) + parseFloat(utilities || 0);
        
        const adjustmentsTotal = adjustments.reduce((sum, adj) => {
            const totalCharges = (
                parseFloat(adj.lift_amount || 0) +
                parseFloat(adj.heating_amount || 0) +
                parseFloat(adj.other_amount || 0)
            );
            const netAdjustment = totalCharges - parseFloat(adj.yearly_utilities_paid || 0);
            return sum + netAdjustment;
        }, 0);

        return Number(baseAmount + adjustmentsTotal).toFixed(2);
    };

    const exportToExcel = () => {
        if (!reportData) return;
        
        const excelData = reportData.monthlyData.map(row => ({
            'Mois': row.month,
            'Locataire': row.tenant,
            'Loyer': Number(row.rent).toFixed(2),
            'Charges': Number(row.utilities).toFixed(2),
            'Régularisations': row.adjustments.map(adj => {
                const items = [];
                const totalCharges = (
                    parseFloat(adj.lift_amount || 0) +
                    parseFloat(adj.heating_amount || 0) +
                    parseFloat(adj.other_amount || 0)
                );
                const netRegularization = totalCharges - parseFloat(adj.yearly_utilities_paid || 0);

                if (adj.yearly_utilities_paid > 0) {
                    items.push(`Provision ${adj.reference_year}: ${Number(adj.yearly_utilities_paid).toFixed(2)}€`);
                }
                if (adj.lift_amount > 0) {
                    items.push(`+ Charge ascenseur ${adj.reference_year}: ${Number(adj.lift_amount).toFixed(2)}€`);
                }
                if (adj.heating_amount > 0) {
                    items.push(`+ Charge chauffage ${adj.reference_year}: ${Number(adj.heating_amount).toFixed(2)}€`);
                }
                if (adj.other_amount > 0) {
                    items.push(`+ Autres charges ${adj.reference_year}: ${Number(adj.other_amount).toFixed(2)}€`);
                }
                items.push(`Total charges ${adj.reference_year}: ${Number(totalCharges).toFixed(2)}€`);
                items.push(`= Régularisation net ${adj.reference_year}: ${Number(netRegularization).toFixed(2)}€`);
                
                return items.join('\n');
            }).join('\n\n'),
            'Total': row.total,
            'Statut': row.payment_status
        }));
        
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        
        // Set column widths
        worksheet['!cols'] = [
            { wch: 12 }, // Mois
            { wch: 20 }, // Locataire
            { wch: 12 }, // Loyer
            { wch: 12 }, // Charges
            { wch: 50 }, // Régularisations
            { wch: 12 }, // Total
            { wch: 12 }, // Statut
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, "Rapport Annuel");
        XLSX.writeFile(workbook, `Rapport_Annuel_${reportData.flatInfo.flat.flat_name}_${selectedYear}.xlsx`);
    };

    const exportToPdf = () => {
        if (!reportData) return;
        
        const doc = new jsPDF('landscape');
        
        // Add title
        doc.setFontSize(20);
        doc.text(`Rapport Annuel ${selectedYear}`, 14, 15);
        
        // Add flat information section
        doc.setFontSize(14);
        doc.text('Information Appartement', 14, 25);
        
        doc.setFontSize(10);
        const flatInfo = [
            `Appartement: ${reportData.flatInfo.flat.flat_name}`,
            `Propriétaire: ${reportData.flatInfo.landlord?.name || 'N/A'}`,
            `Gérant: ${reportData.flatInfo.building_manager?.name || 'N/A'}`,
            `Locataire Actuel: ${reportData.flatInfo.active_tenant?.name || 'Vacant'}`
        ];
        
        flatInfo.forEach((line, index) => {
            doc.text(line, 14, 35 + (index * 6));
        });

        // Add monthly table
        doc.autoTable({
            startY: 60,
            head: [[
                'Mois',
                'Locataire',
                'Loyer',
                'Charges',
                'Régularisations',
                'Total',
                'Statut'
            ]],
            body: reportData.monthlyData.map(row => [
                row.month,
                row.tenant,
                `${Number(row.rent).toFixed(2)}€`,
                `${Number(row.utilities).toFixed(2)}€`,
                row.adjustments.map(adj => {
                    const items = [];
                    const totalCharges = (
                        parseFloat(adj.lift_amount || 0) +
                        parseFloat(adj.heating_amount || 0) +
                        parseFloat(adj.other_amount || 0)
                    );
                    const netRegularization = totalCharges - parseFloat(adj.yearly_utilities_paid || 0);

                    items.push(`Régularisation ${adj.reference_year}`);
                    
                    if (adj.yearly_utilities_paid > 0) {
                        items.push(`Provision ${adj.reference_year}: ${Number(adj.yearly_utilities_paid).toFixed(2)}€`);
                    }
                    if (adj.lift_amount > 0) {
                        items.push(`+ Charge ascenseur ${adj.reference_year}: ${Number(adj.lift_amount).toFixed(2)}€`);
                    }
                    if (adj.heating_amount > 0) {
                        items.push(`+ Charge chauffage ${adj.reference_year}: ${Number(adj.heating_amount).toFixed(2)}€`);
                    }
                    if (adj.other_amount > 0) {
                        items.push(`+ Autres charges ${adj.reference_year}: ${Number(adj.other_amount).toFixed(2)}€`);
                    }
                    items.push(`Total charges ${adj.reference_year}: ${Number(totalCharges).toFixed(2)}€`);
                    items.push(`= Régularisation net ${adj.reference_year}: ${Number(netRegularization).toFixed(2)}€`);
                    
                    return items.join('\n');
                }).join('\n\n'),
                `${row.total}€`,
                row.payment_status
            ]),
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 2,
            },
            columnStyles: {
                0: { cellWidth: 20 }, // Mois
                1: { cellWidth: 30 }, // Locataire
                2: { cellWidth: 20 }, // Loyer
                3: { cellWidth: 20 }, // Charges
                4: { cellWidth: 60 }, // Régularisations
                5: { cellWidth: 20 }, // Total
                6: { cellWidth: 20 }, // Statut
            },
            didDrawCell: (data) => {
                // Color the status cell based on payment status
                if (data.column.index === 6 && data.cell.text) {
                    const isPaid = data.cell.text[0] === 'Payé';
                    data.cell.styles.textColor = isPaid ? '#2E7D32' : '#C62828';
                }
            }
        });

        // Add yearly summary section
        const finalY = doc.lastAutoTable.finalY + 20;
        
        doc.setFontSize(14);
        doc.text('Résumé Annuel', 14, finalY);
        
        doc.setFontSize(10);
        const summaryInfo = [
            `Total Loyers: ${Number(reportData.yearlyTotals.totalRent).toFixed(2)}€`,
            `Total Charges: ${Number(reportData.yearlyTotals.totalUtilities).toFixed(2)}€`,
            `Total Régularisations: ${Number(reportData.yearlyTotals.totalAdjustments).toFixed(2)}€`,
            `Statut Paiements: ${reportData.yearlyTotals.paidMonths} mois payés / ${reportData.yearlyTotals.unpaidMonths} mois impayés`
        ];
        
        summaryInfo.forEach((line, index) => {
            doc.text(line, 14, finalY + 10 + (index * 6));
        });

        // Calculate grand total
        const grandTotal = (
            reportData.yearlyTotals.totalRent +
            reportData.yearlyTotals.totalUtilities +
            reportData.yearlyTotals.totalAdjustments
        ).toFixed(2);

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Total Annuel: ${grandTotal}€`, 14, finalY + 40);

        // Add generation date at the bottom
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text(
            `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
            doc.internal.pageSize.width - 60,
            doc.internal.pageSize.height - 10
        );

        // Save the PDF
        doc.save(`Rapport_Annuel_${reportData.flatInfo.flat.flat_name}_${selectedYear}.pdf`);
    };

    // ... Add helper functions (getPaymentStatus, renderStatusBadge, etc.) from QuarterlyReport

    // ... Add export functions (exportToExcel, exportToPdf) similar to QuarterlyReport

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Rapport Annuel
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                        <InputLabel>Appartement</InputLabel>
                        <Select
                            value={selectedFlat}
                            label="Appartement"
                            onChange={(e) => setSelectedFlat(e.target.value)}
                        >
                            {flats.map(flat => (
                                <MenuItem key={flat.id} value={flat.id}>
                                    {flat.flat_name}
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
                        disabled={loading || !selectedFlat || !selectedYear}
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
                    {/* Flat Summary Section */}
                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Information Appartement
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                                <Typography variant="subtitle2">Propriétaire</Typography>
                                <Typography>{reportData.flatInfo.landlord?.name || 'N/A'}</Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Typography variant="subtitle2">Gérant</Typography>
                                <Typography>{reportData.flatInfo.building_manager?.name || 'N/A'}</Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Typography variant="subtitle2">Locataire Actuel</Typography>
                                <Typography>{reportData.flatInfo.active_tenant?.name || 'Vacant'}</Typography>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Monthly Details Table */}
                    <TableContainer component={Paper} sx={tableStyles.tableContainer}>
                        <Table>
                            <TableHead>
                                <TableRow sx={tableStyles.headerRow}>
                                    <TableCell>Mois</TableCell>
                                    <TableCell>Locataire</TableCell>
                                    <TableCell align="right">Loyer</TableCell>
                                    <TableCell align="right">Charges</TableCell>
                                    <TableCell align="right">Extra</TableCell>
                                    <TableCell align="right">Montant payé</TableCell>
                                    <TableCell>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reportData.monthlyData.map((row, index) => (
                                    <TableRow key={index} sx={tableStyles.tableRow}>
                                        <TableCell>{row.month}</TableCell>
                                        <TableCell>{row.tenant}</TableCell>
                                        <TableCell align="right" sx={tableStyles.cell} className="amount">
                                            {row.is_paid ? 
                                                `${Number(row.payment?.amount || 0).toFixed(2)}€` : 
                                                '-'
                                            }
                                        </TableCell>
                                        <TableCell align="right" sx={tableStyles.cell} className="amount">
                                            {row.is_paid ? 
                                                `${Number(row.payment?.utilities_amount || 0).toFixed(2)}€` : 
                                                '-'
                                            }
                                        </TableCell>
                                        <TableCell align="right">
                                            {renderExtraDetails(row, reportData.flatInfo)}
                                        </TableCell>
                                        <TableCell align="right" sx={tableStyles.cell} className="amount">
                                            {row.is_paid ? 
                                                `${Number(row.payment?.amount_paid || 0).toFixed(2)}€` : 
                                                '-'
                                            }
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{
                                                color: getPaymentStatus(row, reportData.flatInfo).color,
                                                fontWeight: 'bold'
                                            }}>
                                                {getPaymentStatus(row, reportData.flatInfo).label}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Yearly Summary Section */}
                    {(() => {
                        const yearlyTotals = calculateYearlyTotals(reportData.monthlyData);
                        return (
                            <Paper sx={{ p: 2, mt: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Résumé Annuel
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={2}>
                                        <Typography variant="subtitle2">Total Loyers</Typography>
                                        <Typography>{Number(yearlyTotals.totalRent).toFixed(2)}€</Typography>
                                    </Grid>
                                    <Grid item xs={12} md={2}>
                                        <Typography variant="subtitle2">Total Charges</Typography>
                                        <Typography>{Number(yearlyTotals.totalUtilities).toFixed(2)}€</Typography>
                                    </Grid>
                                    <Grid item xs={12} md={2}>
                                        <Typography variant="subtitle2">Total Extra</Typography>
                                        <Typography>{Number(yearlyTotals.totalExtra).toFixed(2)}€</Typography>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <Typography variant="subtitle2">Total Payé</Typography>
                                        <Typography>{Number(yearlyTotals.totalPaid).toFixed(2)}€</Typography>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <Typography variant="subtitle2">Balance</Typography>
                                        <Typography sx={{ 
                                            color: yearlyTotals.totalPaid - (yearlyTotals.totalRent + yearlyTotals.totalUtilities + yearlyTotals.totalExtra) >= 0 
                                                ? 'success.main' 
                                                : 'error.main',
                                            fontWeight: 'bold'
                                        }}>
                                            {Number(yearlyTotals.totalPaid - (yearlyTotals.totalRent + yearlyTotals.totalUtilities + yearlyTotals.totalExtra)).toFixed(2)}€
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Paper>
                        );
                    })()}
                </>
            )}
        </Box>
    );
};

export default AnnualReport; 