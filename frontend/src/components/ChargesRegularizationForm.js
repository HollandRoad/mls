import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from '@mui/material';
import { Editor } from '@tinymce/tinymce-react';
import 'react-quill/dist/quill.snow.css';
import { generatePdf, sendEmail } from '../services/api';
import EmailIcon from '@mui/icons-material/Email';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

const ChargesRegularizationForm = ({ open, onClose, tenant, monthYear, onSave }) => {
    const [content, setContent] = useState('');

    useEffect(() => {
        if (open && tenant) {
            const currentDate = new Date().toLocaleDateString('fr-FR');
            const date = new Date(monthYear);
            const year = date.getFullYear();

            const firstDayOfYear = new Date(year, 0, 1).toLocaleDateString('fr-FR');
            const lastDayOfYear = new Date(year, 11, 31).toLocaleDateString('fr-FR');

            const template = `
                <div style="font-family: Arial, sans-serif !important; max-width: 800px !important; margin: 0 auto !important; padding: 20px !important; font-size: 13px !important">
                    <div style="margin-bottom: 40px;">
                <div style="font-family: Arial, sans-serif !important; max-width: 800px !important; margin: 0 auto !important; padding: 10px !important; line-height: 1.2 !important;">
                    <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 60px !important;">
                        <div style="flex: 1 !important;">
                            <div style="font-weight: bold !important; margin: 0 !important; padding: 0 !important;">Bailleur : ${tenant.landlord.name}</div>
                            ${tenant.landlord.address ? `<div style="margin: 0 0 0 20px !important; padding: 0 !important;">${tenant.landlord.address}</div>` : ''}
                            ${(tenant.landlord.post_code || tenant.landlord.city) ? `<div style="margin: 0 0 0 20px !important; padding: 0 !important;">${tenant.landlord.post_code || ''} ${tenant.landlord.city || ''}</div>` : ''}
                            ${tenant.landlord.phone_number ? `<div style="margin: 0 0 0 20px !important; padding: 0 !important;">Tél : ${tenant.landlord.phone_number}</div>` : ''}
                            ${tenant.landlord.email ? `<div style="margin: 0 0 0 20px !important; padding: 0 !important;">Email : ${tenant.landlord.email}</div>` : ''}
                        </div>
                        <div style="flex: 1 !important; margin-left: 40px !important;">
                            <div style="font-weight: bold !important; margin: 0 !important; padding: 0 !important;">Locataire : ${tenant.name}</div>
                            ${tenant.flat.address ? `<div style="margin: 0 0 0 20px !important; padding: 0 !important;">${tenant.flat.address}</div>` : ''}
                            ${(tenant.flat.post_code || tenant.flat.city) ? `<div style="margin: 0 0 0 20px !important; padding: 0 !important;">${tenant.flat.post_code || ''} ${tenant.flat.city || ''}</div>` : ''}
                            ${tenant.phone_number ? `<div style="margin: 0 0 0 20px !important; padding: 0 !important;">Tél : ${tenant.phone_number}</div>` : ''}
                            ${tenant.email ? `<div style="margin: 0 0 0 20px !important; padding: 0 !important;">Email : ${tenant.email}</div>` : ''}
                        </div>
                    </div>

                        <div style="text-align: right; margin-top: 20px;">
                            <p>${tenant.landlord.city || 'Lieu'}, le ${currentDate}</p>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <p style="font-weight: bold;">Objet : régularisation des charges pour l'année ${year}</p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <p>Monsieur, Madame,</p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <p>Conformément aux accords du bail signé le ${tenant.start_date} pour la location de l'appartement situé ${tenant.flat.address || '[adresse complète]'}, vous payez en complément du loyer des provisions sur charges permettant de couvrir l'usage locatif de ce logement.</p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <p>Par la présente, je vous informe que nous avons procédé à la régularisation annuelle des charges locatives. En effet, nous vous rappelons que cette régularisation correspond à l'ajustement entre les provisions sur charges versées et les charges locatives réelles, sur une année écoulée.</p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <p>Période du ${firstDayOfYear} au ${lastDayOfYear}</p>
                    </div>

                    <div style="border: 1px solid black; margin-bottom: 20px;">
                        <div style="display: flex; border-bottom: 1px solid black;">
                            <div style="flex: 2; padding: 8px;">Montant annuel des provisions sur charges</div>
                            <div style="flex: 1; padding: 8px; text-align: right;">XX,XX €</div>
                        </div>
                        <div style="display: flex; border-bottom: 1px solid black;">
                            <div style="flex: 2; padding: 8px;">Montant annuel des charges locatives réelles</div>
                            <div style="flex: 1; padding: 8px; text-align: right;">XX,XX €</div>
                        </div>
                        <div style="display: flex;">
                            <div style="flex: 2; padding: 8px; font-weight: bold;">Régularisation des charges</div>
                            <div style="flex: 1; padding: 8px; text-align: right; font-weight: bold;">XX,XX €</div>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <p>La régularisation affiche un solde de XX,XX € en [votre/ma] faveur.</p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <p>Je vous invite à/Je vais procéder au règlement dans les plus brefs délais afin de régulariser ce solde pour charges.</p>
                    </div>

                    <div style="margin-bottom: 40px;">
                        <p>Par ailleurs, afin de réduire cet écart trop important sur le prochain exercice, veuillez prendre note du réajustement des provisions sur charges qui vous seront appelées mensuellement, et qui s'élèveront désormais à hauteur de XX,XX € à compter du XX/XX/XXXX.</p>
                    </div>

                    <div style="margin-bottom: 40px;">
                        <p>Dans cette attente, je vous prie d'agréer, Monsieur/Madame, l'expression de mes salutations distinguées.</p>
                    </div>

                    <div style="text-align: right;">
                        <p>Signature</p>
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
                type: 'charges_regularization'
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
                subject: `Régularisation des charges - ${monthYear}`,
                body: content,
                tenant_id: tenant.id,
                monthYear: monthYear,
                communication_type: 'charges_notice'
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
            <DialogTitle>Régularisation des charges</DialogTitle>
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
                        content_style: 'body { font-family: Arial,sans-serif; margin: 0; padding: 10px; } p { margin: 0; padding: 0; }',
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

export default ChargesRegularizationForm;
