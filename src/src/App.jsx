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
import ProfilePage from './pages/ProfilePage';
import { NotificationProvider } from './context/NotificationContext';

import './index.css';

function App() {
    console.log('App: Rendering structure...');
    return (
        <BrowserRouter>
            <NotificationProvider>
                <AuthProvider>
                    <TransactionProvider>
                        <Routes>
                            <Route path="/login" element={<LoginPage />} />

                            {/* Các route yêu cầu đăng nhập */}
                            <Route element={<ProtectedRoute />}>
                                <Route element={<MainLayout />}>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/transactions" element={<Transactions />} />
                                    <Route path="/profile" element={<ProfilePage />} />

                                    {/* Tất toán */}
                                    <Route path="/settlement" element={<ProtectedRoute requiredPermission="SETTLEMENT_VIEW" />}>
                                        <Route index element={<SettlementPage />} />
                                    </Route>

                                    {/* Báo cáo */}
                                    <Route path="/reports" element={<ProtectedRoute requiredPermission="REPORT_VIEW" />}>
                                        <Route index element={<Reports />} />
                                    </Route>

                                    {/* Cấu trúc Admin phẳng hơn */}
                                    <Route path="/admin/master-data" element={<ProtectedRoute requiredPermission="MASTER_DATA_VIEW" />}>
                                        <Route index element={<MasterDataPage />} />
                                    </Route>

                                    <Route path="/admin/rbac" element={<ProtectedRoute requiredPermission="SYSTEM_MANAGE" />}>
                                        <Route index element={<AdminRBAC />} />
                                    </Route>

                                    <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']} />}>
                                        <Route index element={<AdminPage />} />
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
