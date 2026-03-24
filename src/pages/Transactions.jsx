import { useState, useMemo, memo } from 'react';
import TransactionList from '../components/features/TransactionList';
import TransactionForm from '../components/features/TransactionForm';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../context/TransactionContext';
import { Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import '../components/features/TransactionForm.css';
import './Transactions.css';

// ── Module-level formatter (js-cache-function-results) ──────────
const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

// ── Card config (hoist static data — rendering-hoist-jsx) ───────
const CARD_CONFIG = [
    {
        id: 'income',
        label: 'Tổng thu',
        sublabel: 'chưa tất toán',
        icon: TrendingUp,
        colorClass: 'income',
    },
    {
        id: 'expense',
        label: 'Tổng chi',
        sublabel: 'chưa tất toán',
        icon: TrendingDown,
        colorClass: 'expense',
    },
    {
        id: 'balance',
        label: 'Số dư',
        sublabel: 'còn lại',
        icon: Wallet,
        colorClass: 'balance',
    },
];

// ── SummaryCard — Composition: explicit variants via colorClass ──
const SummaryCard = memo(({ label, sublabel, value, colorClass, icon: Icon }) => (
    <article className={`kpi-card kpi-card--${colorClass}`} aria-label={`${label}: ${fmt.format(value)}`}>
        <div className="kpi-card__icon-wrap" aria-hidden="true">
            <Icon size={20} strokeWidth={2.5} />
        </div>
        <div className="kpi-card__body">
            <p className="kpi-card__label">
                {label} <span className="kpi-card__sublabel">{sublabel}</span>
            </p>
            <p className="kpi-card__value">{fmt.format(value)}</p>
        </div>
    </article>
));
SummaryCard.displayName = 'SummaryCard';

// ── Toolbar — separate atom for clarity ────────────────────────
const Toolbar = memo(({ canCreate, onCreate }) => (
    <div className="tx-toolbar" role="toolbar" aria-label="Hành động giao dịch">
        {canCreate && (
            <button
                id="btn-add-transaction"
                onClick={onCreate}
                className="btn-add"
                aria-label="Thêm mới giao dịch"
            >
                <Plus size={16} aria-hidden="true" strokeWidth={2.5} />
                <span>Thêm mới</span>
            </button>
        )}
    </div>
));
Toolbar.displayName = 'Toolbar';

// ── Main page component ─────────────────────────────────────────
const Transactions = () => {
    const { hasPermission } = useAuth();
    const { transactions } = useTransactions();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    // rerender-derived-state: derive in render, not effects
    const summary = useMemo(() => {
        const active = transactions.filter(tx => !tx.isSettled && !tx.isDeleted && tx.status !== 'rejected');
        const income  = active.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = active.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        return { income, expense, balance: income - expense };
    }, [transactions]);

    const handleCreate = () => { setEditingItem(null); setIsModalOpen(true); };
    const handleEdit   = (item) => { setEditingItem(item); setIsModalOpen(true); };
    const handleClose  = () => { setIsModalOpen(false); setEditingItem(null); };

    if (!hasPermission('TRANSACTION_VIEW')) {
        return (
            <div className="tx-page">
                <div className="tx-page__denied">
                    <Wallet size={40} strokeWidth={1.5} />
                    <p>Bạn không có quyền xem danh sách giao dịch.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tx-page">
            {/* ── KPI Cards ──────────────────────────────── */}
            <section className="kpi-grid" role="region" aria-label="Tóm tắt tài chính">
                {CARD_CONFIG.map(cfg => (
                    <SummaryCard
                        key={cfg.id}
                        label={cfg.label}
                        sublabel={cfg.sublabel}
                        value={summary[cfg.id]}
                        colorClass={cfg.colorClass}
                        icon={cfg.icon}
                    />
                ))}
            </section>

            {/* ── Toolbar ────────────────────────────────── */}
            <Toolbar canCreate={hasPermission('TRANSACTION_CREATE')} onCreate={handleCreate} />

            {/* ── Data table ─────────────────────────────── */}
            <section className="tx-table-section" aria-label="Danh sách giao dịch">
                <TransactionList onEdit={handleEdit} />
            </section>

            {/* ── Modal ──────────────────────────────────── */}
            {isModalOpen && (
                <TransactionForm onClose={handleClose} initialData={editingItem} />
            )}
        </div>
    );
};

export default Transactions;
