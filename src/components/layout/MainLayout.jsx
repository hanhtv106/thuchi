import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Receipt, FileText, Settings, LogOut, User, Menu, X, ClipboardCheck, Shield } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import './MainLayout.css';

export const MainLayout = () => {
    const { user, logout, hasPermission } = useAuth();
    const location = useLocation();
    // Desktop: sidebar open by default; Mobile: closed by default
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);

    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

    // Auto close on mobile, reopen on desktop when resizing
    const handleResize = useCallback(() => {
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        } else {
            setIsSidebarOpen(true);
        }
    }, []);

    useEffect(() => {
        // WDG: passive listener for resize (performance)
        window.addEventListener('resize', handleResize, { passive: true });
        return () => window.removeEventListener('resize', handleResize);
    }, [handleResize]);

    const NAV_ITEMS = [
        { label: 'Tổng quan', path: '/', icon: LayoutDashboard },
        { label: 'Thu - Chi', path: '/transactions', icon: Receipt, permission: 'TRANSACTION_VIEW' },
        { label: 'Tất toán', path: '/settlement', icon: ClipboardCheck, permission: 'SETTLEMENT_VIEW' },
        { label: 'Báo cáo', path: '/reports', icon: FileText, permission: 'REPORT_VIEW' },
        { label: 'Quản lý Dữ liệu', path: '/admin/master-data', icon: Settings, permission: 'MASTER_DATA_VIEW' },
        { label: 'Phân quyền', path: '/admin/rbac', icon: Shield, permission: 'SYSTEM_MANAGE' },
    ];

    const filteredNavItems = NAV_ITEMS.filter(item => !item.permission || hasPermission(item.permission));

    return (
        <div className="app-layout">
            <aside className={clsx('sidebar', { 'open': isSidebarOpen, 'closed': !isSidebarOpen })}>
                <div className="sidebar-header">
                    {isSidebarOpen && (
                        <div className="logo-container">
                            <img src="/logo.png" alt="Logo" className="app-logo" />
                            <span className="logo-text">HOÀNG GIA</span>
                        </div>
                    )}
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
                                onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}
                            >
                                <Icon size={20} />
                                {isSidebarOpen && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="sidebar-footer">
                    {isSidebarOpen && (
                        <div className="user-info-wrapper">
                            <Link to="/profile" className="user-info" onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}>
                                <div className="avatar"><User size={16} /></div>
                                <div className="user-details">
                                    <p className="user-name">{user?.fullName}</p>
                                    <p className="user-role">{user?.role}</p>
                                </div>
                            </Link>
                        </div>
                    )}

                    <button onClick={logout} className="logout-btn" title="Đăng xuất">
                        <LogOut size={20} />
                        {isSidebarOpen && <span>Đăng xuất</span>}
                    </button>
                </div>
            </aside>

            {/* Application Bottom Navigation (Mobile Only) */}
            <nav className="mobile-bottom-nav">
                {filteredNavItems.map(item => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={clsx('bottom-nav-item', { active: isActive })}
                        >
                            <Icon size={22} className="nav-icon" />
                            <span className="nav-label">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Overlay — only visible on mobile when sidebar open */}
            {isSidebarOpen && window.innerWidth < 768 && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setIsSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            <main className="main-content">
                <header className="top-header">
                    <button className="mobile-menu-toggle" onClick={() => setIsSidebarOpen(true)}>
                        <Menu size={24} />
                    </button>
                    <h1 className="page-title">
                        {NAV_ITEMS.find(i => i.path === location.pathname)?.label || 'Trang chủ'}
                    </h1>
                    <div className="mobile-header-actions">
                        <div className="mobile-user-info">
                            <span className="mobile-user-role">{user?.role}</span>
                            <span className="mobile-user-name" title={user?.fullName}>{user?.fullName?.split(' ').pop() || 'User'}</span>
                        </div>
                        <button onClick={logout} className="mobile-logout-btn" title="Đăng xuất">
                            <LogOut size={18} />
                        </button>
                    </div>
                </header>
                <div className="content-area">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
