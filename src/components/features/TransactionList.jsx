import { memo, useCallback } from 'react';
import { format } from 'date-fns';
import { Edit, Trash2, CheckCircle, XCircle, Printer, RotateCcw, Paperclip } from 'lucide-react';
import { useTransactions } from '../../context/TransactionContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { printVoucher } from '../../utils/exportUtils';
import './TransactionList.css';

// ─── Formatter ─────────────────────────────────────────────────────────────────
const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

const STATUS_LABEL = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' };
const TYPE_LABEL   = { income: 'Thu', expense: 'Chi' };

// ─── Atomic Sub-components (Composition pattern) ────────────────────────────────

/** Badge hiển thị loại Thu/Chi */
const TypeBadge = memo(({ type }) => (
    <span className={`badge badge--${type}`} aria-label={TYPE_LABEL[type]}>
        {TYPE_LABEL[type]}
    </span>
));
TypeBadge.displayName = 'TypeBadge';

/** Badge trạng thái duyệt */
const StatusBadge = memo(({ status }) => (
    <span className={`status-badge status-badge--${status}`}>
        {STATUS_LABEL[status] ?? status}
    </span>
));
StatusBadge.displayName = 'StatusBadge';

/** Cột số tiền — hiển thị subtotal + VAT hint + discount hint */
const AmountCell = memo(({ tx }) => {
    const subtotal  = (tx.quantity ?? 1) * (tx.unitPrice ?? 0);
    const sign      = tx.type === 'income' ? '+' : '-';
    return (
        <td className={`amount amount--${tx.type}`}>
            <div className="amount__final">{sign}{formatCurrency(tx.amount)}</div>
            {tx.vatPercentage > 0 && (
                <div className="amount__hint">VAT {tx.vatPercentage}%</div>
            )}
            {tx.discountPercentage > 0 && (
                <div className="amount__hint amount__hint--discount">
                    Giảm {tx.discountPercentage}% (−{formatCurrency(tx.discountAmount)})
                </div>
            )}
        </td>
    );
});
AmountCell.displayName = 'AmountCell';

/** Cột nội dung + partner */
const ContentCell = memo(({ content, attachmentsCount, partnerName }) => (
    <td>
        <div className="tx-content">
            <span className="tx-content__text">{content}</span>
            {attachmentsCount > 0 && (
                <span
                    className="attachment-indicator"
                    title={`${attachmentsCount} tệp đính kèm`}
                    aria-label={`${attachmentsCount} tệp đính kèm`}
                >
                    <Paperclip size={14} aria-hidden="true" />
                </span>
            )}
        </div>
        {partnerName && (
            <small className="tx-partner">Đối tác: {partnerName}</small>
        )}
    </td>
));
ContentCell.displayName = 'ContentCell';

/** Nhóm nút hành động — Compound component pattern */
const ActionCell = memo(({ tx, onEdit, onDelete, onApprove, onReject, onRevoke, canEdit, canDelete, canApprove }) => {
    const canModify = canEdit && (tx.status !== 'approved');
    return (
        <td className="actions-cell">
            {canModify && (
                <button
                    onClick={() => onEdit(tx)}
                    className="btn-icon btn-icon--blue"
                    title="Sửa phiếu"
                    aria-label="Sửa phiếu"
                >
                    <Edit size={17} aria-hidden="true" />
                </button>
            )}
            {canDelete && canModify && (
                <button
                    onClick={() => onDelete(tx.id)}
                    className="btn-icon btn-icon--red"
                    title="Xóa phiếu"
                    aria-label="Xóa phiếu"
                >
                    <Trash2 size={17} aria-hidden="true" />
                </button>
            )}

            <button
                onClick={() => printVoucher(tx)}
                className="btn-icon btn-icon--gray"
                title="In phiếu"
                aria-label="In phiếu"
            >
                <Printer size={17} aria-hidden="true" />
            </button>

            {canApprove && tx.status === 'pending' && (
                <>
                    <button onClick={() => onApprove(tx.id)} className="btn-icon btn-icon--green" title="Duyệt" aria-label="Duyệt phiếu">
                        <CheckCircle size={17} aria-hidden="true" />
                    </button>
                    <button onClick={() => onReject(tx.id)} className="btn-icon btn-icon--orange" title="Từ chối" aria-label="Từ chối phiếu">
                        <XCircle size={17} aria-hidden="true" />
                    </button>
                </>
            )}

            {canApprove && (tx.status === 'approved' || tx.status === 'rejected') && (
                <button
                    onClick={() => onRevoke(tx.id, tx.status)}
                    className="btn-icon btn-icon--orange"
                    title={tx.status === 'approved' ? 'Hủy duyệt' : 'Hủy từ chối'}
                    aria-label={tx.status === 'approved' ? 'Hủy duyệt phiếu' : 'Hủy từ chối phiếu'}
                >
                    <RotateCcw size={17} aria-hidden="true" />
                </button>
            )}
        </td>
    );
});
ActionCell.displayName = 'ActionCell';

/** Hàng trống khi chưa có dữ liệu */
const EmptyRow = () => (
    <tr>
        <td colSpan={8} className="empty-state">
            Chưa có giao dịch nào
        </td>
    </tr>
);

// ─── Main Component ─────────────────────────────────────────────────────────────

const TransactionList = ({ onEdit }) => {
    const { transactions, categories, partners, softDeleteTransaction, approveTransaction, rejectTransaction, revokeDecision } = useTransactions();
    const { hasPermission } = useAuth();
    const { showNotification } = useNotification();

    // Memoized lookup maps — O(1) thay vì O(n) mỗi render (js-index-maps)
    const categoryMap = useCallback(
        (id) => categories.find(c => c.id === id)?.name ?? '—',
        [categories]
    );
    const partnerMap = useCallback(
        (id) => partners.find(p => p.id === id)?.name ?? '',
        [partners]
    );

    // Permissions — tính 1 lần, không tính trong JSX (rerender-derived-state)
    const canEdit    = hasPermission('TRANSACTION_UPDATE');
    const canDelete  = hasPermission('TRANSACTION_DELETE');
    const canApprove = hasPermission('TRANSACTION_APPROVE');

    // Handlers — useCallback để tránh re-render con (rerender-functional-setstate)
    const handleDelete = useCallback(async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa phiếu này?')) return;
        try {
            await softDeleteTransaction(id);
            showNotification('Đã xóa giao dịch thành công');
        } catch (err) {
            showNotification('Lỗi khi xóa: ' + (err.message ?? 'Không xác định'), 'error');
        }
    }, [softDeleteTransaction, showNotification]);

    const handleApprove = useCallback(async (id) => {
        if (!window.confirm('Duyệt phiếu này?')) return;
        try {
            await approveTransaction(id);
            showNotification('Đã duyệt phiếu thành công');
        } catch (err) {
            showNotification('Lỗi khi duyệt: ' + (err.message ?? 'Không xác định'), 'error');
        }
    }, [approveTransaction, showNotification]);

    const handleReject = useCallback(async (id) => {
        if (!window.confirm('Từ chối phiếu này?')) return;
        try {
            await rejectTransaction(id);
            showNotification('Đã từ chối phiếu');
        } catch (err) {
            showNotification('Lỗi: ' + (err.message ?? 'Không xác định'), 'error');
        }
    }, [rejectTransaction, showNotification]);

    const handleRevoke = useCallback(async (id, status) => {
        const label = status === 'approved' ? 'hủy duyệt' : 'hủy từ chối';
        if (!window.confirm(`Bạn có chắc muốn ${label} phiếu này?`)) return;
        try {
            await revokeDecision(id);
            showNotification(`Đã ${label} thành công`);
        } catch (err) {
            showNotification('Lỗi: ' + (err.message ?? 'Không xác định'), 'error');
        }
    }, [revokeDecision, showNotification]);

    return (
        <div className="transaction-list" role="region" aria-label="Danh sách giao dịch">
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
                    {transactions.length === 0 ? (
                        <EmptyRow />
                    ) : (
                        transactions.map(tx => (
                            <tr key={tx.id} className={`tx-row tx-row--${tx.status}`}>
                                <td className="tx-date">
                                    {format(new Date(tx.date), 'dd/MM/yyyy')}
                                </td>
                                <td className="tx-voucher">{tx.voucherCode || '—'}</td>
                                <td><TypeBadge type={tx.type} /></td>
                                <td>{categoryMap(tx.categoryId)}</td>
                                <ContentCell
                                    content={tx.content}
                                    attachmentsCount={tx.attachments?.length ?? 0}
                                    partnerName={partnerMap(tx.partnerId)}
                                />
                                <AmountCell tx={tx} />
                                <td><StatusBadge status={tx.status} /></td>
                                <ActionCell
                                    tx={tx}
                                    onEdit={onEdit}
                                    onDelete={handleDelete}
                                    onApprove={handleApprove}
                                    onReject={handleReject}
                                    onRevoke={handleRevoke}
                                    canEdit={canEdit}
                                    canDelete={canDelete}
                                    canApprove={canApprove}
                                />
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default TransactionList;
