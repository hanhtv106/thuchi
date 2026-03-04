import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

// Helper to remove Vietnamese accents for PDF export (jsPDF limitation with standard fonts)
const removeAccents = (str) => {
    if (!str) return '';
    return str.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

// Chuyển đổi số thành chữ tiếng Việt
export const numberToVietnameseWords = (number) => {
    const units = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'];
    const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

    const readGroup = (group) => {
        let res = '';
        const h = Math.floor(group / 100);
        const t = Math.floor((group % 100) / 10);
        const u = group % 10;

        if (h > 0) {
            res += digits[h] + ' trăm ';
            if (t === 0 && u > 0) res += 'lẻ ';
        }
        if (t > 0) {
            if (t === 1) res += 'mười ';
            else res += digits[t] + ' mươi ';
        }
        if (u > 0) {
            if (u === 1 && t > 1) res += 'mốt';
            else if (u === 5 && t > 0) res += 'lăm';
            else res += digits[u];
        }
        return res.trim();
    };

    if (number === 0) return 'Không đồng';
    let res = '';
    let i = 0;
    let n = Math.abs(number);

    while (n > 0) {
        const group = n % 1000;
        if (group > 0) {
            const groupStr = readGroup(group);
            res = groupStr + units[i] + (res ? ' ' + res : '');
        }
        n = Math.floor(n / 1000);
        i++;
    }

    res = res.trim();
    return res.charAt(0).toUpperCase() + res.slice(1) + ' đồng';
};

export const exportToExcel = (transactions, categories = [], units = [], partners = [], fileName = 'bao-cao-thu-chi') => {
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    const now = format(new Date(), 'dd/MM/yyyy HH:mm');

    let totalIncome = 0;
    let totalExpense = 0;

    const types = [
        { key: 'income', label: 'PHẦN I: CÁC KHOẢN THU', color: '#059669' },
        { key: 'expense', label: 'PHẦN II: CÁC KHOẢN CHI', color: '#dc2626' }
    ];

    let rowsHtml = '';
    types.forEach(typeObj => {
        const typeItems = sortedTransactions.filter(t => t.type === typeObj.key);
        if (typeItems.length > 0) {
            rowsHtml += `
                <tr style="background-color: #e5e7eb; font-weight: bold;">
                    <td colspan="8" style="color: ${typeObj.color}; border: 1px solid #000; height: 30px; font-size: 13px;">${typeObj.label}</td>
                </tr>
            `;

            let typeTotal = 0;
            const categoryIds = [...new Set(typeItems.map(t => t.categoryId))];

            categoryIds.forEach(cid => {
                const catName = categories.find(c => c.id === cid)?.name || cid;
                const items = typeItems.filter(t => t.categoryId === cid);

                rowsHtml += `
                    <tr style="background-color: #f9fafb; font-weight: bold; font-style: italic;">
                        <td colspan="8" style="border: 1px solid #000; padding-left: 20px; color: #4b5563;">Hạng mục: ${catName}</td>
                    </tr>
                `;

                items.forEach(tx => {
                    const partner = partners.find(p => p.id === tx.partnerId);
                    const unit = units.find(u => u.id === tx.unitId);
                    const partnerName = partner?.name || tx.receiver || '-';

                    rowsHtml += `
                        <tr>
                            <td style="border: 1px solid #000; text-align: center;">${format(new Date(tx.date), 'dd/MM/yyyy')}</td>
                            <td style="border: 1px solid #000;">${partnerName}</td>
                            <td style="border: 1px solid #000;">${tx.voucherCode ? `[${tx.voucherCode}] ` : ''}${tx.content}</td>
                            <td style="border: 1px solid #000; text-align: center;">${unit?.name || '-'}</td>
                            <td style="border: 1px solid #000; text-align: center;">${tx.quantity || 1}</td>
                            <td style="border: 1px solid #000; text-align: right;">${tx.unitPrice || 0}</td>
                            <td style="border: 1px solid #000; text-align: right;">${tx.vatAmount || 0}</td>
                            <td style="border: 1px solid #000; text-align: right; font-weight: bold;">${tx.amount}</td>
                        </tr>

                    `;
                });

                const catTotal = items.reduce((s, i) => s + i.amount, 0);
                rowsHtml += `
                    <tr style="background-color: #f3f4f6; font-weight: bold;">
                        <td colspan="7" style="border: 1px solid #000; text-align: right;">Cộng hạng mục (${catName}):</td>
                        <td style="border: 1px solid #000; text-align: right;">${catTotal}</td>
                    </tr>
                `;
                typeTotal += catTotal;
            });

            rowsHtml += `
                <tr style="background-color: #d1d5db; font-weight: bold;">
                    <td colspan="7" style="border: 1px solid #000; text-align: right; text-transform: uppercase;">TỔNG ${typeObj.label}:</td>
                    <td style="border: 1px solid #000; text-align: right; border: 2px solid #000;">${typeTotal}</td>
                </tr>
            `;

            if (typeObj.key === 'income') totalIncome = typeTotal;
            else totalExpense = typeTotal;
        }
    });

    const balance = totalIncome - totalExpense;

    const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8">
            <style>
                table { border-collapse: collapse; width: 100%; border: 2px solid #000; }
                th { background-color: #2563eb; color: #ffffff; font-weight: bold; border: 1px solid #000; text-align: center; height: 35px; }
                td { padding: 5px; vertical-align: middle; border: 1px solid #000; mso-number-format: "\\#\\,\\#\\#0"; }
                .text-header { font-size: 16px; font-weight: bold; }
                .report-title { font-size: 20px; font-weight: bold; text-align: center; }
            </style>
        </head>
        <body>
            <table>
                <tr><td colspan="8" style="border:none;" class="text-header">CÔNG TY CỔ PHẦN SAMCO VINA</td></tr>
                <tr><td colspan="8" style="border:none;">Số 03 đường số 1, KCN Sóng Thần, P. Dĩ An, TP. Hồ Chí Minh</td></tr>
                <tr><td colspan="8" style="border:none;">MST: 0313121108 - Hotline: 0907 101 899</td></tr>
                <tr><td colspan="8" style="border:none;"></td></tr>
                <tr><td colspan="8" style="border:none;" class="report-title">BÁO CÁO CHI TIẾT THU CHI</td></tr>

                <tr><td colspan="8" style="border:none; text-align: center;">Ngày xuất: ${now}</td></tr>
                <tr><td colspan="8" style="border:none;"></td></tr>
                <thead>
                    <tr>
                        <th style="width: 100px;">Ngày</th>
                        <th style="width: 250px;">Đối tác / Người nhận</th>
                        <th style="width: 350px;">Nội dung chi tiết</th>
                        <th style="width: 80px;">ĐVT</th>
                        <th style="width: 60px;">SL</th>
                        <th style="width: 120px;">Đơn giá</th>
                        <th style="width: 100px;">Thuế VAT</th>
                        <th style="width: 150px;">Tổng tiền</th>
                    </tr>
                </thead>

                <tbody>
                    ${rowsHtml}
                    <tr><td colspan="8" style="border:none;"></td></tr>
                    <tr style="font-weight: bold; font-size: 14px;">
                        <td colspan="7" style="text-align: right; border: 2px solid #000; background-color: #f8fafc;">TỔNG CỘNG THU TRONG KỲ:</td>
                        <td style="text-align: right; border: 2px solid #000; background-color: #f0fdf4; color: #166534;">${totalIncome}</td>
                    </tr>
                    <tr style="font-weight: bold; font-size: 14px;">
                        <td colspan="7" style="text-align: right; border: 2px solid #000; background-color: #f8fafc;">TỔNG CỘNG CHI TRONG KỲ:</td>
                        <td style="text-align: right; border: 2px solid #000; background-color: #fef2f2; color: #991b1b;">${totalExpense}</td>
                    </tr>
                    <tr style="font-weight: bold; font-size: 16px; background-color: #fef3c7;">
                        <td colspan="7" style="text-align: right; border: 2px solid #000;">CÂN ĐỐI DƯ CUỐI KỲ:</td>
                        <td style="text-align: right; border: 2px solid #000; color: ${balance >= 0 ? '#166534' : '#991b1b'};">${balance}</td>
                    </tr>
                </tbody>
            </table>
        </body>
        </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.xls`;
    link.click();
    URL.revokeObjectURL(url);
};

export const exportToPDF = (transactions, categories = [], units = [], partners = [], title = 'BÁO CÁO CHI TIẾT THU CHI') => {
    const printWindow = window.open('', '_blank');
    const now = format(new Date(), 'dd/MM/yyyy HH:mm');

    // Sort transactions by date initially
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Hierarchical Grouping: Type -> Category
    const groupedStructure = [];
    const types = [
        { key: 'income', label: 'PHẦN I: CÁC KHOẢN THU', color: '#059669' },
        { key: 'expense', label: 'PHẦN II: CÁC KHOẢN CHI', color: '#dc2626' }
    ];

    types.forEach(typeObj => {
        const typeItems = sortedTransactions.filter(t => t.type === typeObj.key);
        if (typeItems.length > 0) {
            const categoryIds = [...new Set(typeItems.map(t => t.categoryId))];
            const catGroups = categoryIds.map(cid => {
                const catName = categories.find(c => c.id === cid)?.name || cid;
                const items = typeItems.filter(t => t.categoryId === cid);
                return {
                    name: catName,
                    items: items,
                    total: items.reduce((sum, i) => sum + i.amount, 0)
                };
            });

            groupedStructure.push({
                label: typeObj.label,
                color: typeObj.color,
                categories: catGroups,
                total: typeItems.reduce((sum, i) => sum + i.amount, 0)
            });
        }
    });

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;

    const html = `
        <html>
        <head>
            <title>${title}</title>
            <style>
                @media print { 
                    @page { margin: 10mm; size: A4 landscape; } 
                }
                body { font-family: "Times New Roman", Times, serif; color: #333; line-height: 1.4; padding: 20px; }
                .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                .company-info h2 { margin: 0; font-size: 18px; color: #000; }
                .company-info p { margin: 2px 0; font-size: 12px; }
                .report-title { text-align: center; margin: 15px 0; }
                .report-title h1 { margin: 0; font-size: 22px; text-transform: uppercase; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
                th, td { border: 1px solid #333; padding: 6px 5px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; text-align: center; text-transform: uppercase; }
                
                .type-header { background-color: #e5e7eb; font-weight: bold; font-size: 13px; padding: 8px; }
                .category-header { background-color: #f9fafb; font-weight: bold; font-style: italic; color: #4b5563; }
                .total-row { background-color: #f3f4f6; font-weight: bold; }
                
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .amount-cell { font-family: "Courier New", Courier, monospace; font-weight: bold; font-size: 12px; }
                
                .footer { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; }
                .footer-item { font-weight: bold; margin-bottom: 70px; }
                
                .summary-box { margin-top: 20px; border: 2px solid #333; padding: 10px; display: inline-block; min-width: 350px; }
                .summary-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; }
                .font-bold { font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-info">
                    <h2>CÔNG TY CỔ PHẦN SAMCO VINA</h2>
                    <p>Địa chỉ: Số 03 đường số 1, KCN Sóng Thần, P. Dĩ An, TP. Hồ Chí Minh</p>
                    <p>MST: 0313121108 - Hotline: 0907 101 899</p>
                </div>
                <div class="text-right">
                    <p>Ngày xuất: ${now}</p>
                </div>
            </div>

            <div class="report-title">
                <h1>${title}</h1>
            </div>

            <table>
                <thead>
                    <tr>
                        <th width="80">Ngày</th>
                        <th width="150">Đối tác / Người nhận</th>
                        <th>Nội dung chi tiết giao dịch</th>
                        <th width="80">ĐVT</th>
                        <th width="60">SL</th>
                        <th width="100">Đơn giá</th>
                        <th width="120">Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    ${groupedStructure.map(typeGroup => `
                        <tr>
                            <td colspan="7" class="type-header" style="color: ${typeGroup.color}">${typeGroup.label}</td>
                        </tr>
                        ${typeGroup.categories.map(cat => `
                            <tr>
                                <td colspan="7" class="category-header">&nbsp;&nbsp;&nbsp;&nbsp;Hạng mục: ${cat.name}</td>
                            </tr>
                            ${cat.items.map(tx => {
        const partner = partners.find(p => p.id === tx.partnerId);
        const unit = units.find(u => u.id === tx.unitId);
        return `
                                <tr>
                                    <td class="text-center">${format(new Date(tx.date), 'dd/MM/yyyy')}</td>
                                    <td>${partner?.name || tx.receiver || '-'}</td>
                                    <td>${tx.voucherCode ? `[${tx.voucherCode}] ` : ''}${tx.content}</td>
                                    <td class="text-center">${unit?.name || '-'}</td>
                                    <td class="text-center">${tx.quantity || 1}</td>
                                    <td class="text-right">${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 10 }).format(tx.unitPrice || 0)}</td>
                                    <td class="text-right amount-cell">${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 10 }).format(tx.amount)}</td>
                                </tr>
                                `;
    }).join('')}
                            <tr class="total-row">
                                <td colspan="6" class="text-right">Cộng hạng mục (${cat.name}):</td>
                                <td class="text-right amount-cell">${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 10 }).format(cat.total)}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row" style="background-color: #d1d5db;">
                            <td colspan="6" class="text-right" style="text-transform: uppercase;">TỔNG ${typeGroup.label}:</td>
                            <td class="text-right amount-cell" style="font-size: 13px;">${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 10 }).format(typeGroup.total)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="summary-box">
                <div class="summary-row">
                    <span>Tổng cộng Thu trong kỳ:</span>
                    <span class="font-bold">${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 10 }).format(totalIncome)}</span>
                </div>
                <div class="summary-row">
                    <span>Tổng cộng Chi trong kỳ:</span>
                    <span class="font-bold">${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 10 }).format(totalExpense)}</span>
                </div>
                <div class="summary-row" style="border-top: 2px solid #333; padding-top: 5px; margin-top: 5px;">
                    <span class="font-bold">CÂN ĐỐI DƯ CUỐI KỲ:</span>
                    <span class="font-bold" style="font-size: 16px;">${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 10 }).format(balance)}</span>
                </div>
            </div>

            <div class="footer">
                <div class="footer-item"><p>NGƯỜI LẬP BIỂU</p></div>
                <div class="footer-item"><p>KẾ TOÁN TRƯỞNG</p></div>
                <div class="footer-item"><p>BAN GIÁM ĐỐC</p></div>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(() => window.close(), 500);
                }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
};

// Professional Print Voucher using hidden iframe and HTML/CSS for best quality & Vietnamese support
export const printVoucher = (tx) => {
    const isIncome = tx.type === 'income';
    const title = isIncome ? 'PHIẾU THU' : 'PHIẾU CHI';
    const dateStr = format(new Date(tx.date), 'dd/MM/yyyy');
    const amountStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 10 }).format(tx.amount);
    const amountInWords = numberToVietnameseWords(tx.amount);

    const printWindow = window.open('', '_blank');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: "Times New Roman", Times, serif; padding: 40px; color: #333; }
                .voucher { border: 2px solid #333; padding: 20px; max-width: 800px; margin: 0 auto; position: relative; }
                .header { text-align: center; margin-bottom: 30px; }
                .header h1 { margin: 0; font-size: 28px; text-decoration: underline; }
                .header p { margin: 5px 0; font-style: italic; }
                .meta { position: absolute; top: 20px; right: 20px; text-align: right; font-size: 14px; }
                .content-row { margin-bottom: 12px; display: flex; align-items: baseline; }
                .label { font-weight: bold; min-width: 180px; }
                .value { border-bottom: 1px dotted #666; flex-grow: 1; padding-left: 10px; }
                .amount-box { margin: 20px 0; font-size: 18px; font-weight: bold; border: 1px solid #333; padding: 10px; display: inline-block; }
                .footer { margin-top: 50px; display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; }
                .sign-box { height: 100px; }
                .sign-label { font-weight: bold; margin-bottom: 5px; }
                .sign-note { font-size: 12px; font-style: italic; }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="voucher">
                <div class="meta">
                    <div>Số: <strong>${tx.voucherCode || tx.id.substring(0, 8).toUpperCase()}</strong></div>
                    <div>Ngày: ${dateStr}</div>
                </div>
                
                <div class="header">
                    <h1>${title}</h1>
                    <p>Ngày ${format(new Date(tx.date), 'dd')} tháng ${format(new Date(tx.date), 'MM')} năm ${format(new Date(tx.date), 'yyyy')}</p>
                </div>

                <div class="content-row">
                    <div class="label">${isIncome ? 'Họ tên người nộp:' : 'Họ tên người nhận:'}</div>
                    <div class="value">${tx.partner || tx.receiver || ''}</div>
                </div>

                <div class="content-row">
                    <div class="label">Địa chỉ:</div>
                    <div class="value">........................................................................................................................</div>
                </div>

                <div class="content-row">
                    <div class="label">Lý do ${isIncome ? 'nộp:' : 'chi:'}</div>
                    <div class="value">${tx.content}</div>
                </div>

                ${tx.vatPercentage > 0 ? `
                <div style="margin-top: 15px;">
                    <div class="content-row">
                        <div class="label">Tiền hàng:</div>
                        <div class="value">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 10 }).format(tx.amount - tx.vatAmount)}</div>
                    </div>
                    <div class="content-row">
                        <div class="label">Thuế suất VAT:</div>
                        <div class="value">${tx.vatPercentage}%</div>
                    </div>
                    <div class="content-row">
                        <div class="label">Tiền thuế VAT:</div>
                        <div class="value">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 10 }).format(tx.vatAmount)}</div>
                    </div>
                </div>
                ` : ''}

                <div class="amount-box">
                    Tổng cộng: ${amountStr}
                </div>

                <div class="content-row">
                    <div class="label">Bằng chữ:</div>
                    <div class="value" style="font-style: italic;">${amountInWords}</div>
                </div>


                <div class="content-row">
                    <div class="label">Kèm theo:</div>
                    <div class="value">${tx.attachments?.length || 0} chứng từ gốc</div>
                </div>

                <div class="footer">
                    <div class="sign-box">
                        <div class="sign-label">Người lập phiếu</div>
                        <div class="sign-note">(Ký, họ và tên)</div>
                    </div>
                    <div class="sign-box">
                        <div class="sign-label">${isIncome ? 'Người nộp tiền' : 'Người nhận tiền'}</div>
                        <div class="sign-note">(Ký, họ và tên)</div>
                    </div>
                    <div class="sign-box">
                        <div class="sign-label">Kế toán trưởng</div>
                        <div class="sign-note">(Ký, họ và tên)</div>
                    </div>
                </div>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                    // window.close(); // Optional: close the tab after print
                };
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
};

// Professional Multi-Category Expenditure Report (Báo cáo giải chi)
export const printProfessionalReport = (transactions, categories, partners, units, startDate, endDate, user) => {
    const dateRange = startDate && endDate
        ? `${format(new Date(startDate), 'dd/MM/yyyy')} ĐẾN ${format(new Date(endDate), 'dd/MM/yyyy')}`
        : 'TẤT CẢ THỜI GIAN';

    const printWindow = window.open('', '_blank');

    // Group transactions by category
    const groupedData = categories.map(cat => ({
        ...cat,
        items: transactions.filter(tx => tx.categoryId === cat.id).map(tx => ({
            ...tx,
            partnerName: partners.find(p => p.id === tx.partnerId)?.name || tx.receiver || tx.partner || '',
            unitName: units.find(u => u.id === tx.unitId)?.name || ''
        }))
    })).filter(cat => cat.items.length > 0);

    const totalSpent = transactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);

    const advanceAmount = transactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);

    // Tính toán số dư và nhãn hiển thị tương ứng
    const rawBalance = advanceAmount - totalSpent;
    let balanceLabel = 'SỐ TIỀN CHI CHƯA HẾT';
    if (rawBalance < 0) balanceLabel = 'SỐ TIỀN CHI VƯỢT THU';
    if (rawBalance === 0) balanceLabel = 'SỐ TIỀN CHI - THU: ĐỦ';

    const displayBalance = Math.abs(rawBalance);

    // DÁN LINK LOGO VÀO ĐÂY / PASTE LOGO URL HERE
    const LOGO_URL = 'https://bizweb.dktcdn.net/100/595/748/themes/1043990/assets/logo.png?1762833503608';

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Báo cáo giải chi - ${dateRange}</title>
            <style>
                @media print { 
                    @page { margin: 10mm; } 
                    .no-print { display: none; }
                }
                body { font-family: "Times New Roman", Times, serif; color: #000; padding: 10px; font-size: 13px; line-height: 1.4; }
                .report-header { display: flex; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #000; }
                .logo-container { margin-right: 20px; }
                .logo-container img { height: 75px; width: auto; display: block; }

                .company-info { text-align: left; flex-grow: 1; border-left: 1px solid #ccc; padding-left: 20px; }
                .company-info h2 { margin: 0; font-size: 19px; text-transform: uppercase; color: #1a365d; font-family: "Arial", sans-serif; }
                .company-info p { margin: 2px 0; font-size: 12px; font-weight: bold; }
                
                .title-box { text-align: center; margin: 20px 0; }
                .title-box h1 { margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px; }
                
                table.main-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                table.main-table th, table.main-table td { border: 1px solid #000; padding: 8px 4px; font-size: 11px; }
                table.main-table th { background: #f2f2f2; text-transform: uppercase; font-weight: bold; text-align: center; }
                
                .category-header-row td { background: #e9e9e9; font-weight: bold; text-align: center; padding: 10px !important; font-size: 13px; text-transform: uppercase; border-top: 2px solid #000 !important; }
                .total-row td { font-weight: bold; background: #fafafa; border-top: 1px solid #000; }
                
                .text-left { text-align: left !important; padding-left: 8px !important; }
                .text-right { text-align: right !important; padding-right: 8px !important; }
                .text-center { text-align: center !important; }
                
                .summary-container { display: flex; justify-content: flex-end; margin-top: 30px; page-break-inside: avoid; }
                .signature-block { width: 250px; text-align: center; }
                .signature-title { font-weight: bold; margin-bottom: 5px; text-transform: uppercase; font-size: 14px; }
                .signature-name { margin-top: 70px; font-weight: bold; font-size: 15px; }
                .signature-placeholder { min-height: 80px; }
                
                .attachment-link { color: #0066cc; text-decoration: underline; font-size: 10px; cursor: pointer; font-weight: bold; }
                .attachment-link:hover { color: #ff0000; }
                
                /* Viewer Modal styles */
                #viewer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: none; z-index: 9999; flex-direction: column; padding: 30px; }
                #viewer-content { flex: 1; background: white; border-radius: 8px; overflow: hidden; position: relative; display: flex; justify-content: center; align-items: center; }
                #viewer-close { position: absolute; top: 10px; right: 20px; font-size: 35px; cursor: pointer; color: white; background: rgba(0,0,0,0.7); width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid white; z-index: 10001; }
                #viewer-img { max-width: 95%; max-height: 95%; object-fit: contain; }
                #viewer-frame { width: 100%; height: 100%; border: none; }

                .viewer-nav { position: absolute; top: 50%; width: 100%; display: flex; justify-content: space-between; padding: 0 20px; pointer-events: none; }
                .nav-btn { pointer-events: auto; background: rgba(0,0,0,0.5); color: white; border: 2px solid white; width: 45px; height: 45px; border-radius: 50%; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
                .viewer-index { position: absolute; bottom: 15px; background: rgba(0,0,0,0.6); color: white; padding: 4px 12px; border-radius: 15px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div id="viewer-overlay" onclick="closeViewer()">
                <div id="viewer-close">&times;</div>
                <div id="viewer-content" onclick="event.stopPropagation()">
                    <iframe id="viewer-frame" style="display:none;"></iframe>
                    <img id="viewer-img" style="display:none;">
                    <div class="viewer-nav" id="viewer-nav" style="display:none;">
                        <button class="nav-btn" onclick="prevDoc()">&#10094;</button>
                        <button class="nav-btn" onclick="nextDoc()">&#10095;</button>
                    </div>
                    <div class="viewer-index" id="viewer-index"></div>
                </div>
            </div>

            <div class="report-header">
                <div class="logo-container">
                    <img src="${LOGO_URL}" alt="Logo" onerror="this.style.display='none'">
                </div>
                <div class="company-info">
                    <h2>CÔNG TY CỔ PHẦN SAMCO VINA</h2>
                    <p>Địa chỉ:Số 03 đường số 1, KCN Sóng Thần, P. Dĩ An, TP. Hồ Chí Minh</p>
                    <p>MST: 0313121108 - Hotline: 0907 101 899</p>
                </div>
            </div>

            <div class="title-box">
                <h1>BÁO CÁO GIẢI CHI TIỀN MẶT ${dateRange}</h1>
            </div>

            <table class="main-table">
                <thead>
                    <tr>
                        <th width="75">Ngày</th>
                        <th class="text-left">Nội dung</th>
                        <th width="50">ĐVT</th>
                        <th width="35">SL</th>
                        <th width="85">Đơn Giá</th>
                        <th width="90">Thành Tiền</th>
                        <th class="text-left">Đối tác</th>
                        <th width="100">Chứng từ</th>
                    </tr>
                </thead>
                <tbody>
                    ${groupedData.map((cat, catIdx) => `
                        <tr class="category-header-row">
                            <td colspan="8">${cat.name.toUpperCase()}</td>
                        </tr>
                        ${cat.items.map((tx, txIdx) => {
        const txKey = `tx_${catIdx}_${txIdx}`;
        return `
                            <tr>
                                <td class="text-center">${format(new Date(tx.date), 'dd/MM/yyyy')}</td>
                                <td class="text-left">${tx.voucherCode ? `[${tx.voucherCode}] ` : ''}${tx.content}</td>
                                <td class="text-center">${tx.unitName}</td>
                                <td class="text-center">${tx.quantity || 1}</td>
                                <td class="text-right">${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 10 }).format(tx.unitPrice || 0)}</td>
                                <td class="text-right">${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 10 }).format(tx.amount)}</td>
                                <td class="text-left">${tx.partnerName}</td>
                                <td class="text-center">
                                    ${tx.attachments?.length > 0
                ? tx.attachments.map((att, idx) =>
                    `<a href="${att.data}" target="_blank" class="attachment-link" onclick="event.preventDefault(); openGallery('${txKey}', ${idx})">
                        Xem CT${tx.attachments.length > 1 ? idx + 1 : ''}
                    </a>`
                ).join(' ')
                : ''}
                                </td>
                            </tr>
                        `;
    }).join('')}
                        <tr class="total-row">
                            <td colspan="5" class="text-right">TỔNG NHÓM (${cat.name})</td>
                            <td class="text-right">${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 10 }).format(cat.items.reduce((s, i) => s + i.amount, 0))}</td>
                            <td colspan="2"></td>
                        </tr>
                    `).join('')}
                    
                    <!-- Unified Summary Rows -->
                    <tr class="total-row" style="border-top: 2px solid #000;">
                        <td colspan="5" class="text-right" style="padding: 10px; font-size: 14px;">TỔNG SỐ TIỀN ĐÃ CHI</td>
                        <td class="text-right" style="padding: 10px; font-size: 14px;">${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 10 }).format(totalSpent)}</td>
                        <td colspan="2"></td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="5" class="text-right" style="padding: 10px; font-size: 14px;">SỐ TIỀN THU</td>
                        <td class="text-right" style="padding: 10px; font-size: 14px;">${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 10 }).format(advanceAmount)}</td>
                        <td colspan="2"></td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="5" class="text-right" style="padding: 10px; font-size: 14px;">${balanceLabel}</td>
                        <td class="text-right" style="padding: 10px; font-size: 14px;">${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 10 }).format(displayBalance)}</td>
                        <td colspan="2"></td>
                    </tr>
                </tbody>
            </table>

            <div class="summary-container">
                <div style="flex-grow: 1;"></div>
                <div class="signature-block">
                    <div class="signature-title">Người lập</div>
                    <div class="signature-placeholder"></div>
                    <div class="signature-name">${user?.fullName || ''}</div>
                </div>
            </div>



            <script>
                // Store attachments globally to avoid massive HTML attributes
                const txAttachments = {};
                ${groupedData.flatMap((cat, catIdx) =>
        cat.items.map((tx, txIdx) => {
            const txKey = `tx_${catIdx}_${txIdx}`;
            return `txAttachments['${txKey}'] = ${JSON.stringify(tx.attachments || [])};`;
        })
    ).join('\n')}

                let currentAtts = [];
                let currentIndex = 0;

                function openGallery(txKey, startIndex = 0) {
                    currentAtts = txAttachments[txKey];
                    if (!currentAtts || currentAtts.length === 0) return;
                    
                    currentIndex = startIndex;
                    showCurrent();
                    document.getElementById('viewer-overlay').style.display = 'flex';
                }

                function showCurrent() {
                    const doc = currentAtts[currentIndex];
                    const frame = document.getElementById('viewer-frame');
                    const img = document.getElementById('viewer-img');
                    const nav = document.getElementById('viewer-nav');
                    const indexLabel = document.getElementById('viewer-index');

                    if (doc.type.startsWith('image/')) {
                        img.src = doc.data;
                        img.onload = () => {
                            img.style.display = 'block';
                            frame.style.display = 'none';
                        };
                    } else {
                        frame.src = doc.data;
                        frame.style.display = 'block';
                        img.style.display = 'none';
                    }

                    nav.style.display = currentAtts.length > 1 ? 'flex' : 'none';
                    indexLabel.innerText = "Tài liệu " + (currentIndex + 1) + " / " + currentAtts.length;
                }

                function nextDoc() {
                    currentIndex = (currentIndex + 1) % currentAtts.length;
                    showCurrent();
                }

                function prevDoc() {
                    currentIndex = (currentIndex - 1 + currentAtts.length) % currentAtts.length;
                    showCurrent();
                }

                function closeViewer() {
                    document.getElementById('viewer-overlay').style.display = 'none';
                    document.getElementById('viewer-frame').src = '';
                    document.getElementById('viewer-img').src = '';
                }

                window.onload = function() {
                    // window.print();
                };
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
};
