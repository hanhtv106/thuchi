import { useState, useMemo } from 'react';
import { useTransactions } from '../context/TransactionContext';
import { useAuth } from '../context/AuthContext';
import { exportToExcel, exportToPDF, printProfessionalReport } from '../utils/exportUtils';
import { FileDown, Printer, FileText, Paperclip, X } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import './Reports.css'; // We'll create this

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Reports = () => {
    const { transactions, categories, units, partners } = useTransactions();
    const { user, hasPermission } = useAuth();

    if (!hasPermission('REPORT_VIEW')) {
        return (
            <div className="reports-page">
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <h3>Bạn không có quyền xem báo cáo</h3>
                </div>
            </div>
        );
    }

    const [filterType, setFilterType] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedAttachments, setSelectedAttachments] = useState(null);

    const filteredData = useMemo(() => {
        return transactions.filter(tx => {
            if (tx.status !== 'approved') return false; // Chỉ lấy phiếu đã duyệt cho báo cáo

            const txDate = new Date(tx.date);
            if (startDate && txDate < new Date(startDate)) return false;
            if (endDate && txDate > new Date(endDate)) return false;

            if (filterType !== 'all' && tx.type !== filterType) return false;

            return true;
        });
    }, [transactions, filterType, startDate, endDate]);

    const summary = useMemo(() => {
        const income = filteredData.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = filteredData.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return { income, expense, balance: income - expense };
    }, [filteredData]);

    const handleExportExcel = () => exportToExcel(filteredData, categories, units, partners);
    const handleExportPDF = () => exportToPDF(filteredData, categories, units, partners);
    const handleProfessionalPrint = () => printProfessionalReport(filteredData, categories, partners, units, startDate, endDate, user);

    const openFile = (att) => {
        if (!att.data) return;

        // Use a new window for data URLs (especially PDFs)
        const win = window.open();
        if (win) {
            win.document.write(`
                <html>
                    <head><title>${att.name}</title></head>
                    <body style="margin:0;">
                        <embed src="${att.data}" width="100%" height="100%" type="${att.type || 'application/pdf'}">
                    </body>
                </html>
            `);
        } else {
            // Fallback: download
            const link = document.createElement('a');
            link.href = att.data;
            link.download = att.name;
            link.click();
        }
    };

    // Chart Data preparation
    const pieData = {
        labels: ['Thu', 'Chi'],
        datasets: [
            {
                data: [summary.income, summary.expense],
                backgroundColor: ['#34d399', '#f87171'],
                borderWidth: 1,
            },
        ],
    };

    return (
        <div className="reports-page">
            <div className="filters-bar">
                <select value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="all">Tất cả</option>
                    <option value="income">Thu</option>
                    <option value="expense">Chi</option>
                </select>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />

                <div className="export-actions">
                    <button onClick={handleExportExcel} className="btn-outline" title="Xuất Excel"><FileDown size={20} /></button>
                    <button onClick={handleExportPDF} className="btn-outline" title="Báo cáo PDF (Bảng)"><Printer size={20} /></button>
                    <button onClick={handleProfessionalPrint} className="btn-primary" title="Báo cáo chuyên nghiệp"><FileText size={20} /> In Giải Chi</button>
                </div>
            </div>

            <div className="summary-cards">
                <div className="card income">
                    <h3>Tổng Thu</h3>
                    <p>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary.income)}</p>
                </div>
                <div className="card expense">
                    <h3>Tổng Chi</h3>
                    <p>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary.expense)}</p>
                </div>
                <div className="card balance">
                    <h3>Số dư</h3>
                    <p>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary.balance)}</p>
                </div>
            </div>

            <div className="charts-container">
                <div className="chart-box">
                    <h4>Tỷ lệ Thu / Chi</h4>
                    <div className="chart-wrapper">
                        <Pie data={pieData} />
                    </div>
                </div>
            </div>

            <div className="report-details card">
                <h4>Chi tiết giao dịch</h4>
                <div className="table-responsive">
                    <table className="reports-table">
                        <thead>
                            <tr>
                                <th>Ngày</th>
                                <th>Loại</th>
                                <th>Hạng mục</th>
                                <th>Đối tác</th>
                                <th>Nội dung</th>
                                <th className="text-right">Số tiền</th>
                                <th className="text-center">Chứng từ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length > 0 ? (
                                [...filteredData].sort((a, b) => new Date(b.date) - new Date(a.date)).map(tx => (
                                    <tr key={tx.id} className={tx.type === 'income' ? 'row-income' : 'row-expense'}>
                                        <td>{new Intl.DateTimeFormat('vi-VN').format(new Date(tx.date))}</td>
                                        <td className="type-cell">
                                            <span className={`badge ${tx.type}`}>
                                                {tx.type === 'income' ? 'Thu' : 'Chi'}
                                            </span>
                                        </td>
                                        <td>{categories.find(c => c.id === tx.categoryId)?.name || tx.categoryId}</td>
                                        <td>{partners.find(p => p.id === tx.partnerId)?.name || tx.partner || tx.receiver || '-'}</td>
                                        <td className="content-cell" title={tx.content}>{tx.content}</td>
                                        <td className="text-right amount-cell">
                                            {new Intl.NumberFormat('vi-VN').format(tx.amount)}
                                        </td>
                                        <td className="text-center">
                                            {tx.attachments?.length > 0 ? (
                                                <button
                                                    className="btn-view-att"
                                                    onClick={() => setSelectedAttachments(tx.attachments)}
                                                    title={`Xem ${tx.attachments.length} chứng từ`}
                                                >
                                                    <Paperclip size={18} />
                                                </button>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="text-center">Không có dữ liệu trong khoảng thời gian này</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Attachment Viewer Modal */}
            {selectedAttachments && (
                <div className="modal-overlay" onClick={() => setSelectedAttachments(null)}>
                    <div className="modal-content viewer-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Chứng từ đính kèm</h3>
                            <button onClick={() => setSelectedAttachments(null)} className="close-btn"><X size={24} /></button>
                        </div>
                        <div className="viewer-body">
                            {selectedAttachments.map((att, idx) => (
                                <div key={idx} className="viewer-item">
                                    <p className="file-name">{att.name}</p>
                                    {att.data?.startsWith('data:image/') || att.type?.startsWith('image/') ? (
                                        <img src={att.data} alt={att.name} className="img-fluid" />
                                    ) : (
                                        <div className="file-placeholder">
                                            <FileText size={48} />
                                            <p>{att.name}</p>
                                            <button
                                                className="btn-primary"
                                                style={{ marginTop: '1rem' }}
                                                onClick={() => openFile(att)}
                                            >
                                                Mở / Tải file đính kèm
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
