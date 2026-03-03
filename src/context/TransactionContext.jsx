import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';
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
                apiService.getAllTransactions(),
                apiService.getAllCategories(),
                apiService.getAllUnits(),
                apiService.getAllPartners()
            ]);
            setTransactions(txs || []);
            setCategories(cats || []);
            setUnits(us || []);
            setPartners(ps || []);
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu từ SQL Server:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) refreshData();
    }, [refreshData, user]);

    // Helper: Tạo ID dựa trên tiền tố
    const generateId = (prefix) => prefix + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();

    // Transactions
    const addTransaction = async (data) => {
        // Sử dụng ngày người dùng chọn, nếu không có mới dùng ngày hiện tại
        const dateToSave = data.date || new Date().toISOString();
        await apiService.addTransaction({ ...data, date: dateToSave, createdBy: user.uid });
        await refreshData();
    };
    const updateTransaction = async (id, data) => {
        await apiService.updateTransaction(id, data);
        await refreshData();
    };
    const deleteTransaction = async (id) => {
        await apiService.deleteTransaction(id);
        await refreshData();
    };

    // Workflow Aliases for TransactionList
    const softDeleteTransaction = deleteTransaction;
    const approveTransaction = async (id) => { await apiService.approveTransaction(id); await refreshData(); };
    const rejectTransaction = async (id) => { await apiService.rejectTransaction(id); await refreshData(); };
    const revokeDecision = async (id) => { await apiService.revokeTransaction(id); await refreshData(); };

    // Settlement methods (missing before)
    const settleTransaction = async (id) => {
        await apiService.updateTransaction(id, { isSettled: 1, settledAt: new Date().toISOString() });
        await refreshData();
    };
    const unsettleTransaction = async (id) => {
        await apiService.updateTransaction(id, { isSettled: 0, settledAt: null });
        await refreshData();
    };
    const settleMultipleTransactions = async (ids) => {
        await Promise.all(ids.map(id => apiService.updateTransaction(id, { isSettled: 1, settledAt: new Date().toISOString() })));
        await refreshData();
    };

    // Categories
    const addCategory = async (data) => {
        await apiService.addCategory({ ...data, id: generateId('CAT') });
        await refreshData();
    };
    const updateCategory = async (id, data) => {
        await apiService.updateCategory(id, data);
        await refreshData();
    };
    const deleteCategory = async (id) => {
        await apiService.deleteCategory(id);
        await refreshData();
    };

    // Units
    const addUnit = async (data) => {
        await apiService.addUnit({ ...data, id: generateId('UNT') });
        await refreshData();
    };
    const updateUnit = async (id, data) => {
        await apiService.updateUnit(id, data);
        await refreshData();
    };
    const deleteUnit = async (id) => {
        await apiService.deleteUnit(id);
        await refreshData();
    };

    // Partners
    const addPartner = async (data) => {
        await apiService.addPartner({ ...data, id: generateId('PAR') });
        await refreshData();
    };
    const updatePartner = async (id, data) => {
        await apiService.updatePartner(id, data);
        await refreshData();
    };
    const deletePartner = async (id) => {
        await apiService.deletePartner(id);
        await refreshData();
    };

    // Upload File (Chuyển thành Base64 để lưu vào DB cho đơn giản)
    const uploadFile = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    };

    return (
        <TransactionContext.Provider value={{
            transactions, categories, units, partners, isLoading,
            addTransaction, updateTransaction, deleteTransaction,
            softDeleteTransaction, approveTransaction, rejectTransaction, revokeDecision,
            settleTransaction, unsettleTransaction, settleMultipleTransactions, // Added settle methods
            addCategory, updateCategory, deleteCategory,
            addUnit, updateUnit, deleteUnit,
            addPartner, updatePartner, deletePartner,
            refreshData, uploadFile
        }}>
            {children}
        </TransactionContext.Provider>
    );
};
