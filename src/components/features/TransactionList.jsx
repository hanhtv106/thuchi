import { memo, useCallback } from 'react';
import { format } from 'date-fns';
import { Edit, Trash2, CheckCircle, XCircle, Printer, RotateCcw, Paperclip } from 'lucide-react';
import { useTransactions } from '../../context/TransactionContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { printVoucher } from '../../utils/exportUtils';
import './TransactionList.css';

// ─── Module-level constants (rendering-hoist-jsx) ───────────────
const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const fmtCurrency = (v) => fmt.format(v ?? 0);
const STATUS_LABEL = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' };
const TYPE_LABEL   = { income: 'Thu', expense: 'Chi' };

// ─── Shared atoms ──────────────────────────────────────────────
const TypeBadge = memo(({ type }) => (
    <span className={`badge badge--${type}`}>{TYPE_LABEL[type]}</span>
));
TypeBadge.displayName = 'TypeBadge';

const StatusBadge = memo(({ status }) => (
    <span className={`status-badge status-badge--${status}`}>{STATUS_LABEL[status] ?? status}</span>
));
StatusBadge.displayName = 'StatusBadge';

// Amount display block — reused in both card and table
const AmountBlock = memo(({ tx, className = '' }) => {
    const sign = tx.type === 'income' ? '+' : '-';
    return (
        <div className={`amount amount--${tx.type} ${className}`}>
            <div className="amount__final">{sign}{fmtCurrency(tx.amount)}</div>
            {tx.vatPercentage > 0 && (
                <div className="amount__hint">VAT {tx.vatPercentage}%</div>
            )}
            {tx.discountPercentage > 0 && (
                <div className="amount__hint amount__hint--discount">
                    Giảm {tx.discountPercentage}%
                </div>
            )}
        </div>
    );
});
AmountBlock.displayName = 'AmountBlock';

// Action buttons — reused in both card and table
const Actions = memo(({ tx, onEdit, onDelete, onApprove, onReject, onRevoke, canEdit, canDelete, canApprove }) => {
    const canModify = canEdit && tx.status !== 'approved';
    return (
        <div className="actions-cell">
            {canModify && (
                <button onClick={() => onEdit(tx)} className="btn-icon btn-icon--blue" aria-label="Sửa phiếu" title="Sửa">
                    <Edit size={16} aria-hidden="true" />
                </button>
            )}
            {canDelete && canModify && (
                <button onClick={() => onDelete(tx.id)} className="btn-icon btn-icon--red" aria-label="Xóa phiếu" title="Xóa">
                    <Trash2 size={16} aria-hidden="true" />
                </button>
            )}
            <button onClick={() => printVoucher(tx)} className="btn-icon btn-icon--gray" aria-label="In phiếu" title="In">
                <Printer size={16} aria-hidden="true" />
            </button>
            {canApprove && tx.status === 'pending' && (
                <>
                    <button onClick={() => onApprove(tx.id)} className="btn-icon btn-icon--green" aria-label="Duyệt phiếu" title="Duyệt">
                        <CheckCircle size={16} aria-hidden="true" />
                    </button>
                    <button onClick={() => onReject(tx.id)} className="btn-icon btn-icon--orange" aria-label="Từ chối" title="Từ chối">
                        <XCircle size={16} aria-hidden="true" />
                    </button>
                </>
            )}
            {canApprove && (tx.status === 'approved' || tx.status === 'rejected') && (
                <button
                    onClick={() => onRevoke(tx.id, tx.status)}
                    className="btn-icon btn-icon--orange"
                    aria-label={tx.status === 'approved' ? 'Hủy duyệt' : 'Hủy từ chối'}
                    title={tx.status === 'approved' ? 'Hủy duyệt' : 'Hủy từ chối'}
                >
                    <RotateCcw size={16} aria-hidden="true" />
                </button>
            )}
        </div>
    );
});
Actions.displayName = 'Actions';

// ─── MOBILE: Card view ─────────────────────────────────────────
const TxCard = memo(({ tx, categoryName, partnerName, actionProps }) => (
    <article className={`tx-card tx-card--${tx.status}`} aria-label={`Giao dịch: ${tx.content}`}>
        {/* Row 1: date + badge + amount */}
        <div className="tx-card__top">
            <div className="tx-card__meta">
                <time className="tx-card__date" dateTime={tx.date}>
                    {format(new Date(tx.date), 'dd/MM/yyyy')}
                </time>
                {tx.voucherCode && (
                    <span className="tx-card__voucher">#{tx.voucherCode}</span>
                )}
            </div>
            <div className="tx-card__badges">
                <TypeBadge type={tx.type} />
                <StatusBadge status={tx.status} />
            </div>
        </div>

        {/* Row 2: content */}
        <div className="tx-card__content">
            <p className="tx-card__title">
                {tx.content}
                {tx.attachments?.length > 0 && (
                    <span className="attachment-indicator" aria-label={`${tx.attachments.length} đính kèm`}>
                        <Paperclip size={12} aria-hidden="true" />
                    </span>
                )}
            </p>
            <p className="tx-card__sub">
                {categoryName}{partnerName ? ` · ${partnerName}` : ''}
            </p>
        </div>

        {/* Row 3: amount + actions */}
        <div className="tx-card__footer">
            <AmountBlock tx={tx} />
            <Actions {...actionProps} tx={tx} />
        </div>
    </article>
));
TxCard.displayName = 'TxCard';

// ─── DESKTOP: Table cells ──────────────────────────────────────
const TableRow = memo(({ tx, categoryName, partnerName, actionProps }) => (
    <tr className={`tx-row tx-row--${tx.status}`}>
        <td className="tx-date">{format(new Date(tx.date), 'dd/MM/yyyy')}</td>
        <td className="tx-voucher">{tx.voucherCode || '—'}</td>
        <td><TypeBadge type={tx.type} /></td>
        <td>{categoryName}</td>
        <td>
            <div className="tx-content">
                <span className="tx-content__text">{tx.content}</span>
                {tx.attachments?.length > 0 && (
                    <span className="attachment-indicator" aria-label={`${tx.attachments.length} đính kèm`}>
                        <Paperclip size={13} aria-hidden="true" />
                    </span>
                )}
            </div>
            {partnerName && <small className="tx-partner">Đối tác: {partnerName}</small>}
        </td>
        <td><AmountBlock tx={tx} /></td>
        <td><StatusBadge status={tx.status} /></td>
        <td><Actions {...actionProps} tx={tx} /></td>
    </tr>
));
TableRow.displayName = 'TableRow';

// ─── Empty state ───────────────────────────────────────────────
const EmptyState = () => (
    <div className="empty-state" role="status">
        <Printer size={36} strokeWidth={1.2} aria-hidden="true" />
        <p>Chưa có giao dịch nào</p>
    </div>
);

// ─── Main Component ────────────────────────────────────────────
const TransactionList = ({ onEdit }) => {
    const { transactions, categories, partners,
            softDeleteTransaction, approveTransaction,
            rejectTransaction, revokeDecision } = useTransactions();
    const { hasPermission } = useAuth();
    const { showNotification } = useNotification();

    // O(1) lookup maps (js-index-maps)
    const categoryMap = useCallback(
        (id) => categories.find(c => c.id === id)?.name ?? '—',
        [categories]
    );
    const partnerMap = useCallback(
        (id) => partners.find(p => p.id === id)?.name ?? '',
        [partners]
    );

    // Permissions computed once (rerender-derived-state)
    const canEdit    = hasPermission('TRANSACTION_UPDATE');
    const canDelete  = hasPermission('TRANSACTION_DELETE');
    const canApprove = hasPermission('TRANSACTION_APPROVE');

    // Stable handlers (rerender-functional-setstate)
    const handleDelete = useCallback(async (id) => {
        if (!window.confirm('Xóa phiếu này?')) return;
        try { await softDeleteTransaction(id); showNotification('Đã xóa giao dịch'); }
        catch (err) { showNotification('Lỗi xóa: ' + err.message, 'error'); }
    }, [softDeleteTransaction, showNotification]);

    const handleApprove = useCallback(async (id) => {
        if (!window.confirm('Duyệt phiếu này?')) return;
        try { await approveTransaction(id); showNotification('Đã duyệt phiếu'); }
        catch (err) { showNotification('Lỗi duyệt: ' + err.message, 'error'); }
    }, [approveTransaction, showNotification]);

    const handleReject = useCallback(async (id) => {
        if (!window.confirm('Từ chối phiếu này?')) return;
        try { await rejectTransaction(id); showNotification('Đã từ chối phiếu'); }
        catch (err) { showNotification('Lỗi: ' + err.message, 'error'); }
    }, [rejectTransaction, showNotification]);

    const handleRevoke = useCallback(async (id, status) => {
        const label = status === 'approved' ? 'hủy duyệt' : 'hủy từ chối';
        if (!window.confirm(`${label} phiếu này?`)) return;
        try { await revokeDecision(id); showNotification(`Đã ${label}`); }
        catch (err) { showNotification('Lỗi: ' + err.message, 'error'); }
    }, [revokeDecision, showNotification]);

    // Shared action props — pass as single object to avoid prop drilling
    const actionProps = {
        onEdit, onDelete: handleDelete, onApprove: handleApprove,
        onReject: handleReject, onRevoke: handleRevoke,
        canEdit, canDelete, canApprove,
    };

    if (transactions.length === 0) {
        return (
            <div className="transaction-list" role="region" aria-label="Danh sách giao dịch">
                <EmptyState />
            </div>
        );
    }

    return (
        <div className="transaction-list" role="region" aria-label="Danh sách giao dịch">

            {/* ── Mobile card list ── hidden on ≥ 768px via CSS */}
            <div className="tx-card-list" aria-label="Danh sách phiếu" role="list">
                {transactions.map(tx => (
                    <TxCard
                        key={tx.id}
                        tx={tx}
                        categoryName={categoryMap(tx.categoryId)}
                        partnerName={partnerMap(tx.partnerId)}
                        actionProps={actionProps}
                    />
                ))}
            </div>

            {/* ── Desktop table ── hidden on < 768px via CSS */}
            <table className="data-table" aria-label="Bảng giao dịch thu chi">
                <thead>
                    <tr>
                        <th scope="col">Ngày</th>
                        <th scope="col">Số HĐ</th>
                        <th scope="col">Loại</th>
                        <th scope="col">Hạng mục</th>
                        <th scope="col">Nội dung</th>
                        <th scope="col">Thực thanh toán</th>
                        <th scope="col">Trạng thái</th>
                        <th scope="col">Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map(tx => (
                        <TableRow
                            key={tx.id}
                            tx={tx}
                            categoryName={categoryMap(tx.categoryId)}
                            partnerName={partnerMap(tx.partnerId)}
                            actionProps={actionProps}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TransactionList;
