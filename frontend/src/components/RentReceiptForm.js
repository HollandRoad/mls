import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from '@mui/material';
import { Editor } from '@tinymce/tinymce-react';
import { generatePdf, sendEmail } from '../services/api';
import EmailIcon from '@mui/icons-material/Email';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

const RentReceiptForm = ({ open, onClose, tenant, monthYear, onSave }) => {
    const [content, setContent] = useState('');

    useEffect(() => {
        if (open && tenant) {

            const date = new Date(monthYear);
            const formattedMonth = date.toLocaleString('fr-FR', { month: 'long' });
            const year = date.getFullYear();
            const currentDate = new Date().toLocaleDateString('fr-FR');
            // Calculate first and last day of the month
            const firstDay = "01";  // Always 1st of the month
            const lastDay = new Date(year, date.getMonth() + 1, 0).getDate();  // Last day of month
            const month = (date.getMonth() + 1).toString().padStart(2, '0');  // Get month number (01-12)
            
            const template = `
                <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; font-size: 13px !important"">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <p style="color: #666; margin-bottom: 5px;">Location vide ou meublée à titre de résidence principale :</p>
                        <h1 style="margin: 0;">Quittance de loyer</h1>
                    </div>

                    <div style="border: 1px solid #000; padding: 20px;">
                        <h2 style="text-align: center; margin-bottom: 30px;">Quittance de loyer du mois de ${formattedMonth} ${year}</h2>

                        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                            <div>
                                <p style="margin: 0;"><strong>Bailleur :</strong></p>
                                <p>${tenant.landlord.name}</p>
                                <p>${tenant.landlord.address}</p>
                                <p>${tenant.landlord.post_code} ${tenant.landlord.city}</p>
                            </div>
                            <div style="text-align: right;">
                                <p style="margin: 0;"><strong>Locataire :</strong></p>
                                <p>${tenant.name}</p>
                                <p>${tenant.flat.address}</p>
                                <p>${tenant.flat.post_code} ${tenant.flat.city}</p>
                            </div>
                        </div>

                        <div style="margin-bottom: 30px;">
                            <p style="margin: 0;"><strong>Adresse de la location :</strong></p>
                            <p>${tenant.flat.address}</p>
                            <p>${tenant.flat.post_code} ${tenant.flat.city}</p>
                        </div>

                        <p style="margin-bottom: 30px; text-align: justify;">
                            Je soussignée ${tenant.landlord.name}, propriétaire du logement désigné ci-dessus, déclare avoir 
                            reçu de ${tenant.name}, la somme de ${tenant.flat.rent_amount} euros, au titre du paiement du loyer et 
                            des charges pour la période de location du 1er ${formattedMonth} ${year} au ${lastDay} ${formattedMonth} ${year} 
                            et lui en donne quittance, sous réserve de tous mes droits.
                        </p>

                        <div style="margin-bottom: 30px;">
                            <p style="margin: 0;"><strong>Détail du règlement :</strong></p>
                            <table style="width: 100%; margin-top: 10px;">
                                <tr>
                                    <td>Loyer :</td>
                                    <td style="text-align: right;">${tenant.flat.rent_amount-tenant.flat.utilities_amount} euros</td>
                                </tr>
                                <tr>
                                    <td>Provision pour charges :</td>
                                    <td style="text-align: right;">${tenant.flat.utilities_amount} euros</td>
                                </tr>
                                <tr>
                                    <td><strong>Total :</strong></td>
                                    <td style="text-align: right;"><strong>${tenant.flat.rent_amount} euros</strong></td>
                                </tr>
                            </table>
                        </div>

                        <div style="text-align: right;">
                            <p>Fait à Courbevoie, le ${currentDate}</p>
                            <p style="margin-top: 40px;"><em>${tenant.landlord.name}</em></p>
                        </div>
                    </div>
                </div>
            `;
            
            setContent(template);
        }
    }, [open, tenant, monthYear]);

    const handleGeneratePdf = async () => {
        try {
            await generatePdf({
                content,
                tenant_id: tenant.id,
                monthYear: monthYear,
                type: 'rent_receipt'
            });
            onSave();
        } catch (error) {
            console.error('Error generating PDF:', error);
        }
    };

    const handleSendEmail = async () => {
        try {
            const emailData = {
                to: tenant.email,
                subject: `Quittance de loyer - ${monthYear}`,
                body: content,
                tenant_id: tenant.id,
                monthYear: monthYear,
                communication_type: 'rent_receipt'
            };
            
            await sendEmail(emailData);
            onSave();
            onClose();
        } catch (error) {
            console.error('Error sending email:', error);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Quittance de loyer</DialogTitle>
            <DialogContent>
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

export default RentReceiptForm;
