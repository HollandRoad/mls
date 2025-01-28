import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import MainPage from './pages/MainPage';
import FlatDetailsPage from './pages/FlatDetailsPage';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import './App.css';

import { Box } from '@mui/material';
import AddFlatForm from './components/AddFlatForm';
import AddTenantForm from './components/AddTenantForm';
import AddLandlordForm from './components/AddLandlordForm';
import AddManagerForm from './components/AddManagerForm';
import EditTenant from './components/EditTenant';
import EditLandlord from './components/EditLandlord';
import EditManager from './components/EditManager';
import { RefreshProvider } from './context/RefreshContext';
import EditFlat from './components/EditFlat';
import QuarterlyReport from './components/reports/QuarterlyReport';
import AnnualReport from './components/reports/AnnualReport';
import LandlordTaxReport from './components/reports/LandlordTaxReport';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import LandlordExpensesReport from './components/LandlordExpensesReport';

function App() {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <DndProvider backend={HTML5Backend}>
            <RefreshProvider>
                <Router>
                    <Box sx={{ display: 'flex' }}>
                        <Header />
                        <Sidebar isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
                        <Box
                            component="main"
                            sx={{
                                flexGrow: 1,
                                p: 3,
                                mt: '64px', // Height of AppBar
                                ml: isExpanded ? '240px' : '73px', // Adjust based on sidebar state
                                width: { sm: `calc(100% - ${isExpanded ? '240px' : '73px'})` },
                                transition: 'margin-left 0.2s ease-in-out, width 0.2s ease-in-out'
                            }}
                        >
                            <Routes>
                                <Route path="/" element={<MainPage />} />
                                <Route path="/flats/:flatId" element={<FlatDetailsPage />} />
                                <Route path="/add-flat" element={<AddFlatForm />} />
                                <Route path="/add-tenant" element={<AddTenantForm />} />
                                <Route path="/add-landlord" element={<AddLandlordForm />} />
                                <Route path="/add-manager" element={<AddManagerForm />} />
                                <Route path="/edit-tenant" element={<EditTenant />} />
                                <Route path="/edit-landlord" element={<EditLandlord />} />
                                <Route path="/edit-manager" element={<EditManager />} />
                                <Route path="/edit-flat" element={<EditFlat />} />
                                <Route path="/reports/quarterly" element={<QuarterlyReport />} />
                                <Route path="/reports/annual" element={<AnnualReport />} />
                                <Route path="/reports/landlord-tax" element={<LandlordTaxReport />} />
                                <Route path="/reports/landlord-expenses" element={<LandlordExpensesReport />} />
                            </Routes>
                        </Box>
                    </Box>
                </Router>
            </RefreshProvider>
        </DndProvider>
    );
}

export default App;
