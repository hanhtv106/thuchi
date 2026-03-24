import { useState, useMemo } from 'react';
import { useTransactions } from '../context/TransactionContext';
import { format } from 'date-fns';
import { CheckCircle, Filter, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import './SettlementPage.css';

const SettlementPage = () => {
    const { transactions, settleTransaction, settleMultipleTransactions, unsettleTransaction, categories, partners } = useTransactions();
    const { hasPermission } = useAuth();
    const [filterType, setFilterType] = useState('all'); // all, income, expense
    const [settlementStatus, setSettlementStatus] = useState('unsettled'); // unsettled, settled

    if (!hasPermission('SETTLEMENT_VIEW')) {
        return (
            <div className="settlement-page">
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <h3>Bạn không có quyền truy cập quản lý tất toán</h3>
                </div>
            </div>
        );
    }


    // Filter transactions
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            // Status filter
            if (settlementStatus === 'unsettled' && t.isSettled) return false;
            if (settlementStatus === 'settled' && !t.isSettled) return false;

            if (t.status === 'rejected') return false;

            if (filterType !== 'all' && t.type !== filterType) return false;
            return true;
        });
    }, [transactions, filterType, settlementStatus]);

    const handleSettle = async (id) => {
        if (window.confirm('Xác nhận tất toán khoản này?')) {
            await settleTransaction(id);
        }
    };

    const handleUnsettle = async (id) => {
        if (window.confirm('Hủy tất toán khoản này?')) {
            await unsettleTransaction(id);
        }
    };

    const handleSettleAll = async () => {
        const count = filteredTransactions.length;
        if (count === 0) return;

        if (window.confirm(`Bạn có chắc muốn tất toán toàn bộ ${count} phiếu đang hiển thị?`)) {
            const ids = filteredTransactions.map(t => t.id);
            await settleMultipleTransactions(ids);
        }
    };

    const getCategoryName = (id) => categories.find(c => c.id === id)?.name || 'N/A';

    // Calculate totals
    const totalAmount = filteredTransactions.reduce((sum, t) => {
        return sum + (t.type === 'income' ? t.amount : -t.amount);
    }, 0);

    return (
        <div className="settlement-page">
            <div className="page-header">
                <h1 className="page-title">Quản lý Tất toán</h1>
                <div className="filter-controls">
                    {settlementStatus === 'unsettled' && (
                        <button
                            onClick={handleSettleAll}
                            className="btn btn-primary"
                            disabled={filteredTransactions.length === 0}
                        >
                            <CheckCircle size={18} /> Tất toán tất cả ({filteredTransactions.length})
                        </button>
                    )}

                    <div className="filter-group">
                        <select value={settlementStatus} onChange={(e) => setSettlementStatus(e.target.value)}>
                            <option value="unsettled">Chưa tất toán</option>
                            <option value="settled">Đã tất toán</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <Filter size={18} />
                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                            <option value="all">Tất cả</option>
                            <option value="income">Thu</option>
                            <option value="expense">Chi</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="summary-cards">
                <div className="card summary-card">
                    <h3>Tổng {settlementStatus === 'unsettled' ? 'chưa tất toán' : 'đã tất toán'}</h3>
                    <p className={`amount ${totalAmount >= 0 ? 'income' : 'expense'}`}>
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.abs(totalAmount))}
                        <small>{totalAmount >= 0 ? ' (Thu > Chi)' : ' (Chi > Thu)'}</small>
                    </p>
                </div>
                <div className="card summary-card">
                    <h3>Số lượng phiếu</h3>
                    <p className="count">{filteredTransactions.length}</p>
                </div>
            </div>

            {/* Mobile Card Layout */}
            <div className="settlement-card-list" role="list">
                {filteredTransactions.map(tx => (
                    <div key={tx.id} 
                         className={`settlement-card ${hasPermission('SETTLEMENT_MANAGE') ? 'clickable-row' : ''}`}
                         onClick={() => {
                             if(hasPermission('SETTLEMENT_MANAGE')) {
                                 settlementStatus === 'unsettled' ? handleSettle(tx.id) : handleUnsettle(tx.id);
                             }
                         }}
                         role="listitem"
                    >
                        <div className="settlement-card-header">
                            <span className="settlement-card-date">{format(new Date(tx.date), 'dd/MM/yyyy')}</span>
                            <span className={`badge ${tx.type}`}>
                                {tx.type === 'income' ? 'Thu' : 'Chi'}
                            </span>
                        </div>
                        <div className="settlement-card-body">
                            <div className="settlement-card-content">{tx.content}</div>
                            <div className="settlement-card-sub">
                                <span>{getCategoryName(tx.categoryId)}</span>
                                <span> &bull; </span>
                                <span>{tx.partner || tx.receiver || '-'}</span>
                            </div>
                        </div>
                        <div className="settlement-card-footer">
                            <div className="settlement-card-amount">
                                <span className={`amount ${tx.type}`} style={{ fontWeight: 'bold' }}>
                                    {new Intl.NumberFormat('vi-VN').format(tx.amount)} đ
                                </span>
                            </div>
                            {hasPermission('SETTLEMENT_MANAGE') && (
                                <div className="settlement-card-actions">
                                    {settlementStatus === 'unsettled' ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleSettle(tx.id); }}
                                            className="btn btn-primary btn-sm"
                                            title="Đánh dấu đã tất toán"
                                        >
                                            <CheckCircle size={14} style={{ marginRight: 4 }} /> Tất toán
                                        </button>
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleUnsettle(tx.id); }}
                                            className="btn btn-secondary btn-sm text-red"
                                            title="Hủy tất toán"
                                        >
                                            <RotateCcw size={14} style={{ marginRight: 4 }} /> Hủy
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {filteredTransactions.length === 0 && (
                    <div className="settlement-empty">
                        {settlementStatus === 'unsettled' ? 'Không có khoản nào chưa tất toán.' : 'Chưa có khoản nào đã tất toán.'}
                    </div>
                )}
            </div>

            {/* Desktop Table Layout */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Ngày</th>
                            <th>Loại</th>
                            <th>Đối tác</th>
                            <th>Hạng mục</th>
                            <th>Nội dung</th>
                            <th>Số tiền</th>
                            <th>Trạng thái</th>
                            {hasPermission('SETTLEMENT_MANAGE') && <th>Hành động</th>}

                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map(tx => (
                            <tr key={tx.id} 
                                className={hasPermission('SETTLEMENT_MANAGE') ? "clickable-row" : ""} 
                                onClick={() => {
                                    if(hasPermission('SETTLEMENT_MANAGE')) {
                                        settlementStatus === 'unsettled' ? handleSettle(tx.id) : handleUnsettle(tx.id);
                                    }
                                }}>
                                <td>{format(new Date(tx.date), 'dd/MM/yyyy')}</td>
                                <td>
                                    <span className={`badge ${tx.type}`}>
                                        {tx.type === 'income' ? 'Thu' : 'Chi'}
                                    </span>
                                </td>
                                <td>{tx.partner || tx.receiver || '-'}</td>
                                <td>{getCategoryName(tx.categoryId)}</td>
                                <td className="content-cell">{tx.content}</td>
                                <td className={`amount ${tx.type}`}>
                                    {new Intl.NumberFormat('vi-VN').format(tx.amount)}
                                </td>
                                <td>
                                    <span className={`status-badge ${tx.status}`}>
                                        {tx.status === 'pending' ? 'Chờ duyệt' : 'Đã duyệt'}
                                    </span>
                                </td>
                                {hasPermission('SETTLEMENT_MANAGE') && (
                                    <td>
                                        {settlementStatus === 'unsettled' ? (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleSettle(tx.id); }}
                                                className="btn btn-primary btn-sm"
                                                title="Đánh dấu đã tất toán"
                                            >
                                                <CheckCircle size={16} /> Tất toán
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleUnsettle(tx.id); }}
                                                className="btn btn-secondary btn-sm text-red"
                                                title="Hủy tất toán"
                                            >
                                                <RotateCcw size={16} style={{ marginRight: '4px' }} /> Hủy tất toán
                                            </button>
                                        )}
                                    </td>
                                )}

                            </tr>
                        ))}
                        {filteredTransactions.length === 0 && (
                            <tr>
                                <td colSpan="8" className="empty-state">
                                    {settlementStatus === 'unsettled' ? 'Không có khoản nào chưa tất toán.' : 'Chưa có khoản nào đã tất toán.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SettlementPage;
