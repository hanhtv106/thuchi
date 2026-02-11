import { useState } from 'react';
import { useTransactions } from '../context/TransactionContext';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { RefreshCcw, Trash2 } from 'lucide-react';

const AdminPage = () => {
    const { allTransactions, updateTransaction } = useTransactions();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('trash');

    // Only Admin can access
    if (user.role !== 'admin') {
        return <div style={{ padding: '2rem' }}>Bạn không có quyền truy cập trang này.</div>;
    }

    const deletedTransactions = allTransactions.filter(t => t.isDeleted);

    const handleRestore = async (id) => {
        if (window.confirm('Khôi phục giao dịch này?')) {
            const tx = allTransactions.find(t => t.id === id);
            await updateTransaction(id, { ...tx, isDeleted: false, deletedAt: null });
        }
    };

    const handleHardDelete = async (id) => {
        if (window.confirm('Xóa vĩnh viễn? Hành động này không thể hoàn tác!')) {
            // In a real app we would call a delete API. 
            // Here updateTransaction doesn't support hard delete via this context method directly 
            // unless we add a hardDelete method. 
            // For now, let's just say "Not implemented for safety" or implement it if needed.
            // But requirement said "Khôi phục dữ liệu đã xóa mềm".
            alert('Chức năng xóa vĩnh viễn chưa được kích hoạt để bảo vệ dữ liệu.');
        }
    };

    return (
        <div style={{ padding: '1rem' }}>
            <h2>Quản trị hệ thống</h2>

            <div style={{ marginTop: '1rem', borderBottom: '1px solid #ccc', display: 'flex', gap: '1rem' }}>
                <button
                    onClick={() => setActiveTab('trash')}
                    style={{ padding: '0.5rem 1rem', background: activeTab === 'trash' ? '#e5e7eb' : 'white', border: 'none', cursor: 'pointer' }}
                >
                    Thùng rác ({deletedTransactions.length})
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    style={{ padding: '0.5rem 1rem', background: activeTab === 'users' ? '#e5e7eb' : 'white', border: 'none', cursor: 'pointer' }}
                >
                    Quản lý người dùng
                </button>
            </div>

            <div style={{ marginTop: '1rem' }}>
                {activeTab === 'trash' && (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Ngày xóa</th>
                                <th>Nội dung</th>
                                <th>Số tiền</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deletedTransactions.map(tx => (
                                <tr key={tx.id}>
                                    <td>{tx.deletedAt ? format(new Date(tx.deletedAt), 'dd/MM/yyyy HH:mm') : 'N/A'}</td>
                                    <td>{tx.content}</td>
                                    <td>{new Intl.NumberFormat('vi-VN').format(tx.amount)}</td>
                                    <td style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => handleRestore(tx.id)} className="btn-icon text-green" title="Khôi phục">
                                            <RefreshCcw size={18} />
                                        </button>
                                        <button onClick={() => handleHardDelete(tx.id)} className="btn-icon text-red" title="Xóa vĩnh viễn">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {deletedTransactions.length === 0 && (
                                <tr><td colSpan="4" className="text-center">Thùng rác trống</td></tr>
                            )}
                        </tbody>
                    </table>
                )}

                {activeTab === 'users' && (
                    <div>
                        <p>Danh sách người dùng (Mock Data):</p>
                        <ul>
                            <li>Admin (admin) - Quản trị viên</li>
                            <li>Manager (manager) - Kế toán trưởng</li>
                            <li>Staff (employee) - Nhân viên</li>
                        </ul>
                        <p><em>Chức năng thêm/sửa/xóa người dùng sẽ được phát triển tiếp.</em></p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPage;
