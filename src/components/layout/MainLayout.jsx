import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Receipt, FileText, Settings, LogOut, User, Menu, X, ClipboardCheck, Shield } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import './MainLayout.css';

export const MainLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const NAV_ITEMS = [
        { label: 'Tổng quan', path: '/', icon: LayoutDashboard, roles: ['admin', 'accountant', 'employee'] },
        { label: 'Thu - Chi', path: '/transactions', icon: Receipt, roles: ['admin', 'accountant', 'employee'] },
        { label: 'Tất toán', path: '/settlement', icon: ClipboardCheck, roles: ['admin', 'accountant'] },
        { label: 'Báo cáo', path: '/reports', icon: FileText, roles: ['admin', 'accountant'] },
        { label: 'Quản lý Dữ liệu', path: '/admin/master-data', icon: Settings, roles: ['admin'] },
        { label: 'Phân quyền', path: '/admin/rbac', icon: Shield, roles: ['admin'] },
    ];

    const filteredNavItems = NAV_ITEMS.filter(item => item.roles.includes(user?.role));

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className={clsx('sidebar', { 'open': isSidebarOpen, 'closed': !isSidebarOpen })}>
                <div className="sidebar-header">
                    {isSidebarOpen && <h2 className="logo">ThuChi App</h2>}
                    <button onClick={toggleSidebar} className="toggle-btn">
                        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {filteredNavItems.map(item => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={clsx('nav-item', { active: isActive })}
                                title={!isSidebarOpen ? item.label : ''}
                            >
                                <Icon size={20} />
                                {isSidebarOpen && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="sidebar-footer">
                    {isSidebarOpen && (
                        <div className="user-info">
                            <div className="avatar"><User size={16} /></div>
                            <div className="user-details">
                                <p className="user-name">{user?.fullName}</p>
                                <p className="user-role">{user?.role}</p>
                            </div>
                        </div>
                    )}
                    <button onClick={logout} className="logout-btn" title="Đăng xuất">
                        <LogOut size={20} />
                        {isSidebarOpen && <span>Đăng xuất</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="top-header">
                    <h1 className="page-title">
                        {NAV_ITEMS.find(i => i.path === location.pathname)?.label || 'Trang chủ'}
                    </h1>
                </header>
                <div className="content-area">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
