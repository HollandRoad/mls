// src/components/TenantSummary.js
import React, { useEffect, useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    IconButton,
    Menu,
    Typography,
    Box,
    Divider,
    Tooltip,
    Chip,
    Stack,
    Button
} from '@mui/material';
import { getTenantsSummary, sendEmail } from '../services/api'; // Assume you have this API function
import { Link } from 'react-router-dom'; // Import Link from react-router-dom
import MoreVertIcon from '@mui/icons-material/MoreVert'; // Import the icon for the submenu
import TenantEditForm from './TenantEditForm';
import RentReceiptForm from './RentReceiptForm';
import RentNoticeForm from './RentNoticeForm';
import ChargesRegularizationForm from './ChargesRegularizationForm';
import PeopleIcon from '@mui/icons-material/People';  // Import the icon
import EditIcon from '@mui/icons-material/Edit';  // Add this import
import FlatEditForm from './FlatEditForm';  // Add this import if you need FlatEditForm
import { useRefresh } from '../context/RefreshContext';
import Checkbox from '@mui/material/Checkbox';
import SendIcon from '@mui/icons-material/Send';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';

// Use memo for the communication type mapping since it's static
const communicationTypes = {
    rent_notice: 'Avis d\'échéance',
    rent_receipt: 'Quittance',
    rent_notice_with_adjustment: 'Avis d\'échéance + régularisation',
    charges_notice: 'Régularisation',
    missing_payment_notice: 'Relance loyer',
    default: 'Autre'
};

// Create a separate component for better reusability and performance
const CommunicationItem = React.memo(({ type, date }) => (
    <div 
        style={{
            padding: '4px 8px',
            margin: '2px 0',
            borderLeft: '3px solid #2196f3', // Blue accent
            backgroundColor: '#f5f5f5',
            borderRadius: '0 4px 4px 0',
            fontSize: '0.9rem',
            display: 'flex',
            justifyContent: 'space-between',
            maxWidth: '300px'
        }}
    >
        <span style={{ fontWeight: 500 }}>
            {communicationTypes[type] || communicationTypes.default}
        </span>
        <span style={{ color: '#666', marginLeft: '12px' }}>
            {new Date(date).toLocaleDateString('fr-FR')}
        </span>
    </div>
));

const TenantSummary = () => {
    const [tenantSummary, setTenantSummary] = useState([]);
    const [selectedMonthYear, setSelectedMonthYear] = useState('');
    const [months, setMonths] = useState([]);
    const [anchorEl, setAnchorEl] = useState(null); // State for the menu anchor
    const [currentTenant, setCurrentTenant] = useState(null); // State to track the current tenant for the menu
    const [isEditTenantFormOpen, setIsEditTenantFormOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [isRentReceiptOpen, setIsRentReceiptOpen] = useState(false);
    const [isRentNoticeOpen, setIsRentNoticeOpen] = useState(false);
    const [isChargesRegularizationOpen, setIsChargesRegularizationOpen] = useState(false);
    const { refreshFlatFlag, refreshPaymentFlag  } = useRefresh();
    const [isBulkSendModalOpen, setIsBulkSendModalOpen] = useState(false);
    const [selectedTenants, setSelectedTenants] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const fetchTenantSummary = async (monthYear) => {
            const data = await getTenantsSummary(monthYear);
            setTenantSummary(data.filter(tenant => tenant.flat));
        };

        const currentMonthYear = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
        setSelectedMonthYear(currentMonthYear);
        fetchTenantSummary(currentMonthYear);
    }, [refreshPaymentFlag, refreshFlatFlag]);

    useEffect(() => {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1; // Months are 0-indexed
        const monthYearArray = [];

        // Add next month
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;
        monthYearArray.push(`${nextMonthYear}-${nextMonth.toString().padStart(2, '0')}`);

        // Add current and past months
        for (let year = currentYear; year >= currentYear - 5; year--) {
            for (let month = 12; month >= 1; month--) {
                // Skip future months except for the next month we added above
                if (year === currentYear && month > currentMonth) continue;
                monthYearArray.push(`${year}-${month.toString().padStart(2, '0')}`);
            }
        }

        setMonths(monthYearArray);
    }, []);
    
    const handleMonthYearChange = async (event) => {
        const selectedValue = event.target.value;
        setSelectedMonthYear(selectedValue);

        const data = await getTenantsSummary(selectedValue);
        setTenantSummary(data.filter(tenant => tenant.flat));
    };

    const handleMenuClick = (event, tenant) => {

        setAnchorEl(event.currentTarget);
        setSelectedTenant(tenant);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleEditClick = () => {
        setIsEditTenantFormOpen(true);
        handleMenuClose();
    };

    const handleRentReceiptClick = () => {
        setIsRentReceiptOpen(true);
        handleMenuClose();
    };

    const handleRentNoticeClick = () => {
        setIsRentNoticeOpen(true);
        handleMenuClose();
    };

    const handleChargesRegularizationClick = () => {
        setIsChargesRegularizationOpen(true);
        handleMenuClose();
    };

    const handleEditIconClick = (tenant) => {
        setSelectedTenant(tenant);
        setIsEditTenantFormOpen(true);
    };

    // Helper function to check if selected month is December
    const isDecember = () => {
        return selectedMonthYear?.split('-')[1] === '12';
    };

    const handleBulkSendClick = () => {
        setSelectedTenants([]);
        setIsBulkSendModalOpen(true);
    };

    const handleToggleTenant = (tenant) => {
        setSelectedTenants(prev => {
            const isSelected = prev.some(t => t.id === tenant.id);
            if (isSelected) {
                return prev.filter(t => t.id !== tenant.id);
            } else {
                return [...prev, tenant];
            }
        });
    };

    const handleBulkSend = async () => {
        setIsProcessing(true);
        try {
            // Process each selected tenant sequentially
            for (const tenant of selectedTenants) {
                const emailData = {
                    to: tenant.email,
                    subject: `Avis d'échéance - ${selectedMonthYear}`,
                    tenant_id: tenant.id,
                    communication_type: 'rent_notice',
                    monthYear: selectedMonthYear,
                    type: 'rent_notice'
                };
                await sendEmail(emailData);
            }
            
            // Refresh the data
            const data = await getTenantsSummary(selectedMonthYear);
            setTenantSummary(data.filter(tenant => tenant.flat));
            
            setIsBulkSendModalOpen(false);
        } catch (error) {
            console.error('Error sending bulk notices:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div>
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
                        <PeopleIcon sx={{ mr: 1 }} />
                        Appartements
                    </Typography>
                    
                    <FormControl sx={{ minWidth: 150 }}>
                        <Select
                            labelId="month-year-select-label"
                            value={selectedMonthYear}
                            onChange={handleMonthYearChange}
                            size="small"
                        >
                            {months.map((monthYear) => {
                                const [year, month] = monthYear.split('-');
                                const date = new Date(year, parseInt(month) - 1);
                                return (
                                    <MenuItem key={monthYear} value={monthYear}>
                                        {date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
                                    </MenuItem>
                                );
                            })}
                        </Select>
                    </FormControl>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<SendIcon />}
                        onClick={handleBulkSendClick}
                        size="small"
                    >
                        Envoi groupé
                    </Button>
                </Box>

                <Divider sx={{ my: 2 }} />

                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Nom de l'appartement</TableCell>
                                <TableCell>Nom du locataire</TableCell>
                                <TableCell>Paiements dues</TableCell>
                                <TableCell>Communications</TableCell>
                                {isDecember() && (
                                    <TableCell>Avis annuelle envoyé</TableCell>
                                )}
                                <TableCell>Loyer payée</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {tenantSummary.map((tenant) => (
                                <TableRow 
                                    key={tenant.id}
                                    sx={{
                                        backgroundColor: 'white',
                                        '&:hover': {
                                            backgroundColor: '#f5f5f5'
                                        }
                                    }}
                                >
                                    <TableCell>
                                        {tenant?.flat ? (
                                            <Link 
                                                to={`/flats/${tenant.flat.id}`} 
                                                state={{ tenant }}
                                            >
                                                {tenant.flat.flat_name}
                                            </Link>
                                        ) : (
                                            'Pas d\'appartement'
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            {tenant.name}
                                            <Tooltip title="Modifier le locataire">
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => handleEditIconClick(tenant)}
                                                    sx={{ 
                                                        ml: 1,
                                                        color: 'primary.main',
                                                        '&:hover': {
                                                            color: 'primary.dark'
                                                        }
                                                    }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                    <TableCell>{tenant.missed_payments_count || 0}</TableCell>
                                    <TableCell>
                                        {tenant.communications?.filter(comm => 
                                            comm.reference_month_str === selectedMonthYear
                                        ).map((comm, index) => (
                                            <CommunicationItem
                                                key={index}
                                                type={comm.communication_type}
                                                date={comm.date_sent}
                                            />
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
                                    {isDecember() && (
                                        <TableCell>{tenant.annual_receipt_sent ? '✅' : '❌'}</TableCell>
                                    )}
                                    <TableCell>
                                        {/* Check if the rent was paid for the selected month-year */}
                                 
                                        {tenant.payments && tenant.payments.some(payment => payment.payment_month_str === selectedMonthYear) ? '✅' : '❌'}
                                    </TableCell>
                                    <TableCell>
                                        <IconButton onClick={(event) => handleMenuClick(event, tenant)}>
                                            <MoreVertIcon />
                                        </IconButton>
                                        <Menu
                                            anchorEl={anchorEl}
                                            open={Boolean(anchorEl)}
                                            onClose={handleMenuClose}
                                            PaperProps={{
                                                elevation: 3,
                                                sx: {
                                                    borderRadius: '8px',
                                                    border: '1px solid #e0e0e0'
                                                }
                                            }}
                                        >

                                            <MenuItem onClick={handleRentReceiptClick}>
                                                Quittance de loyer
                                            </MenuItem>
                                            <MenuItem onClick={handleRentNoticeClick}>
                                                Avis d'échéance
                                            </MenuItem>
                                            {isDecember() && (
                                                <MenuItem onClick={handleChargesRegularizationClick}>
                                                    Régularisation des charges
                                                </MenuItem>
                                            )}
                                        </Menu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                    PaperProps={{
                        elevation: 3,
                        sx: {
                            borderRadius: '8px',
                            border: '1px solid #e0e0e0'
                        }
                    }}
                >

                    <MenuItem onClick={handleRentReceiptClick}>
                        Quittance de loyer
                    </MenuItem>
                    <MenuItem onClick={handleRentNoticeClick}>
                        Avis d'échéance
                    </MenuItem>
                    {isDecember() && (
                        <MenuItem onClick={handleChargesRegularizationClick}>
                            Régularisation des charges
                        </MenuItem>
                    )}
                </Menu>
            </Paper>

            <TenantEditForm
                open={isEditTenantFormOpen}
                onClose={() => setIsEditTenantFormOpen(false)}
                tenant={selectedTenant}
                monthYear={selectedMonthYear}
                onSave={async (updatedData) => {
                    const data = await getTenantsSummary(selectedMonthYear);
                    setTenantSummary(data.filter(tenant => tenant.flat));
                    setIsEditTenantFormOpen(false);
                }}
            />

            {[RentReceiptForm, RentNoticeForm, ChargesRegularizationForm].map((Form, index) => (
                <Form
                    key={index}
                    {...(Form === RentReceiptForm ? {
                        open: isRentReceiptOpen,
                        onClose: () => setIsRentReceiptOpen(false),
                    } : Form === RentNoticeForm ? {
                        open: isRentNoticeOpen,
                        onClose: () => setIsRentNoticeOpen(false),
                    } : {
                        open: isChargesRegularizationOpen,
                        onClose: () => setIsChargesRegularizationOpen(false),
                    })}
                    tenant={selectedTenant}
                    monthYear={selectedMonthYear}
                    onSave={async (updatedData) => {
                        const data = await getTenantsSummary(selectedMonthYear);
                        setTenantSummary(data.filter(tenant => tenant.flat));
                        if (Form === RentReceiptForm) setIsRentReceiptOpen(false);
                        else if (Form === RentNoticeForm) setIsRentNoticeOpen(false);
                        else setIsChargesRegularizationOpen(false);
                    }}
                />
            ))}

            <Dialog 
                open={isBulkSendModalOpen} 
                onClose={() => setIsBulkSendModalOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    Envoi groupé des avis d'échéance
                </DialogTitle>
                <DialogContent>
                    <List>
                        {tenantSummary.map((tenant) => (
                            <ListItem 
                                key={tenant.id}
                                dense
                                button
                                onClick={() => handleToggleTenant(tenant)}
                            >
                                <ListItemIcon>
                                    <Checkbox
                                        edge="start"
                                        checked={selectedTenants.some(t => t.id === tenant.id)}
                                        tabIndex={-1}
                                        disableRipple
                                    />
                                </ListItemIcon>
                                <ListItemText 
                                    primary={tenant.name}
                                    secondary={`${tenant.flat?.flat_name || 'No flat'} - ${tenant.email || 'No email'}`}
                                />
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setIsBulkSendModalOpen(false)}
                        disabled={isProcessing}
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={handleBulkSend}
                        variant="contained"
                        color="primary"
                        disabled={selectedTenants.length === 0 || isProcessing}
                        startIcon={<SendIcon />}
                    >
                        {isProcessing ? 'Envoi en cours...' : `Envoyer (${selectedTenants.length})`}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default TenantSummary;

export { CommunicationItem };
