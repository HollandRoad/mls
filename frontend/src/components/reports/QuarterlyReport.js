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
    getFlatAdjustments, 
    getTenantPaymentHistory,
    getLandlords,
    getManagers
} from '../../services/api';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

const FLAT_COLORS = [
    '#F5F5F5', // Light Grey
    '#F0F8FF', // Alice Blue
    '#F0FFF0', // Honeydew
    '#FFF0F5', // Lavender Blush
    '#FFFFF0', // Light Yellow
    '#F0FFFF', // Light Cyan
    '#FFF5EE', // Seashell
    '#F8F8FF', // Ghost White
];

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
    tableRow: (color) => ({
        backgroundColor: color,
        '&:hover': {
            backgroundColor: color ? `${color}dd` : 'inherit',
        },
        '& td': {
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            fontSize: '0.875rem',
            lineHeight: '1.25rem',
        }
    }),
    subtotalRow: {
        backgroundColor: '#f8fafc',
        borderTop: '2px solid #e2e8f0',
        fontWeight: 600,
        '& td': {
            padding: '16px',
            color: '#334155',
            fontSize: '0.875rem',
            lineHeight: '1.25rem',
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

const QuarterlyReport = () => {
    const [flats, setFlats] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedQuarter, setSelectedQuarter] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [landlords, setLandlords] = useState([]);
    const [managers, setManagers] = useState([]);
    const [selectedLandlord, setSelectedLandlord] = useState('');
    const [selectedManager, setSelectedManager] = useState('');
    const [flatColors, setFlatColors] = useState({});

    const quarters = [
        { value: '1', label: '1er Trimestre (Janvier - Mars)' },
        { value: '2', label: '2ème Trimestre (Avril - Juin)' },
        { value: '3', label: '3ème Trimestre (Juillet - Septembre)' },
        { value: '4', label: '4ème Trimestre (Octobre - Décembre)' }
    ];

    // Create years array once when component mounts
    const [years] = useState(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    });

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const [flatsData, landlordsData, managersData] = await Promise.all([
                getAllFlats(),
                getLandlords(),
                getManagers()
            ]);
            setFlats(flatsData);
            setLandlords(landlordsData);
            setManagers(managersData);
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    };

    const generateReport = async () => {
        if (!selectedQuarter || !selectedYear) return;

        setLoading(true);
        try {
            const quarterMonths = getQuarterMonths(selectedQuarter, selectedYear);
            const reportData = [];

            // Get filtered flats directly from the API
            const filteredFlats = await getAllFlats({
                landlord: selectedLandlord || undefined,
                manager: selectedManager || undefined
            });

            // Create a map of flat names to colors
            const uniqueFlats = [...new Set(filteredFlats.map(flat => flat.flat_name))];
            const newFlatColors = {};
            uniqueFlats.forEach((flat, index) => {
                newFlatColors[flat] = FLAT_COLORS[index % FLAT_COLORS.length];
            });
            setFlatColors(newFlatColors);

            for (const flat of filteredFlats) {
                const flatSummary = await getFlatSummary(flat.id);
                const adjustments = await getFlatAdjustments(flat.id, flatSummary.active_tenant?.id);
                const paymentHistory = flatSummary.active_tenant ? 
                    await getTenantPaymentHistory(flatSummary.active_tenant.id, flat.id) : [];

                for (const month of quarterMonths) {
                    const monthData = {
                        flat_name: flat.flat_name,
                        tenant_name: flatSummary.active_tenant?.name || 'Vacant',
                        landlord_name: flatSummary.landlord?.name || 'N/A',
                        month: month,
                        rent: flat.rent_amount,
                        utilities: flat.utilities_amount,
                        adjustments: getAdjustmentsForMonth(adjustments, month),
                        payment_status: getPaymentStatus(paymentHistory, month),
                        total: calculateTotal(flat, adjustments, month)
                    };
                    reportData.push(monthData);
                }
            }

            setReportData(reportData);
        } catch (error) {
            console.error('Error generating report:', error);
        } finally {
            setLoading(false);
        }
    };

    const getQuarterMonths = (quarter, year) => {
        const startMonth = (parseInt(quarter) - 1) * 3;
        return Array.from({ length: 3 }, (_, i) => {
            const month = startMonth + i + 1;
            return `${year}-${month.toString().padStart(2, '0')}`;
        });
    };

    const getAdjustmentsForMonth = (adjustments, month) => {
        const [year, monthStr] = month.split('-');
        const currentYear = parseInt(year);
        const currentMonth = parseInt(monthStr);
        
        // Filter adjustments that have a payment date in the current month/year
        return adjustments.filter(adj => {
            if (adj.payment_date) {
                const paymentDate = new Date(adj.payment_date);
                return paymentDate.getFullYear() === currentYear && 
                       (paymentDate.getMonth() + 1) === currentMonth;
            }
            return false;
        });
    };

    const getPaymentStatus = (paymentHistory, month) => {
        const payment = paymentHistory.find(p => p.month_year === month);
        return payment?.is_paid ? 'Payé' : 'Non payé';
    };

    const calculateTotal = (flat, adjustments, month) => {
        const monthAdjustments = getAdjustmentsForMonth(adjustments, month);
        const baseAmount = parseFloat(flat.rent_amount || 0) + parseFloat(flat.utilities_amount || 0);
        
        // Calculate adjustments total and subtract provisions
        const adjustmentsTotal = monthAdjustments.reduce((sum, adj) => {
            // Calculate total charges
            const chargesTotal = (
                parseFloat(adj.lift_amount || 0) +
                parseFloat(adj.heating_amount || 0) +
                parseFloat(adj.other_amount || 0)
            );
            
            // Subtract the provision (yearly_utilities_paid) from the charges
            const netAdjustment = chargesTotal - parseFloat(adj.yearly_utilities_paid || 0);
            
            return sum + netAdjustment;
        }, 0);

        return Number(baseAmount + adjustmentsTotal).toFixed(2);
    };

    const renderStatusBadge = (status) => {
        const isPaid = status === 'Payé';
        return (
            <Chip
                label={status}
                size="small"
                sx={{
                    backgroundColor: isPaid ? '#E8F5E9' : '#FFEBEE',
                    color: isPaid ? '#2E7D32' : '#C62828',
                    fontWeight: 500,
                    '& .MuiChip-label': {
                        px: 2,
                    },
                }}
            />
        );
    };

    const renderTableRow = (row, index) => (
        <TableRow 
            key={index}
            sx={tableStyles.tableRow(flatColors[row.flat_name])}
        >
            <TableCell>{row.flat_name}</TableCell>
            <TableCell>{row.tenant_name}</TableCell>
            <TableCell>{row.landlord_name}</TableCell>
            <TableCell>{row.month}</TableCell>
            <TableCell align="right" sx={tableStyles.cell} className="amount">
                {Number(row.rent).toFixed(2)}€
            </TableCell>
            <TableCell align="right" sx={tableStyles.cell} className="amount">
                {Number(row.utilities).toFixed(2)}€
            </TableCell>
            <TableCell align="right">
                {row.adjustments.map(adj => {
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
                                    <span>- Charge ascenseur {adj.reference_year}:</span>
                                    <span className="amount">{Number(adj.lift_amount).toFixed(2)}€</span>
                                </Box>
                            )}
                            {adj.heating_amount > 0 && (
                                <Box sx={tableStyles.regRow}>
                                    <span>- Charge chauffage {adj.reference_year}:</span>
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
                })}
            </TableCell>
            <TableCell align="right" sx={tableStyles.cell} className="amount">
                {Number(row.total).toFixed(2)}€
            </TableCell>
            <TableCell>{renderStatusBadge(row.payment_status)}</TableCell>
        </TableRow>
    );

    const calculateFlatSubtotals = (flatData) => {
        return flatData.reduce((acc, row) => {
            const amount = parseFloat(row.total);
            if (row.payment_status === 'Payé') {
                acc.paid += amount;
            } else {
                acc.unpaid += amount;
            }
            return acc;
        }, { paid: 0, unpaid: 0 });
    };

    const renderSubtotalRow = (flatData) => {
        const subtotals = calculateFlatSubtotals(flatData);
        const total = subtotals.paid + subtotals.unpaid;
        
        return (
            <TableRow sx={tableStyles.subtotalRow}>
                <TableCell colSpan={7}>
                    Sous-total pour {flatData[0].flat_name}
                </TableCell>
                <TableCell align="right" className="amount">
                    {Number(total).toFixed(2)}€
                </TableCell>
                <TableCell>
                    {subtotals.paid > 0 && subtotals.unpaid > 0 && (
                        <Box sx={{ fontSize: '0.875rem' }}>
                            <div style={{ color: '#2E7D32', marginBottom: '4px' }}>
                                Payé: {Number(subtotals.paid).toFixed(2)}€
                            </div>
                            <div style={{ color: '#C62828' }}>
                                Non payé: {Number(subtotals.unpaid).toFixed(2)}€
                            </div>
                        </Box>
                    )}
                    {subtotals.paid > 0 && subtotals.unpaid === 0 && (
                        <Box sx={{ fontSize: '0.875rem', color: '#2E7D32' }}>
                            Tout payé
                        </Box>
                    )}
                    {subtotals.paid === 0 && subtotals.unpaid > 0 && (
                        <Box sx={{ fontSize: '0.875rem', color: '#C62828' }}>
                            Rien payé
                        </Box>
                    )}
                </TableCell>
            </TableRow>
        );
    };

    const renderTableContent = () => {
        // Group data by flat
        const groupedData = reportData.reduce((acc, row) => {
            if (!acc[row.flat_name]) {
                acc[row.flat_name] = [];
            }
            acc[row.flat_name].push(row);
            return acc;
        }, {});

        // Render rows with subtotals
        return Object.entries(groupedData).map(([flatName, flatData]) => (
            <React.Fragment key={flatName}>
                {flatData.map((row, index) => renderTableRow(row, index))}
                {renderSubtotalRow(flatData)}
            </React.Fragment>
        ));
    };

    const exportToExcel = () => {
        const filename = `Rapport_Trimestriel_Q${selectedQuarter}_${selectedYear}.xlsx`;
        
        // Group data by flat
        const groupedData = reportData.reduce((acc, row) => {
            if (!acc[row.flat_name]) {
                acc[row.flat_name] = [];
            }
            acc[row.flat_name].push(row);
            return acc;
        }, {});

        // Create Excel data with subtotals
        const excelData = [];
        Object.entries(groupedData).forEach(([flatName, flatData]) => {
            // Add flat data
            flatData.forEach(row => {
                excelData.push({
                    'Appartement': row.flat_name,
                    'Locataire': row.tenant_name,
                    'Propriétaire': row.landlord_name,
                    'Mois': row.month,
                    'Loyer (€)': Number(row.rent).toFixed(2),
                    'Charges (€)': Number(row.utilities).toFixed(2),
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
                            items.push(`- Charge ascenseur ${adj.reference_year}: ${Number(adj.lift_amount).toFixed(2)}€`);
                        }
                        if (adj.heating_amount > 0) {
                            items.push(`- Charge chauffage ${adj.reference_year}: ${Number(adj.heating_amount).toFixed(2)}€`);
                        }
                        if (adj.other_amount > 0) {
                            items.push(`- Autres charges ${adj.reference_year}: ${Number(adj.other_amount).toFixed(2)}€`);
                        }
                        items.push(`Total charges ${adj.reference_year}: ${Number(totalCharges).toFixed(2)}€`);
                        items.push(`= Régularisation net ${adj.reference_year}: ${Number(netRegularization).toFixed(2)}€`);
                        
                        return items.join('\n');
                    }).join('\n\n'),
                    'Total (€)': Number(row.total).toFixed(2),
                    'Statut': row.payment_status
                });
            });

            // Add subtotal row with breakdown in the Status column
            const subtotals = calculateFlatSubtotals(flatData);
            const total = subtotals.paid + subtotals.unpaid;
            
            let statusText = '';
            if (subtotals.paid > 0 && subtotals.unpaid > 0) {
                statusText = `Payé: ${Number(subtotals.paid).toFixed(2)}€\nNon payé: ${Number(subtotals.unpaid).toFixed(2)}€`;
            } else if (subtotals.paid > 0) {
                statusText = 'Tout payé';
            } else if (subtotals.unpaid > 0) {
                statusText = 'Rien payé';
            }

            excelData.push({
                'Appartement': `Sous-total pour ${flatName}`,
                'Locataire': '',
                'Propriétaire': '',
                'Mois': '',
                'Loyer (€)': '',
                'Charges (€)': '',
                'Régularisations': '',
                'Total (€)': Number(total).toFixed(2),
                'Statut': statusText
            });
        });

        const ws = XLSX.utils.json_to_sheet(excelData);

        // Add cell styling
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r + 1; R <= range.e.r; R++) {
            const row = excelData[R - 1];
            
            // Check if this is a subtotal row
            const isSubtotal = row['Appartement'].startsWith('Sous-total');
            
            for (let C = range.s.c; C <= range.e.c; C++) {
                const cell_ref = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cell_ref]) ws[cell_ref] = {};
                
                if (isSubtotal) {
                    // Subtotal row styling
                    ws[cell_ref].s = {
                        font: { bold: true },
                        fill: {
                            fgColor: { rgb: 'FAFAFA' },
                            patternType: 'solid',
                        },
                        border: {
                            top: { style: 'medium' }
                        }
                    };
                } else {
                    // Regular row styling
                    const color = flatColors[row['Appartement']];
                    ws[cell_ref].s = {
                        fill: {
                            fgColor: { rgb: color?.replace('#', '') },
                            patternType: 'solid',
                        }
                    };

                    // Status column styling
                    if (C === range.e.c && row['Statut']) {
                        const isPaid = row['Statut'] === 'Payé';
                        ws[cell_ref].s = {
                            font: {
                                color: { rgb: isPaid ? '2E7D32' : 'C62828' },
                                bold: true,
                            },
                            fill: {
                                fgColor: { rgb: isPaid ? 'E8F5E9' : 'FFEBEE' },
                                patternType: 'solid',
                            }
                        };
                    }
                }
            }
        }

        // Set column widths
        const colWidths = [
            { wch: 15 }, // Appartement
            { wch: 20 }, // Locataire
            { wch: 20 }, // Propriétaire
            { wch: 10 }, // Mois
            { wch: 12 }, // Loyer
            { wch: 12 }, // Charges
            { wch: 30 }, // Régularisations
            { wch: 12 }, // Total
            { wch: 10 }, // Statut
        ];
        ws['!cols'] = colWidths;

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Rapport');

        // Save file
        XLSX.writeFile(wb, filename);
    };

    const exportToPdf = () => {
        const doc = new jsPDF('landscape');
        
        // Add title
        doc.setFontSize(16);
        doc.text(`Rapport Trimestriel - ${quarters.find(q => q.value === selectedQuarter)?.label} ${selectedYear}`, 14, 15);
        
        // Group data by flat
        const groupedData = reportData.reduce((acc, row) => {
            if (!acc[row.flat_name]) {
                acc[row.flat_name] = [];
            }
            acc[row.flat_name].push(row);
            return acc;
        }, {});

        let yOffset = 25;
        
        Object.entries(groupedData).forEach(([flatName, flatData]) => {
            // Add flat name as section header
            doc.setFontSize(12);
            doc.text(flatName, 14, yOffset);
            yOffset += 7;

            // Prepare table data
            const tableData = flatData.map(row => {
                const adjustmentsText = row.adjustments.map(adj => {
                    const items = [];
                    const totalCharges = (
                        parseFloat(adj.lift_amount || 0) +
                        parseFloat(adj.heating_amount || 0) +
                        parseFloat(adj.other_amount || 0)
                    );
                    const netRegularization = totalCharges - parseFloat(adj.yearly_utilities_paid || 0);

                    if (adj.lift_amount > 0) items.push(`Asc. ${adj.reference_year}: ${Number(adj.lift_amount).toFixed(2)}€`);
                    if (adj.heating_amount > 0) items.push(`Chauf. ${adj.reference_year}: ${Number(adj.heating_amount).toFixed(2)}€`);
                    if (adj.other_amount > 0) items.push(`Autres ${adj.reference_year}: ${Number(adj.other_amount).toFixed(2)}€`);
                    if (adj.yearly_utilities_paid > 0) items.push(`Prov. ${adj.reference_year}: -${Number(adj.yearly_utilities_paid).toFixed(2)}€`);
                    items.push(`Net ${adj.reference_year}: ${Number(netRegularization).toFixed(2)}€`);
                    
                    return items.join('\n');
                }).join('\n\n');

                return [
                    row.tenant_name,
                    row.month,
                    `${Number(row.rent).toFixed(2)}€`,
                    `${Number(row.utilities).toFixed(2)}€`,
                    adjustmentsText,
                    `${Number(row.total).toFixed(2)}€`,
                    row.payment_status
                ];
            });

            // Add subtotal row
            const subtotals = calculateFlatSubtotals(flatData);
            const total = subtotals.paid + subtotals.unpaid;
            let statusText = '';
            if (subtotals.paid > 0 && subtotals.unpaid > 0) {
                statusText = `Payé: ${Number(subtotals.paid).toFixed(2)}€\nNon payé: ${Number(subtotals.unpaid).toFixed(2)}€`;
            } else if (subtotals.paid > 0) {
                statusText = 'Tout payé';
            } else if (subtotals.unpaid > 0) {
                statusText = 'Rien payé';
            }

            tableData.push([
                'SOUS-TOTAL',
                '',
                '',
                '',
                '',
                `${Number(total).toFixed(2)}€`,
                statusText
            ]);

            // Generate table
            doc.autoTable({
                startY: yOffset,
                head: [[
                    'Locataire',
                    'Mois',
                    'Loyer',
                    'Charges',
                    'Régularisations',
                    'Total',
                    'Statut'
                ]],
                body: tableData,
                theme: 'grid',
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                },
                columnStyles: {
                    0: { cellWidth: 30 }, // Locataire
                    1: { cellWidth: 20 }, // Mois
                    2: { cellWidth: 20 }, // Loyer
                    3: { cellWidth: 20 }, // Charges
                    4: { cellWidth: 60 }, // Régularisations
                    5: { cellWidth: 20 }, // Total
                    6: { cellWidth: 30 }, // Statut
                },
                didDrawCell: (data) => {
                    // Color the status cell based on payment status
                    if (data.column.index === 6 && data.cell.text) {
                        const isPaid = data.cell.text.includes('Payé') || data.cell.text.includes('Tout payé');
                        data.cell.styles.textColor = isPaid ? '#2E7D32' : '#C62828';
                    }
                },
                didParseCell: (data) => {
                    // Make the subtotal row bold
                    if (data.row.cells[0].text === 'SOUS-TOTAL') {
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            });

            yOffset = doc.lastAutoTable.finalY + 15;

            // Add page break if needed
            if (yOffset > doc.internal.pageSize.height - 20) {
                doc.addPage();
                yOffset = 20;
            }
        });

        // Save the PDF
        doc.save(`Rapport_Trimestriel_Q${selectedQuarter}_${selectedYear}.pdf`);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Rapport Trimestriel
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                        <InputLabel>Trimestre</InputLabel>
                        <Select
                            value={selectedQuarter}
                            label="Trimestre"
                            onChange={(e) => setSelectedQuarter(e.target.value)}
                        >
                            {quarters.map(quarter => (
                                <MenuItem key={quarter.value} value={quarter.value}>
                                    {quarter.label}
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

                <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                        <InputLabel>Propriétaire</InputLabel>
                        <Select
                            value={selectedLandlord}
                            label="Propriétaire"
                            onChange={(e) => setSelectedLandlord(e.target.value)}
                        >
                            <MenuItem value="">Tous</MenuItem>
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
                        <InputLabel>Gérant</InputLabel>
                        <Select
                            value={selectedManager}
                            label="Gérant"
                            onChange={(e) => setSelectedManager(e.target.value)}
                        >
                            <MenuItem value="">Tous</MenuItem>
                            {managers.map(manager => (
                                <MenuItem key={manager.id} value={manager.id}>
                                    {manager.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item xs={6} md={1}>
                    <Button
                        variant="contained"
                        onClick={generateReport}
                        disabled={loading || !selectedQuarter || !selectedYear}
                        fullWidth
                    >
                        Générer
                    </Button>
                </Grid>

                <Grid item xs={6} md={1}>
                    <Button
                        variant="outlined"
                        startIcon={<FileDownloadIcon />}
                        onClick={exportToExcel}
                        disabled={loading || reportData.length === 0}
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
                        disabled={loading || reportData.length === 0}
                        fullWidth
                    >
                        PDF
                    </Button>
                </Grid>
            </Grid>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer component={Paper} sx={tableStyles.tableContainer}>
                    <Table>
                        <TableHead>
                            <TableRow sx={tableStyles.headerRow}>
                                <TableCell>Appartement</TableCell>
                                <TableCell>Locataire</TableCell>
                                <TableCell>Propriétaire</TableCell>
                                <TableCell>Mois</TableCell>
                                <TableCell align="right">Loyer</TableCell>
                                <TableCell align="right">Charges</TableCell>
                                <TableCell align="right">Régularisations</TableCell>
                                <TableCell align="right">Total</TableCell>
                                <TableCell>Statut</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {renderTableContent()}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default QuarterlyReport; 