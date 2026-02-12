import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TransactionProvider } from './context/TransactionContext';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import AdminPage from './pages/AdminPage';
import MasterDataPage from './pages/MasterDataPage';
import SettlementPage from './pages/SettlementPage';
import AdminRBAC from './pages/AdminRBAC';
import { NotificationProvider } from './context/NotificationContext';
import './index.css';

function App() {
    return (
        <BrowserRouter>
            <NotificationProvider>
                <AuthProvider>
                    <TransactionProvider>
                        <Routes>
                            <Route path="/login" element={<LoginPage />} />

                            <Route element={<ProtectedRoute />}>
                                <Route element={<MainLayout />}>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/transactions" element={<Transactions />} />

                                    {/* Reports - accessible to admin & accountant mainly, but maybe employee too? 
                      Requirement: "Kế toán: xuất báo cáo". Employee: "xem lịch sử cá nhân". 
                      Let's allow all for now, component will handle internal logic if needed, 
                      or protect route. */}
                                    <Route path="/settlement" element={<SettlementPage />} />

                                    <Route path="/reports" element={
                                        <ProtectedRoute allowedRoles={['admin', 'accountant']} />
                                    }>
                                        <Route index element={<Reports />} />
                                    </Route>

                                    <Route path="/admin" element={
                                        <ProtectedRoute allowedRoles={['admin']} />
                                    }>
                                        <Route index element={<AdminPage />} />
                                        <Route path="master-data" element={<MasterDataPage />} />
                                        <Route path="rbac" element={<AdminRBAC />} />
                                    </Route>
                                </Route>
                            </Route>

                            {/* Fallback route */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </TransactionProvider>
                </AuthProvider>
            </NotificationProvider>
        </BrowserRouter>
    );
}

export default App;
