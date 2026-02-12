import { useState, useMemo } from 'react';
import { useTransactions } from '../context/TransactionContext';
import { useAuth } from '../context/AuthContext';
import { exportToExcel, exportToPDF, printProfessionalReport } from '../utils/exportUtils';
import { FileDown, Printer, FileText } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import './Reports.css'; // We'll create this

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Reports = () => {
    const { transactions, categories } = useTransactions();
    const { user } = useAuth();
    const [filterType, setFilterType] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

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

    const handleExportExcel = () => exportToExcel(filteredData, categories);
    const handleExportPDF = () => exportToPDF(filteredData, categories);
    const handleProfessionalPrint = () => printProfessionalReport(filteredData, categories, startDate, endDate, user);

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
                {/* Can add more charts like Expense by Category here */}
            </div>
        </div>
    );
};

export default Reports;
