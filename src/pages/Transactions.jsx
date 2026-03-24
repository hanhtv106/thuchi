import { useState, useMemo } from 'react';
import TransactionList from '../components/features/TransactionList';
import TransactionForm from '../components/features/TransactionForm';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../context/TransactionContext';
import { Plus } from 'lucide-react';
import '../components/features/TransactionForm.css';
import './Transactions.css';

// ── Formatters (module-level, never recreated) ──────────────────
const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

// ── Summary Card atom ───────────────────────────────────────────
const SummaryCard = ({ label, value, colorClass }) => (
    <div className={`summary-card summary-card--${colorClass}`}>
        <p className="summary-card__label">{label}</p>
        <p className="summary-card__value">{fmt.format(value)}</p>
    </div>
);

// ── Main page ───────────────────────────────────────────────────
const Transactions = () => {
    const { hasPermission } = useAuth();
    const { transactions } = useTransactions();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const summary = useMemo(() => {
        const active = transactions.filter(tx => !tx.isSettled && !tx.isDeleted && tx.status !== 'rejected');
        const income  = active.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = active.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        return { income, expense, balance: income - expense };
    }, [transactions]);

    const handleCreate = () => { setEditingItem(null); setIsModalOpen(true); };
    const handleEdit   = (item) => { setEditingItem(item);  setIsModalOpen(true); };
    const handleClose  = () => { setIsModalOpen(false); setEditingItem(null); };

    if (!hasPermission('TRANSACTION_VIEW')) {
        return (
            <div className="tx-page">
                <div className="tx-page__denied">
                    <p>Bạn không có quyền xem danh sách giao dịch.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tx-page">
            {/* ── Summary cards ─────────────────────────────── */}
            <div className="summary-cards" role="region" aria-label="Tóm tắt tài chính">
                <SummaryCard label="Tổng thu (chưa tất toán)" value={summary.income}  colorClass="income"  />
                <SummaryCard label="Tổng chi (chưa tất toán)" value={summary.expense} colorClass="expense" />
                <SummaryCard label="Số dư còn lại"            value={summary.balance} colorClass="balance" />
            </div>

            {/* ── Toolbar ───────────────────────────────────── */}
            <div className="tx-page__toolbar">
                {hasPermission('TRANSACTION_CREATE') && (
                    <button
                        id="btn-add-transaction"
                        onClick={handleCreate}
                        className="btn-add"
                        aria-label="Thêm mới giao dịch"
                    >
                        <Plus size={18} aria-hidden="true" />
                        <span>Thêm mới</span>
                    </button>
                )}
            </div>

            {/* ── Table ─────────────────────────────────────── */}
            <TransactionList onEdit={handleEdit} />

            {/* ── Modal ─────────────────────────────────────── */}
            {isModalOpen && (
                <TransactionForm onClose={handleClose} initialData={editingItem} />
            )}
        </div>
    );
};

export default Transactions;
