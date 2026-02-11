import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

export const exportToExcel = (transactions, fileName = 'bao-cao-thu-chi') => {
    const data = transactions.map(tx => ({
        'Ngày': format(new Date(tx.date), 'dd/MM/yyyy'),
        'Loại': tx.type === 'income' ? 'Thu' : 'Chi',
        'Hạng mục': tx.categoryId, // Ideally map to name
        'Nội dung': tx.content,
        'Số tiền': tx.amount,
        'Người chi/thu': tx.spender,
        'Trạng thái': tx.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Giao dịch');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportToPDF = (transactions, title = 'Báo cáo Thu - Chi') => {
    const doc = new jsPDF();

    // Add font support for Vietnamese (Standard jsPDF doesn't support UTF-8 well without custom fonts, 
    // but we'll try to use standard logic or just accept temporary limitations for this mockup)
    // To properly support Vietnamese, we'd need to add a font base64. 
    // For now, we'll strip accents or use a workaround if needed, 
    // but let's assume we just render what we can. 

    doc.setFontSize(18);
    doc.text(title, 14, 22);

    doc.setFontSize(11);
    doc.text(`Ngày xuất: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);

    const tableColumn = ["Ngay", "Loai", "Noi dung", "So tien", "Trang thai"];
    const tableRows = [];

    transactions.forEach(tx => {
        const txData = [
            format(new Date(tx.date), 'dd/MM/yyyy'),
            tx.type === 'income' ? 'Thu' : 'Chi',
            tx.content, // Might have font issues
            new Intl.NumberFormat('vi-VN').format(tx.amount),
            tx.status
        ];
        tableRows.push(txData);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40,
    });

    doc.save('bao-cao.pdf');
};

export const printVoucher = (tx) => {
    const doc = new jsPDF();
    const typeText = tx.type === 'income' ? 'PHIẾU THU' : 'PHIẾU CHI';

    // Header
    doc.setFontSize(22);
    doc.text(typeText, 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Ngày: ${format(new Date(tx.date), 'dd/MM/yyyy')}`, 105, 30, { align: 'center' });
    doc.text(`Số phiếu: ${tx.id.substring(0, 8).toUpperCase()}`, 105, 35, { align: 'center' });

    // Content
    doc.setFontSize(12);
    let y = 50;
    const lineHeight = 10;

    const fields = [
        { label: 'Họ và tên người nộp/nhận:', value: tx.partner || '................................................' },
        { label: 'Địa chỉ:', value: '..................................................................' },
        { label: 'Lý do nộp/chi:', value: tx.content },
        { label: 'Số tiền:', value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tx.amount) },
        { label: 'Bằng chữ:', value: '..................................................................' },
        { label: 'Kèm theo:', value: `${tx.attachments?.length || 0} chứng từ gốc.` }
    ];

    fields.forEach(field => {
        doc.text(`${field.label} ${field.value}`, 20, y);
        y += lineHeight;
    });

    // Signatures
    y += 20;
    doc.text('Người lập phiếu', 30, y);
    doc.text(tx.type === 'income' ? 'Người nộp tiền' : 'Người nhận tiền', 90, y);
    doc.text('Thủ quỹ/Kế toán', 160, y);

    doc.setFontSize(8);
    doc.text('(Ký, họ tên)', 32, y + 5);
    doc.text('(Ký, họ tên)', 95, y + 5);
    doc.text('(Ký, họ tên)', 165, y + 5);

    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
};
