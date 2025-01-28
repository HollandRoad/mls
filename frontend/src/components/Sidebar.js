// src/components/Sidebar.js
import React, { useState } from 'react';
import { 
    Drawer, 
    List, 
    ListItem, 
    ListItemIcon, 
    ListItemText,
    IconButton,
    useTheme,
    Box,
    Collapse,
    styled
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SummaryIcon from '@mui/icons-material/Assessment';
import BackupIcon from '@mui/icons-material/Backup';
import RestoreIcon from '@mui/icons-material/Restore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import MenuIcon from '@mui/icons-material/Menu';
import { Link } from 'react-router-dom';
import { API_URL } from '../services/api';
import RestoreBackupModal from './RestoreBackupModal';
import SettingsIcon from '@mui/icons-material/Settings';
import AddHomeIcon from '@mui/icons-material/AddHome';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import BusinessIcon from '@mui/icons-material/Business';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import AddIcon from '@mui/icons-material/Add';
import BackupProgressDialog from './BackupProgressDialog';
import EditIcon from '@mui/icons-material/Edit';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DescriptionIcon from '@mui/icons-material/Description';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

// Styled components for hover effects
const MenuListItem = styled(ListItem)(({ theme }) => ({
    '&:hover': {
        backgroundColor: theme.palette.action.hover,
        cursor: 'pointer',
        '& .MuiListItemIcon-root': {
            color: theme.palette.primary.main,
        },
        '& .MuiListItemText-primary': {
            color: theme.palette.primary.main,
        },
    },
}));

const SubMenuListItem = styled(ListItem)(({ theme }) => ({
    '&:hover': {
        backgroundColor: theme.palette.action.hover,
        cursor: 'pointer',
        '& .MuiListItemIcon-root': {
            color: theme.palette.secondary.main,
        },
        '& .MuiListItemText-primary': {
            color: theme.palette.secondary.main,
        },
    },
    paddingLeft: theme.spacing(4),
}));

const Sidebar = () => {
    const [open, setOpen] = useState(false);
    const [backupOpen, setBackupOpen] = useState(false);
    const [managementOpen, setManagementOpen] = useState(false);
    const [addSubmenuOpen, setAddSubmenuOpen] = useState(false);
    const [editSubmenuOpen, setEditSubmenuOpen] = useState(false);
    const [restoreModalOpen, setRestoreModalOpen] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [reportsOpen, setReportsOpen] = useState(false);
    const theme = useTheme();

    const handleDrawerToggle = () => {
        setOpen(!open);
    };

    const handleBackupClick = () => {
        setBackupOpen(!backupOpen);
    };

    const handleManagementClick = () => {
        setManagementOpen(!managementOpen);
    };

    const handleAddSubmenuClick = () => {
        setAddSubmenuOpen(!addSubmenuOpen);
    };

    const handleEditSubmenuClick = () => {
        setEditSubmenuOpen(!editSubmenuOpen);
    };

    const handleReportsClick = () => {
        setReportsOpen(!reportsOpen);
    };

    const triggerBackup = async () => {
        try {
            setIsBackingUp(true);
            const response = await fetch(`${API_URL}backup/`, {
                method: 'POST',
            });
            if (!response.ok) throw new Error('Backup failed');
            alert('Backup completed successfully');
            // Dispatch event to refresh header
            window.dispatchEvent(new Event('backup-updated'));
        } catch (error) {
            alert('Error triggering backup: ' + error.message);
        } finally {
            setIsBackingUp(false);
        }
    };

    const triggerRestore = () => {
        setRestoreModalOpen(true);
    };

    return (
        <>
            <Box sx={{ display: 'flex' }}>
                <Drawer
                    variant="permanent"
                    sx={{
                        width: open ? 250 : 50,
                        flexShrink: 0,
                        '& .MuiDrawer-paper': {
                            width: open ? 250 : 50,
                            boxSizing: 'border-box',
                            marginTop: '64px',
                            height: 'calc(100% - 64px)',
                            overflowX: 'hidden',
                            transition: theme.transitions.create('width', {
                                easing: theme.transitions.easing.sharp,
                                duration: theme.transitions.duration.enteringScreen,
                            }),
                        },
                    }}
                    open={open}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
                        <IconButton onClick={handleDrawerToggle}>
                            {open ? <ChevronLeftIcon /> : <MenuIcon />}
                        </IconButton>
                    </Box>
                    {open && (
                        <List>
                            <ListItem button component={Link} to="/">
                                <ListItemIcon>
                                    <HomeIcon />
                                </ListItemIcon>
                                <ListItemText primary="Home" />
                            </ListItem>

                            <MenuListItem onClick={handleManagementClick}>
                                <ListItemIcon>
                                    <SettingsIcon />
                                </ListItemIcon>
                                <ListItemText primary="Paramètres" />
                                {managementOpen ? <ExpandLess /> : <ExpandMore />}
                            </MenuListItem>
                            
                            <Collapse in={managementOpen} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding>
                                    <SubMenuListItem onClick={handleAddSubmenuClick}>
                                        <ListItemIcon>
                                            <AddIcon />
                                        </ListItemIcon>
                                        <ListItemText primary="Ajouter" />
                                        {addSubmenuOpen ? <ExpandLess /> : <ExpandMore />}
                                    </SubMenuListItem>

                                    <Collapse in={addSubmenuOpen} timeout="auto" unmountOnExit>
                                        <List component="div" disablePadding>
                                            <SubMenuListItem 
                                                component={Link} 
                                                to="/add-flat"
                                                sx={{ pl: 6 }}
                                            >
                                                <ListItemIcon>
                                                    <AddHomeIcon />
                                                </ListItemIcon>
                                                <ListItemText primary="Appartement" />
                                            </SubMenuListItem>
                                            
                                            <SubMenuListItem 
                                                component={Link} 
                                                to="/add-tenant"
                                                sx={{ pl: 6 }}
                                            >
                                                <ListItemIcon>
                                                    <PersonAddIcon />
                                                </ListItemIcon>
                                                <ListItemText primary="Locataire" />
                                            </SubMenuListItem>
                                            
                                            <SubMenuListItem 
                                                component={Link} 
                                                to="/add-landlord"
                                                sx={{ pl: 6 }}
                                            >
                                                <ListItemIcon>
                                                    <BusinessIcon />
                                                </ListItemIcon>
                                                <ListItemText primary="Propriétaire" />
                                            </SubMenuListItem>
                                            
                                            <SubMenuListItem 
                                                component={Link} 
                                                to="/add-manager"
                                                sx={{ pl: 6 }}
                                            >
                                                <ListItemIcon>
                                                    <ManageAccountsIcon />
                                                </ListItemIcon>
                                                <ListItemText primary="Gérant" />
                                            </SubMenuListItem>
                                        </List>
                                    </Collapse>

                                    <SubMenuListItem onClick={handleEditSubmenuClick}>
                                        <ListItemIcon>
                                            <EditIcon />
                                        </ListItemIcon>
                                        <ListItemText primary="Editer" />
                                        {editSubmenuOpen ? <ExpandLess /> : <ExpandMore />}
                                    </SubMenuListItem>

                                    <Collapse in={editSubmenuOpen} timeout="auto" unmountOnExit>
                                        <List component="div" disablePadding>
                                            <SubMenuListItem 
                                                component={Link} 
                                                to="/edit-flat"
                                                sx={{ pl: 6 }}
                                            >
                                                <ListItemIcon>
                                                    <AddHomeIcon />
                                                </ListItemIcon>
                                                <ListItemText primary="Appartement" />
                                            </SubMenuListItem>
                                            
                                            <SubMenuListItem 
                                                component={Link} 
                                                to="/edit-tenant"
                                                sx={{ pl: 6 }}
                                            >
                                                <ListItemIcon>
                                                    <PersonAddIcon />
                                                </ListItemIcon>
                                                <ListItemText primary="Locataire" />
                                            </SubMenuListItem>
                                            
                                            <SubMenuListItem 
                                                component={Link} 
                                                to="/edit-landlord"
                                                sx={{ pl: 6 }}
                                            >
                                                <ListItemIcon>
                                                    <BusinessIcon />
                                                </ListItemIcon>
                                                <ListItemText primary="Propriétaire" />
                                            </SubMenuListItem>
                                            
                                            <SubMenuListItem 
                                                component={Link} 
                                                to="/edit-manager"
                                                sx={{ pl: 6 }}
                                            >
                                                <ListItemIcon>
                                                    <ManageAccountsIcon />
                                                </ListItemIcon>
                                                <ListItemText primary="Gérant" />
                                            </SubMenuListItem>
                                        </List>
                                    </Collapse>
                                </List>
                            </Collapse>

                            <MenuListItem onClick={handleReportsClick}>
                                <ListItemIcon>
                                    <AssessmentIcon />
                                </ListItemIcon>
                                <ListItemText primary="Rapports" />
                                {reportsOpen ? <ExpandLess /> : <ExpandMore />}
                            </MenuListItem>
                            
                            <Collapse in={reportsOpen} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding>
                                    <SubMenuListItem 
                                        component={Link} 
                                        to="/reports/quarterly"
                                    >
                                        <ListItemIcon>
                                            <ReceiptLongIcon />
                                        </ListItemIcon>
                                        <ListItemText primary="Rapport Trimestriel" />
                                    </SubMenuListItem>
                                    <SubMenuListItem 
                                        component={Link} 
                                        to="/reports/annual"
                                    >
                                        <ListItemIcon>
                                            <CalendarTodayIcon />
                                        </ListItemIcon>
                                        <ListItemText primary="Rapport Annuel" />
                                    </SubMenuListItem>
                                    <SubMenuListItem 
                                        component={Link} 
                                        to="/reports/landlord-tax"
                                    >
                                        <ListItemIcon>
                                            <DescriptionIcon />
                                        </ListItemIcon>
                                        <ListItemText primary="Rapport Fiscal" />
                                    </SubMenuListItem>
                                    <SubMenuListItem 
                                        component={Link} 
                                        to="/reports/landlord-expenses"
                                    >
                                        <ListItemIcon>
                                            <AccountBalanceWalletIcon />
                                        </ListItemIcon>
                                        <ListItemText primary="Dépenses Propriétaire" />
                                    </SubMenuListItem>
                                </List>
                            </Collapse>

                            <MenuListItem onClick={handleBackupClick}>
                                <ListItemIcon>
                                    <BackupIcon />
                                </ListItemIcon>
                                <ListItemText primary="Backup" />
                                {backupOpen ? <ExpandLess /> : <ExpandMore />}
                            </MenuListItem>
                            
                            <Collapse in={backupOpen} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding>
                                    <SubMenuListItem onClick={triggerBackup}>
                                        <ListItemIcon>
                                            <BackupIcon />
                                        </ListItemIcon>
                                        <ListItemText primary="Backup DB" />
                                    </SubMenuListItem>
                                    <SubMenuListItem onClick={triggerRestore}>
                                        <ListItemIcon>
                                            <RestoreIcon />
                                        </ListItemIcon>
                                        <ListItemText primary="Restore DB" />
                                    </SubMenuListItem>
                                </List>
                            </Collapse>
                        </List>
                    )}
                </Drawer>
            </Box>
            <RestoreBackupModal
                open={restoreModalOpen}
                onClose={() => setRestoreModalOpen(false)}
            />
            <BackupProgressDialog open={isBackingUp} />
        </>
    );
};

export default Sidebar;
