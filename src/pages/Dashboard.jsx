import { useMemo } from 'react';
import { useTransactions } from '../context/TransactionContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import '../pages/Reports.css'; // Reuse CSS

const Dashboard = () => {
    const { transactions, isLoading } = useTransactions();
    const { user, hasPermission } = useAuth();

    const summary = useMemo(() => {
        // Current month summary
        const now = new Date();
        const currentMonthData = transactions.filter(tx => {
            const d = new Date(tx.date);
            return d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear() &&
                tx.status === 'approved' && !tx.isDeleted;
        });

        const income = currentMonthData.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = currentMonthData.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        return { income, expense, balance: income - expense };
    }, [transactions]);

    const pendingCount = transactions.filter(t => t.status === 'pending' && !t.isDeleted).length;

    if (isLoading) return <div style={{ padding: '2rem' }}>Đang tải dữ liệu...</div>;

    // Check View Permission
    if (!hasPermission('TRANSACTION_VIEW')) {
        return (
            <div className="dashboard">
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <h2>Xin chào, {user?.fullName}!</h2>
                    <p>Chào mừng bạn quay trở lại hệ thống.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div style={{ marginBottom: '2rem' }}>
                <h2>Xin chào, {user?.fullName}!</h2>
                <p>Tổng quan tài chính tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</p>
            </div>

            <div className="summary-cards" style={{ marginBottom: '2rem' }}>
                <div className="card income">
                    <h3>Thu tháng này</h3>
                    <p>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary.income)}</p>
                </div>
                <div className="card expense">
                    <h3>Chi tháng này</h3>
                    <p>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary.expense)}</p>
                </div>
                <div className="card balance">
                    <h3>Số dư tháng này</h3>
                    <p>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary.balance)}</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="card">
                    <h3>Trạng thái Phê duyệt</h3>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#d97706' }}>
                            {pendingCount}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontWeight: 500 }}>Phiếu chờ duyệt</p>
                            <Link to="/transactions" style={{ color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                                Xem chi tiết <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3>Truy cập nhanh</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                        {hasPermission('TRANSACTION_CREATE') && (
                            <Link to="/transactions" className="btn-outline" style={{ justifyContent: 'center', textDecoration: 'none' }}>
                                Tạo phiếu mới
                            </Link>
                        )}
                        <Link to="/reports" className="btn-outline" style={{ justifyContent: 'center', textDecoration: 'none' }}>
                            Xem báo cáo
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
