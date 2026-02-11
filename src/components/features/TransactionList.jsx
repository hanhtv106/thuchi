import { format } from 'date-fns';
import { Edit, Trash2, CheckCircle, XCircle, Eye, Printer, RotateCcw } from 'lucide-react';
import { useTransactions } from '../../context/TransactionContext';
import { useAuth } from '../../context/AuthContext';
import { printVoucher } from '../../utils/exportUtils';
import './TransactionList.css'; // We'll create this

const TransactionList = ({ onEdit }) => {
    const { transactions, categories, softDeleteTransaction, approveTransaction, rejectTransaction, revokeApproval } = useTransactions();
    const { user } = useAuth();

    const getCategoryName = (id) => categories.find(c => c.id === id)?.name || 'N/A';

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa?')) {
            await softDeleteTransaction(id);
        }
    };

    const handleApprove = async (id) => {
        if (window.confirm('Duyệt phiếu này?')) {
            await approveTransaction(id, user.id);
        }
    };

    const handleReject = async (id) => {
        if (window.confirm('Từ chối phiếu này?')) {
            await rejectTransaction(id, user.id);
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
                                {/* Edit/Delete Actions */}
                                {/* Logic: Admin can edit anything. Others can only edit if NOT approved. */}
                                {(user.role === 'admin' || tx.status !== 'approved') && (
                                    <>
                                        <button onClick={() => onEdit(tx)} className="btn-icon text-blue" title="Sửa">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(tx.id)} className="btn-icon text-red" title="Xóa">
                                            <Trash2 size={18} />
                                        </button>
                                    </>
                                )}

                                <button onClick={() => printVoucher(tx)} className="btn-icon text-gray" title="In phiếu">
                                    <Printer size={18} />
                                </button>

                                {/* Accountant Actions */}
                                {(user.role === 'accountant' || user.role === 'admin') && tx.status === 'pending' && (
                                    <>
                                        <button onClick={() => handleApprove(tx.id)} className="btn-icon text-green" title="Duyệt">
                                            <CheckCircle size={18} />
                                        </button>
                                        <button onClick={() => handleReject(tx.id)} className="btn-icon text-orange" title="Từ chối">
                                            <XCircle size={18} />
                                        </button>
                                    </>
                                )}

                                {/* Admin Revert Approval */}
                                {user.role === 'admin' && tx.status === 'approved' && (
                                    <button
                                        onClick={async () => {
                                            if (window.confirm('Hủy duyệt phiếu này?')) await revokeApproval(tx.id);
                                        }}
                                        className="btn-icon text-orange"
                                        title="Hủy duyệt"
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
