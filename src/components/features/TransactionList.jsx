import { format } from 'date-fns';
import { Edit, Trash2, CheckCircle, XCircle, Eye, Printer, RotateCcw } from 'lucide-react';
import { useTransactions } from '../../context/TransactionContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { printVoucher } from '../../utils/exportUtils';
import './TransactionList.css'; // We'll create this

const TransactionList = ({ onEdit }) => {
    const { transactions, categories, softDeleteTransaction, approveTransaction, rejectTransaction,
        revokeDecision,
        settleTransaction } = useTransactions();
    const { user, hasPermission } = useAuth();
    const { showNotification } = useNotification();

    const getCategoryName = (id) => categories.find(c => c.id === id)?.name || 'N/A';

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa?')) {
            try {
                await softDeleteTransaction(id);
                showNotification('Đã xóa giao dịch thành công');
            } catch (err) {
                showNotification('Lỗi khi xóa: ' + err.message, 'error');
            }
        }
    };

    const handleApprove = async (id) => {
        if (window.confirm('Duyệt phiếu này?')) {
            try {
                await approveTransaction(id, user.id);
                showNotification('Đã duyệt phiếu thành công');
            } catch (err) {
                showNotification('Lỗi khi duyệt: ' + err.message, 'error');
            }
        }
    };

    const handleReject = async (id) => {
        if (window.confirm('Từ chối phiếu này?')) {
            try {
                await rejectTransaction(id, user.id);
                showNotification('Đã từ chối phiếu');
            } catch (err) {
                showNotification('Lỗi: ' + err.message, 'error');
            }
        }
    };

    return (
        <div className="transaction-list">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Ngày</th>
                        <th>Loại</th>
                        <th>Hạng mục</th>
                        <th>Nội dung</th>
                        <th>Thành tiền</th>
                        <th>Trạng thái</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map(tx => (
                        <tr key={tx.id}>
                            <td>{format(new Date(tx.date), 'dd/MM/yyyy')}</td>
                            <td>
                                <span className={`badge ${tx.type}`}>
                                    {tx.type === 'income' ? 'Thu' : 'Chi'}
                                </span>
                            </td>
                            <td>{getCategoryName(tx.categoryId)}</td>
                            <td>
                                <div className="tx-content">{tx.content}</div>
                                <small>{tx.partner}</small>
                            </td>
                            <td className={`amount ${tx.type}`}>
                                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </td>
                            <td>
                                <span className={`status-badge ${tx.status}`}>
                                    {tx.status === 'pending' ? 'Chờ duyệt' :
                                        tx.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                                </span>
                            </td>
                            <td className="actions-cell">
                                {/* Hành động Sửa/Xóa */}
                                {(user.role === 'admin' || tx.status !== 'approved') && (
                                    <>
                                        {hasPermission('TRANSACTION_UPDATE') && (
                                            <button onClick={() => onEdit(tx)} className="btn-icon text-blue" title="Sửa">
                                                <Edit size={18} />
                                            </button>
                                        )}
                                        {hasPermission('TRANSACTION_DELETE') && (
                                            <button onClick={() => handleDelete(tx.id)} className="btn-icon text-red" title="Xóa">
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </>
                                )}

                                <button onClick={() => printVoucher(tx)} className="btn-icon text-gray" title="In phiếu">
                                    <Printer size={18} />
                                </button>

                                {/* Hành động Duyệt (Kế toán/Admin) */}
                                {hasPermission('TRANSACTION_APPROVE') && tx.status === 'pending' && (
                                    <>
                                        <button onClick={() => handleApprove(tx.id)} className="btn-icon text-green" title="Duyệt">
                                            <CheckCircle size={18} />
                                        </button>
                                        <button onClick={() => handleReject(tx.id)} className="btn-icon text-orange" title="Từ chối">
                                            <XCircle size={18} />
                                        </button>
                                    </>
                                )}

                                {/* Admin/Accountant Revert Decision */}
                                {(user.role === 'admin' || user.role === 'accountant') && (tx.status === 'approved' || tx.status === 'rejected') && (
                                    <button
                                        onClick={async () => {
                                            const actionText = tx.status === 'approved' ? 'hủy duyệt' : 'hủy từ chối';
                                            if (window.confirm(`Bạn có chắc muốn ${actionText} phiếu này?`)) {
                                                try {
                                                    await revokeDecision(tx.id);
                                                    showNotification(`Đã ${actionText} thành công`);
                                                } catch (err) {
                                                    showNotification('Lỗi: ' + err.message, 'error');
                                                }
                                            }
                                        }}
                                        className="btn-icon text-orange"
                                        title={tx.status === 'approved' ? 'Hủy duyệt' : 'Hủy từ chối'}
                                    >
                                        <RotateCcw size={18} />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {transactions.length === 0 && (
                        <tr>
                            <td colSpan="7" className="text-center">Chưa có dữ liệu</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default TransactionList;
