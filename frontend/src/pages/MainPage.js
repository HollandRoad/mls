// src/pages/MainPage.js
import React from 'react';
import { Box, CssBaseline } from '@mui/material';
import Header from '../components/Header';
import TenantSummary from '../components/TenantSummary';
import VacantFlats from '../components/VacantFlats';

const MainPage = ({ component }) => {
    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            <CssBaseline />
            <Header />
            <Box component="main" sx={{ flexGrow: 1, p: 3, pt: 10, overflowY: 'auto' }}>
                {component || (
                    <>
                        <TenantSummary />
                        <VacantFlats />
                    </>
                )}
            </Box>
        </Box>
    );
};

export default MainPage;
