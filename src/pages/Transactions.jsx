import { useState } from 'react';
import TransactionList from '../components/features/TransactionList';
import TransactionForm from '../components/features/TransactionForm';
import { useAuth } from '../context/AuthContext';
import { Plus } from 'lucide-react';
import '../components/features/TransactionForm.css'; // Shared styles

const Transactions = () => {
    const { hasPermission } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

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
