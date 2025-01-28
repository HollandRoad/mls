import axios from 'axios';

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/';

// Configure axios defaults
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Generic error handler
const handleError = (error, customMessage) => {
    console.error(customMessage || 'API Error:', error);
    throw error;
};

// Generic GET request
const get = async (endpoint) => {
    try {
        const response = await api.get(endpoint);
        return response.data;
    } catch (error) {
        handleError(error, `Error fetching from ${endpoint}`);
    }
};

// Generic POST request
const post = async (endpoint, data) => {
    try {
        const response = await api.post(endpoint, data);
        return response.data;
    } catch (error) {
        handleError(error, `Error posting to ${endpoint}`);
    }
};

// Generic PUT request
const put = async (endpoint, data) => {
    try {
        const response = await api.put(endpoint, data);
        return response.data;
    } catch (error) {
        handleError(error, `Error updating at ${endpoint}`);
    }
};

// Generic DELETE request
const del = async (endpoint) => {
    try {
        const response = await api.delete(endpoint);
        return response.data;
    } catch (error) {
        handleError(error, `Error deleting at ${endpoint}`);
    }
};

// Tenant related APIs
export const getTenants = () => get('tenants/');
export const getAvailableTenants = () => get('tenants/available/');
export const getTenantById = (id) => get(`tenants/${id}/`);
export const createTenant = (data) => post('tenants/', data);
export const updateTenant = (id, data) => put(`tenants/${id}/`, data);
export const getTenantsByFlat = (flatId) => get(`tenants/?flat=${flatId}`);
export const getTenantPaymentHistory = async (tenantId, flatId) => {
    try {
        console.log('Fetching payment history for tenant:', tenantId, 'flat:', flatId);
        const response = await api.get(`tenant-payment-history/${tenantId}/${flatId}/`);
        console.log('Payment history response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching tenant payment history:', error);
        throw error;
    }
};
export const getTenantsSummary = (monthYear) => get(`tenants/tenant-summary/?month_year=${monthYear}`);
export const getTenantSummary = (tenantId, flatId) => get(`tenant-payment-history/${tenantId}/${flatId}`);
export const endTenancy = (tenantId, endDate) => post(`tenants/${tenantId}/end_tenancy/`, { end_date: endDate });
export const assignFlat = (tenantId, flatId, startDate) => post(`tenants/${tenantId}/assign_flat/`, { flat_id: flatId, start_date: startDate });

// Flat related APIs
export const getAllFlats = (filters = {}) => {
    const params = new URLSearchParams();
    
    // Only add parameters that have valid values
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.append(key, value);
        }
    });

    const queryString = params.toString();
    return get(`flats/${queryString ? `?${queryString}` : ''}`);
};
export const getVacantFlats = () => get('flats/vacant/');
export const getAvailableFlats = () => get('flats/available/');
export const getFlatDetails = (id) => get(`flats/${id}/`);
export const createFlat = (data) => post('flats/', data);
export const updateFlat = (id, data) => put(`flats/${id}/`, data);
export const getFlatSummary = (id) => get(`flats/${id}/summary/`);

// Payment related APIs
export const fetchPayments = (flatId) => get(`flats/${flatId}/payments`);
export const addPayment = (data) => post('payments/', data);
export const updatePayment = (id, data) => put(`payments/${id}/`, data);
export const deletePayment = (id) => del(`payments/${id}/`);

// Utilities and Adjustments APIs
export const getFlatAdjustments = (flatId, tenantId = null) => {
    const endpoint = `utilities-adjustments/by-flat/${flatId}/${tenantId ? `?tenant=${tenantId}` : ''}`;
    return get(endpoint);
};
export const getAnnualFlatAdjustments = (flatId) => get(`utilities-adjustments/by-flat/${flatId}/`);
export const getYearlyUtilities = (flatId, year, tenantId) => get(`flats/${flatId}/yearly-utilities/${year}/?tenant=${tenantId}`);
export const createAdjustment = (data) => post('utilities-adjustments/', data);
export const updateAdjustment = (id, data) => put(`utilities-adjustments/${id}/`, data);
export const deleteAdjustment = (id) => del(`utilities-adjustments/${id}/`);

// Alias for backward compatibility
export const createUtilityAdjustment = createAdjustment;

// Communication APIs
export const createCommunication = (data) => post('communications/', data);
export const getCommunicationsByMonthYear = (tenantId, monthYear) => get(`communications/by-month/${tenantId}/${monthYear}/`);
export const deleteCommunication = (id) => del(`communications/${id}/`);

// Manager APIs
export const getManagers = () => get('managers/');
export const getManagerById = (id) => get(`managers/${id}/`);
export const createManager = (data) => post('managers/', data);
export const updateManager = (id, data) => put(`managers/${id}/`, data);

// Landlord APIs
export const getLandlords = () => get('landlords/');
export const getLandlordDetails = (id) => get(`landlords/${id}/`);
export const createLandlord = (data) => post('landlords/', data);

// Email and PDF APIs
export const sendEmail = (data) => post('send-email/', data);
export const generatePdf = async (data) => {
    try {
        const response = await api.post('generate-pdf/', data, {
            responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(response.data);
        window.open(url, '_blank');
        
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
        return response.data;
    } catch (error) {
        handleError(error, 'Error generating PDF');
    }
};

// Landlord Expense APIs
export const getLandlordExpenses = (flatId) => get(`landlord-expenses/by-flat/${flatId}/`);

export const createLandlordExpense = async (expenseData) => {
    try {
        const response = await api({
            method: 'POST',
            url: 'landlord-expenses/',
            data: expenseData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error creating expense:', error);
        throw error;
    }
};

export const updateLandlordExpense = async (id, expenseData) => {
    try {
        const response = await api({
            method: 'PUT',
            url: `landlord-expenses/${id}/`,
            data: expenseData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error updating expense:', error);
        throw error;
    }
};

export const deleteLandlordExpense = (id) => del(`landlord-expenses/${id}/`);

// Extra Charges APIs
export const getExtraCharges = (flatId, tenantId, monthYear) => {
    const params = new URLSearchParams();
    if (flatId) params.append('flat', flatId);
    if (tenantId) params.append('tenant', tenantId);
    if (monthYear) params.append('month_year', monthYear);
    return get(`extra-charges/?${params.toString()}`);
};

export const createExtraCharge = (data) => post('extra-charges/', data);
export const updateExtraCharge = (id, data) => put(`extra-charges/${id}/`, data);
export const deleteExtraCharge = (id) => del(`extra-charges/${id}/`);

export const updateAdjustmentReferenceMonth = async (adjustmentId, referenceMonth) => {
    try {
        // First get the current adjustment data
        const currentAdjustment = await get(`utilities-adjustments/${adjustmentId}/`);
        
        // Update only the reference_month while keeping all other fields
        const updatedData = {
            ...currentAdjustment,
            reference_month: referenceMonth ? `${referenceMonth}-01` : null
        };

        const response = await fetch(`${API_URL}utilities-adjustments/${adjustmentId}/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedData),
        });
        if (!response.ok) throw new Error('Failed to update adjustment');
        return await response.json();
    } catch (error) {
        console.error('Error updating adjustment:', error);
        throw error;
    }
};

