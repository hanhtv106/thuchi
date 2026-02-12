import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import supabaseService from '../services/supabaseService';
import { useAuth } from './AuthContext';

const TransactionContext = createContext(null);

export const useTransactions = () => useContext(TransactionContext);

export const TransactionProvider = ({ children }) => {
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    const [partners, setPartners] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, hasPermission } = useAuth();

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [txs, cats, us, ps] = await Promise.all([
                supabaseService.getAllTransactions(),
                supabaseService.getAllCategories(),
                supabaseService.getAllUnits(),
                supabaseService.getAllPartners()
            ]);
            // Sắp xếp theo ngày giảm dần
            txs.sort((a, b) => new Date(b.date) - new Date(a.date));
            setTransactions(txs);
            setCategories(cats);
            setUnits(us);
            setPartners(ps);
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) refreshData();
    }, [refreshData, user]);

    const addTransaction = async (data) => {
        if (!hasPermission('TRANSACTION_CREATE')) {
            throw new Error('Bạn không có quyền tạo phiếu thu chi');
        }
        const newTx = {
            ...data,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            createdBy: user.uid,
            isDeleted: false,
            status: 'pending'
        };
        await supabaseService.addTransaction(newTx);
        await refreshData();
        return newTx;
    };

    const updateTransaction = async (id, data) => {
        if (!hasPermission('TRANSACTION_UPDATE')) {
            throw new Error('Bạn không có quyền sửa phiếu thu chi');
        }
        const existing = transactions.find(t => t.id === id);
        if (!existing) throw new Error('Không tìm thấy giao dịch');

        const updated = { ...existing, ...data };
        await supabaseService.updateTransaction(updated);
        await refreshData();
        return updated;
    };

    const softDeleteTransaction = async (id) => {
        if (!hasPermission('TRANSACTION_DELETE')) {
            throw new Error('Bạn không có quyền xóa phiếu thu chi');
        }
        const existing = transactions.find(t => t.id === id);
        if (!existing) throw new Error('Không tìm thấy giao dịch');

        const updated = { ...existing, isDeleted: true, deletedAt: new Date().toISOString() };
        await supabaseService.updateTransaction(updated);
        await refreshData();
    };

    const approveTransaction = async (id, approverId) => {
        if (!hasPermission('TRANSACTION_APPROVE')) {
            throw new Error('Bạn không có quyền duyệt phiếu thu chi');
        }
        const existing = transactions.find(t => t.id === id);
        if (!existing) throw new Error('Không tìm thấy giao dịch');

        const updated = {
            ...existing,
            status: 'approved',
            approvedBy: approverId,
            approvedAt: new Date().toISOString()
        };
        await supabaseService.updateTransaction(updated);
        await refreshData();
    };

    const rejectTransaction = async (id, rejectorId) => {
        if (!hasPermission('TRANSACTION_APPROVE')) {
            throw new Error('Bạn không có quyền từ chối phiếu thu chi');
        }
        const existing = transactions.find(t => t.id === id);
        if (!existing) throw new Error('Không tìm thấy giao dịch');

        const updated = {
            ...existing,
            status: 'rejected',
            rejectedBy: rejectorId,
            rejectedAt: new Date().toISOString()
        };
        await supabaseService.updateTransaction(updated);
        await refreshData();
    };

    const revokeDecision = async (id) => {
        if (user.role !== 'admin' && user.role !== 'accountant') {
            throw new Error('Bạn không có quyền thực hiện thao tác này');
        }
        const existing = transactions.find(t => t.id === id);
        if (!existing) throw new Error('Không tìm thấy giao dịch');

        if (existing.isSettled) throw new Error('Cần hủy tất toán trước khi thực hiện');

        const updated = {
            ...existing,
            status: 'pending',
            approvedBy: null,
            approvedAt: null,
            rejectedBy: null,
            rejectedAt: null
        };
        await supabaseService.updateTransaction(updated);
        await refreshData();
    };

    const settleTransaction = async (id) => {
        if (!hasPermission('SETTLEMENT_MANAGE')) {
            throw new Error('Bạn không có quyền tất toán');
        }
        const existing = transactions.find(t => t.id === id);
        if (!existing) throw new Error('Không tìm thấy giao dịch');

        const updated = {
            ...existing,
            isSettled: true,
            settledAt: new Date().toISOString()
        };
        await supabaseService.updateTransaction(updated);
        await refreshData();
    };

    const settleMultipleTransactions = async (ids) => {
        if (!hasPermission('SETTLEMENT_MANAGE')) {
            throw new Error('Bạn không có quyền tất toán');
        }
        const updates = ids.map(id => {
            const existing = transactions.find(t => t.id === id);
            if (!existing) return null;
            return {
                ...existing,
                isSettled: true,
                settledAt: new Date().toISOString()
            };
        }).filter(Boolean);

        await Promise.all(updates.map(u => supabaseService.updateTransaction(u)));
        await refreshData();
    };

    const unsettleTransaction = async (id) => {
        if (!hasPermission('SETTLEMENT_MANAGE')) {
            throw new Error('Bạn không có quyền tất toán');
        }
        const existing = transactions.find(t => t.id === id);
        if (!existing) throw new Error('Không tìm thấy giao dịch');

        const updated = {
            ...existing,
            isSettled: false,
            settledAt: null
        };
        await supabaseService.updateTransaction(updated);
        await refreshData();
    };

    // --- Phương thức Dữ liệu nguồn ---

    const addCategory = async (data) => {
        if (!hasPermission('MASTER_DATA_MANAGE')) throw new Error('Không có quyền quản lý danh mục');
        const newCat = { ...data, id: crypto.randomUUID() };
        await supabaseService.addCategory(newCat);
        await refreshData();
        return newCat;
    };

    const updateCategory = async (id, data) => {
        if (!hasPermission('MASTER_DATA_MANAGE')) throw new Error('Không có quyền quản lý danh mục');
        const updated = { ...data, id };
        await supabaseService.updateCategory(updated);
        await refreshData();
        return updated;
    };

    const deleteCategory = async (id) => {
        if (!hasPermission('MASTER_DATA_MANAGE')) throw new Error('Không có quyền quản lý danh mục');
        await supabaseService.deleteCategory(id);
        await refreshData();
    };

    const addUnit = async (data) => {
        if (!hasPermission('MASTER_DATA_MANAGE')) throw new Error('Không có quyền quản lý đơn vị');
        const newUnit = { ...data, id: crypto.randomUUID() };
        await supabaseService.addUnit(newUnit);
        await refreshData();
        return newUnit;
    };

    const updateUnit = async (id, data) => {
        if (!hasPermission('MASTER_DATA_MANAGE')) throw new Error('Không có quyền quản lý đơn vị');
        const updated = { ...data, id };
        await supabaseService.updateUnit(updated);
        await refreshData();
        return updated;
    };

    const deleteUnit = async (id) => {
        if (!hasPermission('MASTER_DATA_MANAGE')) throw new Error('Không có quyền quản lý đơn vị');
        await supabaseService.deleteUnit(id);
        await refreshData();
    };

    const addPartner = async (data) => {
        if (!hasPermission('MASTER_DATA_MANAGE')) throw new Error('Không có quyền quản lý đối tác');
        const newPartner = { ...data, id: crypto.randomUUID() };
        await supabaseService.addPartner(newPartner);
        await refreshData();
        return newPartner;
    };

    const updatePartner = async (id, data) => {
        if (!hasPermission('MASTER_DATA_MANAGE')) throw new Error('Không có quyền quản lý đối tác');
        const updated = { ...data, id };
        await supabaseService.updatePartner(updated);
        await refreshData();
        return updated;
    };

    const deletePartner = async (id) => {
        if (!hasPermission('MASTER_DATA_MANAGE')) throw new Error('Không có quyền quản lý đối tác');
        await supabaseService.deletePartner(id);
        await refreshData();
    };

    const filteredTransactions = transactions.filter(t => {
        if (!user) return false;
        if (t.isDeleted && user.role !== 'admin') return false;

        if (user.role === 'employee') {
            return t.createdBy === user.uid;
        }
        return true;
    });

    return (
        <TransactionContext.Provider value={{
            transactions: filteredTransactions,
            allTransactions: transactions,
            categories,
            isLoading,
            addTransaction,
            updateTransaction,
            softDeleteTransaction,
            approveTransaction,
            rejectTransaction,
            revokeDecision,
            settleTransaction,
            settleMultipleTransactions,
            unsettleTransaction,
            refreshData,
            addCategory,
            updateCategory,
            deleteCategory,
            units,
            addUnit,
            updateUnit,
            deleteUnit,
            partners,
            addPartner,
            updatePartner,
            deletePartner,
            uploadFile: supabaseService.uploadFile.bind(supabaseService)
        }}>
            {children}
        </TransactionContext.Provider>
    );
};
