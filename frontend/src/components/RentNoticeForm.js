import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    InputAdornment,
    IconButton,
} from '@mui/material';
import { Editor } from '@tinymce/tinymce-react';
import { useRefresh } from '../context/RefreshContext';
import 'react-quill/dist/quill.snow.css';
import { generatePdf, sendEmail, updateAdjustment, getExtraCharges } from '../services/api';
import EmailIcon from '@mui/icons-material/Email';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EditIcon from '@mui/icons-material/Edit';


const RentNoticeForm = ({ open, onClose, tenant, payments , monthYear, adjustment, onSave, onNoticeSent,showAdjustments = false, flatDetails }) => {
    const [content, setContent] = useState('');
    const { triggerRefreshFlat } = useRefresh();
    const [rentAmount, setRentAmount] = useState('');
    const [utilitiesAmount, setUtilitiesAmount] = useState('');
    const [showEditableFields, setShowEditableFields] = useState(false);

    console.log(adjustment,'adjustment')
    useEffect(() => {
        if (open && tenant) {
            // Set initial values for rent and utilities
            setRentAmount(tenant?.flat?.rent_amount || '');
            setUtilitiesAmount(tenant?.flat?.utilities_amount || '');

            // Helper function to get the correct tenant data regardless of structure
            const getTenantData = () => {
                const activeTenant = tenant.active_tenant || tenant;
                return {
                    name: activeTenant.name,
                    address: activeTenant.address,
                    post_code: activeTenant.post_code,
                    city: activeTenant.city,
                    phone_number: activeTenant.phone_number,
                    email: activeTenant.email,
                    id: activeTenant.id,
                    // Flat data might be nested differently
                    flat: tenant.flat || activeTenant.flat,
                    // Landlord data should be consistent
                    landlord: tenant.landlord
                };
            };

            const tenantData = getTenantData();
            const date = new Date(monthYear);
            
            // Calculate total outstanding amount from both unpaid and partially paid months. 
 
            const previousMonthsBalance = payments
                ?.filter(p => 
                    p.month_year < monthYear && 
                    p.is_paid && 
                    p.payment
                )
                .reduce((total, payment) => {
                    // Calculate base expected amount
                    const expectedAmount = (payment.payment.amount || 0) + 
                                        (payment.payment.utilities_amount || 0) +
                                        (payment.extra_charges?.reduce((sum, charge) => 
                                            sum + parseFloat(charge.charge_amount), 0) || 0);

                    // Get adjustment for this month
                    const adjustment = flatDetails?.all_adjustments?.find(adj => 
                        adj.reference_month && 
                        new Date(adj.reference_month).toISOString().slice(0, 7) === payment.month_year
                    );

                    // Add adjustment amount if exists
                    const adjustmentAmount = adjustment ? 
                        parseFloat(adjustment.lift_amount || 0) + 
                        parseFloat(adjustment.heating_amount || 0) + 
                        parseFloat(adjustment.other_amount || 0) - 
                        parseFloat(adjustment.yearly_utilities_paid || 0) : 0;

                    const totalExpected = expectedAmount + adjustmentAmount;
                    const amountPaid = payment.payment.amount_paid || 0;
                    const difference = totalExpected - amountPaid;
                    return total + (difference > 0 ? difference : 0);
                }, 0);

            // Calculate unpaid months amount
            const unpaidAmount = payments
                ?.filter(p => p.month_year < monthYear && !p.is_paid)
                .reduce((total) => total + parseFloat(tenantData.flat.rent_amount), 0);

            // Total outstanding amount
            const totalOutstanding = previousMonthsBalance + unpaidAmount;

            // Create a single row for all outstanding amounts
            const outstandingRow = totalOutstanding > 0 ? `
                <div style="display: flex; border: 1px solid black; margin-bottom: 20px;">
                    <div style="flex: 2; padding: 12px; font-weight: bold; background-color: #fff0f0;">
                        Arriérés de paiement
                    </div>
                    <div style="flex: 1; padding: 12px; text-align: right; font-weight: bold; color: #d32f2f;">
                        ${totalOutstanding.toFixed(2)} €
                    </div>
                </div>
            ` : '';

            // Format dates and other variables
            const formattedMonth = date.toLocaleString('fr-FR', { month: 'long' });
            const year = date.getFullYear();
            const currentDate = new Date().toLocaleDateString('fr-FR');
            const firstDay = "01";
            const lastDay = new Date(year, date.getMonth() + 1, 0).getDate();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');

            // Only include adjustment rows if showAdjustments is true
            let adjustmentRows = '';
            if (showAdjustments && adjustment) {
                const year = adjustment.reference_year;
                const totalCharges = (
                    parseFloat(adjustment.lift_amount || 0) +
                    parseFloat(adjustment.heating_amount || 0) +
                    parseFloat(adjustment.other_amount || 0)
                ).toFixed(2);

                adjustmentRows = `
                    <div style="margin-bottom: 20px; border: 1px solid black;">
                        <div style="padding: 12px; font-weight: bold; background-color: #f8f8f8; border-bottom: 1px solid black;">
                            Charges ${year}: ${totalCharges} €
                        </div>
                        <div style="margin-left: 20px;">
                            <div style="display: flex; border-bottom: 1px solid #eee;">
                                <div style="flex: 2; padding: 8px;">• Ascenseur</div>
                                <div style="flex: 1; padding: 8px; text-align: right;">${adjustment.lift_amount} €</div>
                            </div>
                            <div style="display: flex; border-bottom: 1px solid #eee;">
                                <div style="flex: 2; padding: 8px;">• Chauffage</div>
                                <div style="flex: 1; padding: 8px; text-align: right;">${adjustment.heating_amount} €</div>
                            </div>
                            ${adjustment.other_amount > 0 ? `
                                <div style="display: flex; border-bottom: 1px solid #eee;">
                                    <div style="flex: 2; padding: 8px;">• Autres charges</div>
                                    <div style="flex: 1; padding: 8px; text-align: right;">${adjustment.other_amount} €</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <div style="display: flex; border: 1px solid black; margin-bottom: 20px;">
                        <div style="flex: 2; padding: 12px; font-weight: bold; background-color: #f8f8f8;">Provisions charges ${year}</div>
                        <div style="flex: 1; padding: 12px; text-align: right; font-weight: bold;">-${adjustment.yearly_utilities_paid} €</div>
                    </div>

                    <div style="display: flex; border: 1px solid black; margin-bottom: 20px;">
                        <div style="flex: 2; padding: 12px; font-weight: bold; background-color: #f8f8f8;">Total régularisation</div>
                        <div style="flex: 1; padding: 12px; text-align: right; font-weight: bold;">${(
                            parseFloat(totalCharges) -
                            parseFloat(adjustment.yearly_utilities_paid)
                        ).toFixed(2)} €</div>
                    </div>
                `;
            }

            // Fetch extra charges for this month
            const fetchExtraCharges = async () => {
                try {
                    const charges = await getExtraCharges(
                        tenantData.flat.id,
                        tenantData.id,
                        monthYear
                    );

                    // Create the extra charges rows
                    const extraChargesRows = charges.map(charge => `
                        <div style="display: flex; border: 1px solid black; margin-bottom: 20px;">
                            <div style="flex: 2; padding: 12px; font-weight: bold; background-color: #f8f8f8;">
                                ${charge.charge_type === 'autre' ? charge.description : charge.charge_type_display}
                            </div>
                            <div style="flex: 1; padding: 12px; text-align: right; font-weight: bold;">
                                ${charge.charge_amount} €
                            </div>
                        </div>
                    `).join('');

                    // Calculate total extra charges
                    const totalExtraCharges = charges.reduce((sum, charge) => sum + parseFloat(charge.charge_amount), 0);

                    const template = `
                        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
                            <div style="display: flex;">
                                <div style="flex: 1;">
                                    <div style="font-weight: bold;">Bailleur : ${tenantData.landlord.name}</div>
                                    ${tenantData.landlord.address ? `<div style="margin-left: 20px;">${tenantData.landlord.address}</div>` : ''}
                                    ${(tenantData.landlord.post_code || tenantData.landlord.city) ? `<div style="margin-left: 20px;">${tenantData.landlord.post_code || ''} ${tenantData.landlord.city || ''}</div>` : ''}
                                    ${tenantData.landlord.phone_number ? `<div style="margin-left: 20px;">Tél : ${tenantData.landlord.phone_number}</div>` : ''}
                                    ${tenantData.landlord.email ? `<div style="margin-left: 20px;">Email : ${tenantData.landlord.email}</div>` : ''}
                                </div>
                                <div style="flex: 1; margin-left: 40px;">
                                    <div style="font-weight: bold;">Locataire : ${tenantData.name}</div>
                                    ${tenantData.address ? `<div style="margin-left: 20px;">${tenantData.address}</div>` : ''}
                                    ${(tenantData.post_code || tenantData.city) ? `<div style="margin-left: 20px;">${tenantData.post_code || ''} ${tenantData.city || ''}</div>` : ''}
                                    ${tenantData.phone_number ? `<div style="margin-left: 20px;">Tél : ${tenantData.phone_number}</div>` : ''}
                                    ${tenantData.email ? `<div style="margin-left: 20px;">Email : ${tenantData.email}</div>` : ''}
                                </div>
                            </div>

                            <h1 style="text-align: center; margin: 40px 0; font-size: 24px; text-transform: uppercase;">Avis d'échéance</h1>

                            <p style="margin-bottom: 20px; font-weight: bold;">Période : du ${firstDay}/${month}/${year} au ${lastDay}/${month}/${year}</p>

                            <p style="font-weight: bold; margin-bottom: 10px;">Adresse de la location :</p>
                            <p style="margin-left: 20px; margin-bottom: 5px;">${tenantData.flat.address || ''}</p>
                            <p style="margin-left: 20px; margin-bottom: 5px;">${tenantData.flat.post_code || ''} ${tenantData.flat.city || ''}</p>
                            <p style="margin-left: 20px; margin-bottom: 20px;">${tenantData.flat.additional_info || ''}</p>

                            ${outstandingRow}

                            <div style="display: flex; border: 1px solid black; margin-bottom: 20px;">
                                <div style="flex: 2; padding: 12px; font-weight: bold; background-color: #f8f8f8;">
                                    Loyer ${formattedMonth} ${year}
                                </div>
                                <div style="flex: 1; padding: 12px; text-align: right; font-weight: bold;">
                                    ${parseFloat(rentAmount).toFixed(2)} €
                                </div>
                            </div>

                            <div style="display: flex; border: 1px solid black; margin-bottom: 20px;">
                                <div style="flex: 2; padding: 12px; font-weight: bold; background-color: #f8f8f8;">
                                    Provisions pour charges ${formattedMonth} ${year}
                                </div>
                                <div style="flex: 1; padding: 12px; text-align: right; font-weight: bold;">
                                    ${parseFloat(utilitiesAmount).toFixed(2)} €
                                </div>
                            </div>

                            ${extraChargesRows}

                            ${adjustmentRows}

                            <div style="display: flex; border: 1px solid black; margin-bottom: 20px;">
                                <div style="flex: 2; padding: 12px; font-weight: bold; background-color: #f8f8f8;">
                                    Total
                                </div>
                                <div style="flex: 1; padding: 12px; text-align: right; font-weight: bold;">
                                    ${(
                                        parseFloat(rentAmount) +
                                        parseFloat(utilitiesAmount) +
                                        totalExtraCharges +
                                        totalOutstanding +
                                        (showAdjustments && adjustment ? (
                                            parseFloat(adjustment.lift_amount || 0) +
                                            parseFloat(adjustment.heating_amount || 0) +
                                            parseFloat(adjustment.other_amount || 0) -
                                            parseFloat(adjustment.yearly_utilities_paid || 0)
                                        ) : 0)
                                    ).toFixed(2)} €
                                </div>
                            </div>

                            <div style="margin-top: 30px; text-align: right;">
                                <p style="margin-bottom: 5px;">Montant exigible le 5/${month}/${year}</p>
                                <p>Fait à Courbevoie, le ${currentDate}</p>
                            </div>
                        </div>
                    `;

                    setContent(template);
                } catch (error) {
                    console.error('Error fetching extra charges:', error);
                }
            };

            fetchExtraCharges();
        }
    }, [open, tenant, adjustment, monthYear, showAdjustments, payments, rentAmount, utilitiesAmount]);

    const handleSendEmail = async () => {
        try {
            const tenantData = tenant.active_tenant || tenant;
            const emailData = {
                to: tenantData.email,
                subject: `Avis d'échéance - ${monthYear}`,
                body: content,
                tenant_id: tenantData.id,
                communication_type: showAdjustments ? 'rent_notice_with_adjustment' : 'rent_notice',
                monthYear: monthYear,
                type: showAdjustments ? 'rent_notice_with_adjustment' : 'rent_notice'
            };
            
            await sendEmail(emailData);

            // Update UtilitiesAdjustment with reference_month
            if (showAdjustments && adjustment) {
                const [year, month] = monthYear.split('-');
                const referenceMonth = `${year}-${month.padStart(2, '0')}-01`;
                console.log(referenceMonth,'referenceMonth')
                const updatedAdjustment = {
                    ...adjustment,
                    reference_month: referenceMonth,
                    flat: tenant?.flat?.id || tenant?.flat?.flat?.id, // Handle both data structures
                    tenant: tenantData.id
                };
                await updateAdjustment(adjustment.id, updatedAdjustment);
            }
            onSave({ refreshFlatDetails: true });
            onClose();
            await triggerRefreshFlat();
        } catch (error) {
            console.error('Error sending email:', error);
        }
    };

    const handleGeneratePdf = async () => {
        try {
            const tenantData = tenant.active_tenant || tenant;
            await generatePdf({
                content,
                tenant_id: tenantData.id,
                monthYear: monthYear,
                type: 'rent_notice'
            });
            onSave();
        } catch (error) {
            console.error('Error generating PDF:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Send the rent notice email
            await handleSendEmail();
            if (onNoticeSent) {
                await onNoticeSent();
            }
            
                      
            onSave();
        } catch (error) {
            console.error('Error sending rent notice:', error);
        }
    };
    console.log('payments',payments)
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Avis d'échéance
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
                {showEditableFields && (
                    <Box sx={{ mb: 2, mt: 1, display: 'flex', gap: 2 }}>
                        <TextField
                            label="Loyer"
                            type="number"
                            value={rentAmount}
                            onChange={(e) => setRentAmount(e.target.value)}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">€</InputAdornment>,
                            }}
                            size="small"
                        />
                        <TextField
                            label="Charges"
                            type="number"
                            value={utilitiesAmount}
                            onChange={(e) => setUtilitiesAmount(e.target.value)}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">€</InputAdornment>,
                            }}
                            size="small"
                        />
                    </Box>
                )}
                <Editor
                    apiKey='3wtc4exz5vz6hjyddycisdgtszay7znteo3u7o7t75btauh2'
                    value={content}
                    init={{
                        height: 500,
                        menubar: false,
                        plugins: [
                            'advlist', 'autolink', 'lists', 'link', 'charmap', 'preview',
                            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                            'insertdatetime', 'table', 'help', 'wordcount'
                        ],
                        toolbar: 'undo redo | formatselect | ' +
                            'bold italic | alignleft aligncenter ' +
                            'alignright alignjustify | bullist numlist | ' +
                            'removeformat | help',
                        content_style: `
                            body { 
                                font-family: Arial,sans-serif; 
                                margin: 0;
                                padding: 10px;
                            }
                            p { margin: 0; padding: 0; }
                            @page {
                                margin: 10mm;  /* Réduit les marges de la page lors de l'impression */
                            }
                        `,
                        readonly: false
                    }}
                    onEditorChange={(newContent) => setContent(newContent)}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>
                    Annuler
                </Button>
                <Button 
                    onClick={handleGeneratePdf}
                    color="primary"
                    startIcon={<PictureAsPdfIcon />}
                >
                    Générer PDF
                </Button>
                <Button 
                    onClick={handleSubmit}
                    variant="contained" 
                    color="primary"
                    startIcon={<EmailIcon />}
                >
                    Envoyer Email
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RentNoticeForm;
