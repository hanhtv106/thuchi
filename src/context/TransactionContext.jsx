import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { dbService } from '../services/db';
import { useAuth } from './AuthContext';

const TransactionContext = createContext(null);

export const useTransactions = () => useContext(TransactionContext);

export const TransactionProvider = ({ children }) => {
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    const [partners, setPartners] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [txs, cats, us, ps] = await Promise.all([
                dbService.getAllTransactions(),
                dbService.getAllCategories(),
                dbService.getAllUnits(),
                dbService.getAllPartners()
            ]);
            // Sort by date desc
            txs.sort((a, b) => new Date(b.date) - new Date(a.date));
            setTransactions(txs);
            setCategories(cats);
            setUnits(us);
            setPartners(ps);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const addTransaction = async (data) => {
        const newTx = {
            ...data,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            createdBy: user.id,
            isDeleted: false,
            status: 'pending' // Default status
        };
        await dbService.addTransaction(newTx);
        await refreshData();
        return newTx;
    };

    const updateTransaction = async (id, data) => {
        const existing = transactions.find(t => t.id === id);
        if (!existing) throw new Error('Transaction not found');

        const updated = { ...existing, ...data };
        await dbService.updateTransaction(updated);
        await refreshData();
        return updated;
    };

    const softDeleteTransaction = async (id) => {
        const existing = transactions.find(t => t.id === id);
        if (!existing) throw new Error('Transaction not found');

        const updated = { ...existing, isDeleted: true, deletedAt: new Date().toISOString() };
        await dbService.updateTransaction(updated);
        await refreshData();
    };

    const approveTransaction = async (id, approverId) => {
        const existing = transactions.find(t => t.id === id);
        if (!existing) throw new Error('Transaction not found');

        const updated = {
            ...existing,
            status: 'approved',
            approvedBy: approverId,
            approvedAt: new Date().toISOString()
        };
        await dbService.updateTransaction(updated);
        await refreshData();
    };

    const rejectTransaction = async (id, rejectorId) => {
        const existing = transactions.find(t => t.id === id);
        if (!existing) throw new Error('Transaction not found');

        const updated = {
            ...existing,
            status: 'rejected',
            rejectedBy: rejectorId,
            rejectedAt: new Date().toISOString()
        };
        await dbService.updateTransaction(updated);
        await refreshData();
    };

    const revokeApproval = async (id) => {
        const existing = transactions.find(t => t.id === id);
        if (!existing) throw new Error('Transaction not found');

        // Check if settled
        if (existing.isSettled) throw new Error('Cần hủy tất toán trước khi hủy duyệt');

        const updated = {
            ...existing,
            status: 'pending',
            approvedBy: null,
            approvedAt: null,
            rejectedBy: null,
            rejectedAt: null
        };
        await dbService.updateTransaction(updated);
        await refreshData();
    };

    const settleTransaction = async (id) => {
        const existing = transactions.find(t => t.id === id);
        if (!existing) throw new Error('Transaction not found');

        const updated = {
            ...existing,
            isSettled: true,
            settledAt: new Date().toISOString()
        };
        await dbService.updateTransaction(updated);
        await refreshData();
    };

    const settleMultipleTransactions = async (ids) => {
        const updates = ids.map(id => {
            const existing = transactions.find(t => t.id === id);
            if (!existing) return null;
            return {
                ...existing,
                isSettled: true,
                settledAt: new Date().toISOString()
            };
        }).filter(Boolean);

        await Promise.all(updates.map(u => dbService.updateTransaction(u)));
        await refreshData();
    };

    const unsettleTransaction = async (id) => {
        const existing = transactions.find(t => t.id === id);
        if (!existing) throw new Error('Transaction not found');

        const updated = {
            ...existing,
            isSettled: false,
            settledAt: null
        };
        await dbService.updateTransaction(updated);
        await refreshData();
    };

    // --- Master Data Methods ---

    // Categories
    const addCategory = async (data) => {
        const newCat = { ...data, id: crypto.randomUUID() };
        await dbService.addCategory(newCat);
        await refreshData();
        return newCat;
    };

    const updateCategory = async (id, data) => {
        const updated = { ...data, id }; // Ensure ID is preserved/set
        await dbService.updateCategory(updated);
        await refreshData();
        return updated;
    };

    const deleteCategory = async (id) => {
        await dbService.deleteCategory(id);
        await refreshData();
    };

    // Units
    const addUnit = async (data) => {
        const newUnit = { ...data, id: crypto.randomUUID() };
        await dbService.addUnit(newUnit);
        await refreshData();
        return newUnit;
    };

    const updateUnit = async (id, data) => {
        const updated = { ...data, id };
        await dbService.updateUnit(updated);
        await refreshData();
        return updated;
    };

    const deleteUnit = async (id) => {
        await dbService.deleteUnit(id);
        await refreshData();
    };

    // Partners
    const addPartner = async (data) => {
        const newPartner = { ...data, id: crypto.randomUUID() };
        await dbService.addPartner(newPartner);
        await refreshData();
        return newPartner;
    };

    const updatePartner = async (id, data) => {
        const updated = { ...data, id };
        await dbService.updatePartner(updated);
        await refreshData();
        return updated;
    };

    const deletePartner = async (id) => {
        await dbService.deletePartner(id);
        await refreshData();
    };

    // Filter logic can be added here or in components
    // For basic RBAC filtering:
    // - Employee sees their own created transactions (or all? Requirement says "xem lịch sử cá nhân")
    // - Accountant sees all
    const filteredTransactions = transactions.filter(t => {
        if (!user) return false;
        if (t.isDeleted && user.role !== 'admin') return false; // Only admin sees soft deleted

        if (user.role === 'employee') {
            return t.createdBy === user.id;
        }
        return true; // Admin and Accountant see all
    });

    return (
        <TransactionContext.Provider value={{
            transactions: filteredTransactions,
            allTransactions: transactions, // For admin
            categories,
            isLoading,
            addTransaction,
            updateTransaction,
            softDeleteTransaction,
            approveTransaction,
            rejectTransaction,
            revokeApproval,
            settleTransaction,
            settleMultipleTransactions,
            unsettleTransaction,
            refreshData,
            // Categories
            addCategory,
            updateCategory,
            deleteCategory,
            // Units
            units,
            addUnit,
            updateUnit,
            deleteUnit,
            // Partners
            partners,
            addPartner,
            updatePartner,
            deletePartner
        }}>
            {children}
        </TransactionContext.Provider>
    );
};
