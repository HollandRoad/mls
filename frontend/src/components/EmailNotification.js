import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography 
} from '@mui/material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { sendEmail, generatePdf } from '../services/api';
import { useRefresh } from '../context/RefreshContext';
import EmailIcon from '@mui/icons-material/Email';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

const EmailNotification = ({ open, onClose, tenant, missingPayment, flatDetails, onSave, monthYear, onPaymentUpdate }) => {
    const location = useLocation();
    const { refreshFlatFlag, triggerRefreshFlat} = useRefresh();
    const onPaymentChange = location.state?.onPaymentChange;
    const [emailBody, setEmailBody] = useState('');

    useEffect(() => {
        console.log('useEffect triggered with:', {
            open,
            tenant,
            missingPayment,
            flatDetails
        });

        if (open) {
            try {
                if (!missingPayment?.monthYear) {
                    console.log('Missing payment data not ready');
                    return;
                }

                const [year, month] = missingPayment.monthYear.split('-');
                const date = new Date(year, month - 1);
                const formattedDate = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                const buildingManagerName = flatDetails?.building_manager?.name || 'Le Gestionnaire';

                const body = `
                <p>Bonjour ${flatDetails?.active_tenant.name},</p>
                <br/>
                <p>Je me permets de vous écrire au sujet du loyer du mois de <strong>${formattedDate}</strong> qui ne semble pas encore avoir été réglé.</p>
                <br/>
                <p>Si ce paiement a déjà été effectué, je vous prie de ne pas tenir compte de ce message.</p>
                <p>Dans le cas contraire, je vous serais reconnaissant(e) de bien vouloir procéder au règlement dans les meilleurs délais.</p>
                <br/>
                <p>Si vous rencontrez des difficultés temporaires, n'hésitez pas à me contacter pour que nous puissions en discuter ensemble et trouver une solution adaptée.</p>
                <br/>
                <p>Je reste à votre disposition pour tout renseignement complémentaire.</p>
                <br/>
                <p>Je vous prie d'agréer, ${flatDetails?.active_tenant.name}, l'expression de mes salutations distinguées.</p>
                <br/>
                <p>${buildingManagerName}</p>
                `;
                console.log('Setting email body:', body);
                setEmailBody(body);
            } catch (error) {
                console.error('Error in useEffect:', error);
            }
        }
    }, [open, tenant, missingPayment, flatDetails]);

    const handleSendEmail = async () => {
        const [year, month] = missingPayment.monthYear.split('-');
        const date = new Date(year, month - 1);
        const formattedDate = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        console.log(flatDetails,'flatDetails')
        const emailData = {
            to: flatDetails?.active_tenant?.email,
            subject: `Loyer ${formattedDate}`,
            body: emailBody,
            tenant_id: flatDetails?.active_tenant?.id,
            communication_type: 'missing_payment_notice',
            monthYear: missingPayment.monthYear,
            flat_id: flatDetails.flat?.id || flatDetails.flat_id
        };

        try {
            const response = await sendEmail(emailData);
            console.log('Email sent successfully:', response);
            
            if (onPaymentUpdate) {
                await onPaymentUpdate();
            }
            
            if (onSave) {
                await onSave();
            }
            

            await triggerRefreshFlat();

            
            onClose();
        } catch (error) {
            console.error('Error sending email:', error);
        }
    };

    const handleGeneratePdf = async () => {
        try {
            await generatePdf({
                content: emailBody,
                tenant_id: flatDetails.id,
                monthYear: monthYear
            });
            onSave();
        } catch (error) {
            console.error('Error generating PDF:', error);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Relance de paiement</DialogTitle>
            <DialogContent>
                <ReactQuill
                    value={emailBody}
                    onChange={setEmailBody}
                    modules={{
                        toolbar: [
                            [{ 'header': '1' }, { 'header': '2' }, { 'font': [] }],
                            ['bold', 'italic', 'underline'],
                            ['link'],
                            ['clean']
                        ],
                    }}
                    style={{ height: '300px', marginBottom: '50px' }}
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
                    onClick={handleSendEmail}
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

export default EmailNotification;
