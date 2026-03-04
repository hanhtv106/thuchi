import { useState, useMemo } from 'react';
import TransactionList from '../components/features/TransactionList';
import TransactionForm from '../components/features/TransactionForm';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../context/TransactionContext';
import { Plus } from 'lucide-react';
import '../components/features/TransactionForm.css'; // Shared styles

const Transactions = () => {
    const { hasPermission } = useAuth();
    const { transactions } = useTransactions();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const unsettledSummary = useMemo(() => {
        const unsettled = transactions.filter(tx => !tx.isSettled && !tx.isDeleted && tx.status !== 'rejected');
        const income = unsettled.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = unsettled.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return { income, expense, balance: income - expense };
    }, [transactions]);

    const handleCreate = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setEditingItem(null);
    };

    if (!hasPermission('TRANSACTION_VIEW')) {
        return (
            <div className="transaction-page">
                <div className="error-container">
                    <h3>Bạn không có quyền xem danh sách giao dịch</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="transaction-page">
            <div className="summary-cards" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                <div className="card income" style={{ flex: 1, padding: '1rem', background: '#f0fdf4', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#166534', fontSize: '1rem' }}>Tổng thu (Chưa tất toán)</h3>
                    <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#15803d' }}>
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(unsettledSummary.income)}
                    </p>
                </div>
                <div className="card expense" style={{ flex: 1, padding: '1rem', background: '#fef2f2', borderRadius: '0.5rem', border: '1px solid #fecaca' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#991b1b', fontSize: '1rem' }}>Tổng chi (Chưa tất toán)</h3>
                    <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#b91c1c' }}>
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(unsettledSummary.expense)}
                    </p>
                </div>
                <div className="card balance" style={{ flex: 1, padding: '1rem', background: '#eff6ff', borderRadius: '0.5rem', border: '1px solid #bfdbfe' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e40af', fontSize: '1rem' }}>Số lượng còn lại</h3>
                    <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#1d4ed8' }}>
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(unsettledSummary.balance)}
                    </p>
                </div>
            </div>

            <div className="page-actions">
                <div className="filters">
                    {/* We can add filters here later */}
                </div>
                {hasPermission('TRANSACTION_CREATE') && (
                    <button onClick={handleCreate} className="btn-primary">
                        <Plus size={20} /> Thêm mới
                    </button>
                )}
            </div>

            <TransactionList onEdit={handleEdit} />

            {isModalOpen && (
                <TransactionForm onClose={handleClose} initialData={editingItem} />
            )}
        </div>
    );

};

export default Transactions;
