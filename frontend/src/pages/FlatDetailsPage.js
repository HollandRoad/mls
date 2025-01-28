import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Paper, Typography, Box, Dialog } from '@mui/material';
import PaymentTable from '../components/PaymentTable';
import PaymentModal from '../components/EditPaymentModal';
import TenantInfo from '../components/TenantInfo';
import { API_URL, fetchPayments, getTenantSummary, getFlatSummary, deleteCommunication, updateAdjustment, updateAdjustmentReferenceMonth } from '../services/api';
import AddPaymentModal from '../components/AddPaymentModal';
import EmailNotification from '../components/EmailNotification';

import FlatVignette from '../components/FlatVignette';
import FlatEditForm from '../components/FlatEditForm';
import RentNoticeForm from '../components/RentNoticeForm';
import FlatAdjustments from '../components/FlatAdjustments';
import { getFlatAdjustments } from '../services/api';
import { useRefresh } from '../context/RefreshContext';
import LandlordExpenses from '../components/LandlordExpenses';

const FlatDetailsPage = () => {
    const location = useLocation();
    const [flatDetailsState, setFlatDetailsState] = useState(location.state?.tenant);
    const onPaymentChange = location.state?.onPaymentChange;
    const [openEditModal, setOpenEditModal] = useState(false);
    const [openAddModal, setOpenAddModal] = useState(false);    
    const [selectedPaymentRow, setSelectedPaymentRow] = useState(null);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [paymentSummary, setPaymentSummary] = useState([]);
    const [payments, setPayments] = useState([]);
    const [openEmailNotification, setOpenEmailNotification] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [missingPaymentInfo, setMissingPaymentInfo] = useState(null);

    const [isFlatEditOpen, setIsFlatEditOpen] = useState(false);
    const [isRentNoticeOpen, setIsRentNoticeOpen] = useState(false);
    const [adjustments, setAdjustments] = useState(null);
    const { refreshPaymentFlag, triggerRefreshPayment, refreshFlatFlag, triggerRefreshFlat } = useRefresh();
    const [flatDetails, setFlatDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedAdjustment, setSelectedAdjustment] = useState(null);

    const [isUtilitiesNotice, setIsUtilitiesNotice] = useState(false);

    useEffect(() => {
        const currentMonthYear = new Date().toISOString().slice(0, 7);
        setSelectedPayment(currentMonthYear);
    }, []);

    // useEffect(() => {
    //     if (flatDetailsState) {
    //         setPayments(flatDetailsState.payments || []);
    //     }
    // }, [flatDetailsState]);

    // useEffect(() => {
    //     const fetchFlatDetails = async () => {
    //         if (refreshFlatFlag) {
    //             try {
    //                 if (flatDetails?.flat?.id) {
    //                     const details = await getFlatSummary(flatDetails?.flat?.id);
    //                     console.log(details,'details')
    //                     setFlatDetails(details);
    //                 } else {
    //                     const details = await getFlatSummary(flatDetailsState?.flat?.id);
    //                     setFlatDetails(details);
    //                 }
    //             } catch (error) {
    //                 console.error('Error fetching flat details:', error);
    //             }
    //         }
    //     };

    //     fetchFlatDetails();
    // }, [refreshFlatFlag, flatDetails?.flat?.id, flatDetailsState?.flat?.id]);

    useEffect(() => {
        const loadFlatDetails = async () => {
            console.log('loading_flat_details')
            if (flatDetailsState?.flat?.id) {
                console.log('loading_flat_details2')
                setIsLoading(true);
                try {
                    const flatdetails = await getFlatSummary(flatDetailsState.flat.id);
                    if (flatdetails && Object.keys(flatdetails).length > 0) {
                        setFlatDetails(flatdetails);

                    } else {
                        console.warn('No flat details received');
                    }
                } catch (error) {
                    console.error('Error fetching flat details:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        loadFlatDetails();

    }, [refreshFlatFlag, flatDetails,flatDetailsState?.flat?.id]);

    useEffect(() => {
        const loadPayments = async () => {
            if (flatDetailsState?.flat?.id) {
                try {
                    const fetchedPayments = await fetchPayments(flatDetailsState?.flat?.id);
                    setPayments(fetchedPayments);
                    console.log('fetchedPayments',fetchedPayments)
                } catch (error) {
                    console.error('Error fetching payments:', error);
                }
            }
        };

        loadPayments();
    }, [flatDetailsState?.flat?.id,refreshFlatFlag,refreshPaymentFlag]);

    useEffect(() => {
        const loadTenantSummary = async () => {
            if (flatDetails?.active_tenant?.id) {
                try {
                    const summary = await getTenantSummary(flatDetails?.active_tenant?.id, flatDetails?.flat?.id);

                    
                    // Get first day of next month
                    const today = new Date();
                    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                    // Format date as YYYY-MM without timezone issues
                    const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
                    console.log(refreshPaymentFlag,'refreshPaymentFlag')

                    const upcomingPayment = {
                        month_year: nextMonthStr, // Changed from payment_month to match the format used in PaymentTable
                        status: 'upcoming',
                        amount: flatDetails?.flat?.flat?.rent_amount || 0,
                        utilities_amount: flatDetails?.flat?.flat?.utilities_amount || 0,
                        payment_type: 'loyer',
                        is_upcoming: true,
                        is_paid: false // Add this to match the format expected by PaymentTable
                    };
                    
                    // Add the upcoming payment to the beginning of the array
                    setPaymentSummary([upcomingPayment, ...summary]);

                } catch (error) {
                    console.error('Error fetching tenant summary:', error);
                }
            }
        };

        loadTenantSummary();
    }, [flatDetailsState?.flat?.id, payments, refreshPaymentFlag, refreshFlatFlag]);

    useEffect(() => {
        const loadAdjustments = async () => {
            if (flatDetails?.flat?.id) {
                try {
                    const data = await getFlatAdjustments(flatDetails.flat.id, flatDetails.active_tenant.id);
                    setAdjustments(data)
                } catch (error) {
                    console.error('Error loading adjustments:', error);
                }
            }
        };

        loadAdjustments();
    }, [flatDetails?.flat?.id]);

    const handleEditClick = (monthYear, payment) => {
        console.log('PAYMENT',payment)
        setSelectedPaymentRow(payment);

        setSelectedPayment(monthYear); // Set the selected month year
        setOpenEditModal(true);
    };

    const handleAddClick = (monthYear) => {
        setSelectedPaymentRow(null); // Clear selected payment
        setSelectedPayment(monthYear); // Clear selected month year
        setOpenAddModal(true); // Open add payment modal
    };

    const handleAdjustmentSave = async () => {
        try {
            const data = await getFlatAdjustments(flatDetails?.flat?.id, flatDetails?.active_tenant.id);
            setAdjustments(data);
        } catch (error) {
            console.error('Error refreshing adjustments:', error);
        }
    };

    const handleCloseEditModal = () => {
        setOpenEditModal(false);
        setSelectedPaymentRow(null);
    };

    const handleCloseAddModal = () => {
        setOpenAddModal(false);
    };



    const handleSave = async (options = {}) => {
        try {
            // First trigger the refresh
            triggerRefreshPayment();
            triggerRefreshFlat();
            
            // Then fetch the new data
            const updatedPayments = await fetchPayments(flatDetails?.flat?.id);
            setPayments(updatedPayments);
            
            // Fetch updated summary after payment changes
            const summary = await getTenantSummary(flatDetails.active_tenant.id, flatDetails.flat.id);
            setPaymentSummary(summary);

            // If refreshFlatDetails flag is true, refresh flat details
            if (options.refreshFlatDetails) {
                const updatedDetails = await getFlatSummary(flatDetails?.flat?.id);
                setFlatDetails(updatedDetails);
            }

            if (onPaymentChange) {
                onPaymentChange();
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    };

    const handleSaveEditForm = async (updatedFlat) => {
        try {
            const refreshedFlat = await getFlatSummary(updatedFlat.id);
            setFlatDetailsState(prev => ({
                ...prev,
                flat: refreshedFlat
            }));
            setFlatDetails(refreshedFlat);
            triggerRefreshFlat();
            setIsFlatEditOpen(false);
        } catch (error) {
            console.error('Error refreshing flat details:', error);
        }
    };

    const handleAction1 = (flatDetails, missingPayment) => {
        setSelectedTenant(flatDetails.name);

        setMissingPaymentInfo(missingPayment);

        setOpenEmailNotification(true); // Open the email notification component
    };

    const handleCloseEmailNotification = () => {
        setOpenEmailNotification(false);
        setSelectedTenant(null);
        setMissingPaymentInfo(null);
        triggerRefreshFlat()
    };

    const handleFlatEdit = async (flatDetails) => {
        try {
            setIsFlatEditOpen(true);
        } catch (error) {
            console.error('Error fetching flat details:', error);
        }
        triggerRefreshFlat();
    };

    const handleFlatEditClose = () => {
        setIsFlatEditOpen(false);
    };

    const handleRentNoticeClick = (monthYear) => {
        // Check if a rent notice already exists for this month
        const existingNotice = flatDetails?.communications?.find(comm => 
            comm.reference_month_str === monthYear && 
            (comm.communication_type === 'rent_notice' || comm.communication_type === 'rent_notice_with_adjustment')
        );

        if (existingNotice) {
            const shouldContinue = window.confirm(
                `Un avis d'échéance a déjà été envoyé le ${new Date(existingNotice.date_sent).toLocaleDateString('fr-FR')} pour le mois de ${new Date(monthYear).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}. \n\nVoulez-vous envoyer un nouvel avis ?`
            );
            
            if (!shouldContinue) {
                return;
            }
        }

        setSelectedPayment(monthYear);
        setIsUtilitiesNotice(false);
        setIsRentNoticeOpen(true);
    };

    // Add this useEffect to watch for changes
    useEffect(() => {
        if (flatDetailsState?.flat?.id) {
            getFlatSummary(flatDetailsState.flat.id)
                .then(updatedFlat => {
                    setFlatDetailsState(prev => ({
                        ...prev,
                        flat: updatedFlat
                    }));
                })
                .catch(error => console.error('Error refreshing flat details:', error));
        }
    }, [flatDetailsState?.flat?.id]);

    const handleRentNoticeWithUtilities = async (monthYear) => {
        try {
            const data = await getFlatAdjustments(flatDetails?.flat?.id, flatDetails?.active_tenant.id);
            setAdjustments(data);
            
            const year = new Date(monthYear).getFullYear() - 1;
            const yearAdjustment = data?.find(adj => adj.reference_year.toString() === year.toString());

            // First check for existing rent notice
            const existingNotice = flatDetails?.communications?.find(comm => 
                comm.reference_month_str === monthYear && 
                (comm.communication_type === 'rent_notice' || comm.communication_type === 'rent_notice_with_adjustment')
            );

            if (existingNotice) {
                const shouldContinue = window.confirm(
                    `Un avis d'échéance a déjà été envoyé le ${new Date(existingNotice.date_sent).toLocaleDateString('fr-FR')} pour le mois de ${new Date(monthYear).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}. \n\nVoulez-vous envoyer un nouvel avis ?`
                );
                
                if (!shouldContinue) {
                    return;
                }
            }

            // Then check for existing adjustment notice
            if (yearAdjustment && yearAdjustment.reference_month) {
                const shouldContinue = window.confirm(
                    `Un rappel des charges pour l'année ${year} a déjà été envoyé le ${new Date(yearAdjustment.reference_month).toLocaleDateString('fr-FR')}. \n\nVoulez-vous envoyer un nouveau rappel ?`
                );
                
                if (!shouldContinue) {
                    return;
                }
            }

            setSelectedPayment(monthYear);
            setIsUtilitiesNotice(true);
            setIsRentNoticeOpen(true);
            setSelectedAdjustment(yearAdjustment);
        } catch (error) {
            console.error('Error handling rent notice with utilities:', error);
        }
    };

    const onDeleteCommunication = async (communicationId) => {
        try {
            // Get the communication details before deleting
            const communication = flatDetails.communications.find(comm => comm.id === communicationId);
            
            await deleteCommunication(communicationId);
            console.log('communication deleted')
            console.log('communication',communication)
            console.log('adjustments',adjustments)
            // Only update adjustment if it's a rent notice with adjustment
            if (communication?.communication_type === 'rent_notice_with_adjustment' && adjustments) {
                // Find the adjustment for this month
                const monthYear = communication.reference_month_str;
                const [year] = monthYear.split('-');
                const yearAdjustment = adjustments.find(adj => adj.reference_year.toString() === (parseInt(year) - 1).toString());

                if (yearAdjustment) {
                    // Update only this specific adjustment
                    const updatedAdjustment = {
                        ...yearAdjustment,
                        reference_month: null,
                        flat: flatDetails?.flat?.id,
                        tenant: flatDetails?.active_tenant?.id
                    };

                    await updateAdjustment(yearAdjustment.id, updatedAdjustment);
                }
            }

            // Refresh flat details
            const updatedDetails = await getFlatSummary(flatDetails?.flat?.id);
            setFlatDetails(updatedDetails);
        } catch (error) {
            console.error('Error deleting communication:', error);
        }
    };

    const handleAdjustmentDrop = async (adjustmentId, monthYear) => {
        try {
            await updateAdjustmentReferenceMonth(adjustmentId, monthYear);
            // Refresh adjustments list
            const updatedAdjustments = await getFlatAdjustments(flatDetails?.flat?.id, flatDetails?.active_tenant?.id);
            setAdjustments(updatedAdjustments);
            // Refresh flat details to update any related data
            const updatedDetails = await getFlatSummary(flatDetails?.flat?.id);
            setFlatDetails(updatedDetails);
        } catch (error) {
            console.error('Error updating adjustment reference month:', error);
        }
    };

    if (!flatDetailsState?.flat) {
        return <div>Loading...</div>;
    }

    return (
        <Box padding={7}>
            <Paper style={{ padding: 20 }}>
                {isLoading ? (
                    <div>Loading flat details...</div>
                ) : flatDetails ? (
                    <FlatVignette 
                        flatDetails={flatDetails} 
                        onEditClick={handleFlatEdit}
                        payments={paymentSummary}
                    />
                ) : null}
                
                <PaymentTable 
                    payments={paymentSummary}
                    onEditClick={handleEditClick} 
                    onAddClick={handleAddClick} 
                    onAction1Click={handleAction1}
                    flatDetails={flatDetails}
                    setFlatDetails={setFlatDetails}
                    onRentNoticeClick={handleRentNoticeClick}
                    onRentNoticeWithUtilitiesClick={handleRentNoticeWithUtilities}
                    onDeleteCommunication={onDeleteCommunication}
                    onAdjustmentDrop={handleAdjustmentDrop}
                />

                <FlatAdjustments 
                    flat={flatDetails}
                    adjustments={adjustments}
                    onSave={handleAdjustmentSave}
                 />

                <LandlordExpenses flat={flatDetails} />

                <PaymentModal 
                    open={openEditModal} 
                    onClose={handleCloseEditModal} 
                    setFlatDetails={setFlatDetails}
                    selectedPayment={selectedPaymentRow} 
                    flatDetails={flatDetails} 
                    onSave={handleSave} 
                    monthYear={selectedPayment} 
                />
                <AddPaymentModal 
                    open={openAddModal} 
                    onClose={handleCloseAddModal} 
                    flatDetails={flatDetails} 
                    onSave={handleSave} 
                    setFlatDetails={setFlatDetails}
                    monthYear={selectedPayment} 
                />
                
                <EmailNotification 
                    onClose={handleCloseEmailNotification} 
                    tenant={selectedTenant} 
                    monthYear={selectedPayment}
                    missingPayment={missingPaymentInfo} 
                    flatDetails={flatDetails}
                    open={openEmailNotification}
                    onSave={handleSave}
                    onPaymentUpdate={async () => {
                        const updatedDetails = await getFlatSummary(flatDetails?.flat?.id);
                        setFlatDetails(updatedDetails);
                    }}
                />

                <FlatEditForm 
                    open={isFlatEditOpen}
                    onClose={handleFlatEditClose}
                    flat={flatDetails}
                    onSave={handleSaveEditForm}
                />

                <RentNoticeForm
                    open={isRentNoticeOpen}
                    flatDetails={flatDetails}
                    onClose={() => setIsRentNoticeOpen(false)}
                    tenant={flatDetails}
                    monthYear={selectedPayment}
                    adjustment={selectedAdjustment}
                    payments={paymentSummary}
                    showAdjustments={isUtilitiesNotice} // false for regular notice, true for utilities notice
                    onSave={() => {
                        setIsRentNoticeOpen(false);
                    }}
                    onNoticeSent={async () => {
                        const updatedDetails = await getFlatSummary(flatDetails?.flat?.id);
                        setFlatDetails(updatedDetails);
                    }}
                    // onPaymentUpdate={async () => {
                    //     const updatedDetails = await getFlatSummary(flatDetails?.flat?.id);
                    //     setFlatDetails(updatedDetails);
                    // }}
                />
            </Paper>
        </Box>
    );
};

export default FlatDetailsPage;
