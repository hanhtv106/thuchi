import { useState, useEffect } from 'react';
import { useTransactions } from '../../context/TransactionContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { X, Upload } from 'lucide-react';
import clsx from 'clsx';
import Select from 'react-select';
import './TransactionForm.css';

// 3 đơn vị thường dùng nhất
const QUICK_UNITS = ['Cái', 'Bộ', 'Kg'];

const TransactionForm = ({ onClose, initialData }) => {
    const { addTransaction, updateTransaction, categories, units, partners, uploadFile } = useTransactions();
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [isUploading, setIsUploading] = useState(false);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        categoryId: '',
        content: '',
        quantity: 1,
        unitPrice: 0,
        unitId: '',
        amount: 0,
        partnerId: '',
        receiver: '',
        attachments: [],
        vatPercentage: 0,
        vatAmount: 0,
        voucherCode: '',
        subtotal: 0,
        discountPercentage: 0,
        discountAmount: 0
    });


    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                date: initialData.date.split('T')[0]
            });
        } else {
            const firstCat = categories.find(c => c.type === formData.type);
            if (firstCat) setFormData(prev => ({ ...prev, categoryId: firstCat.id }));
        }
    }, [initialData, categories, formData.type]);

    useEffect(() => {
        const subtotal = Math.round((parseFloat(formData.quantity) || 0) * (parseFloat(formData.unitPrice) || 0));
        const vatPercentage = parseFloat(formData.vatPercentage) || 0;
        const vatAmount = Math.round(subtotal * (vatPercentage / 100));
        const discountPercentage = parseFloat(formData.discountPercentage) || 0;
        const discountAmount = Math.round(subtotal * (discountPercentage / 100));
        const totalAmount = Math.round(subtotal + vatAmount - discountAmount);

        setFormData(prev => ({
            ...prev,
            vatAmount: vatAmount,
            discountAmount: discountAmount,
            amount: totalAmount,
            subtotal: subtotal
        }));
    }, [formData.quantity, formData.unitPrice, formData.vatPercentage, formData.discountPercentage]);

    const formatDisplayNumber = (val) => {
        if (val === null || val === undefined || val === '') return '';
        const parts = val.toString().replace(/\./g, ',').split(',');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        return parts.length > 1 ? `${parts[0]},${parts[1]}` : parts[0];
    };

    const handleNumberFormatChange = (e) => {
        const { name, value } = e.target;
        let cleanVal = value.replace(/\./g, '').replace(/,/g, '.');
        cleanVal = cleanVal.replace(/[^0-9.]/g, '');
        const parts = cleanVal.split('.');
        if (parts.length > 2) cleanVal = parts[0] + '.' + parts.slice(1).join('');
        setFormData(prev => ({ ...prev, [name]: cleanVal }));
    };



    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Compress image before upload
    const compressImage = (file) => {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                resolve(file); // Don't compress non-images
                return;
            }

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_WIDTH = 1200;

                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
                        resolve(compressedFile);
                    }, 'image/jpeg', 0.7); // 70% quality
                };
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.categoryId) {
            showNotification('Vui lòng chọn hạng mục!', 'error');
            return;
        }

        setIsUploading(true);
        try {
            // 1. Upload new attachments
            const finalAttachments = await Promise.all(
                (formData.attachments || []).map(async (att) => {
                    if (att.isNew && att.file) {
                        const url = await uploadFile(att.file);
                        return { name: att.name, type: att.type, data: url };
                    }
                    return att; // Keep existing
                })
            );

            const dataToSave = { ...formData, attachments: finalAttachments };

            // 2. Save transaction
            if (initialData) {
                if (initialData.status === 'approved' && user.role !== 'admin') {
                    showNotification('Bạn không có quyền chỉnh sửa phiếu đã duyệt!', 'error');
                    return;
                }
                await updateTransaction(initialData.id, dataToSave);
                showNotification('Cập nhật giao dịch thành công!');
            } else {
                await addTransaction(dataToSave);
                showNotification('Tạo giao dịch mới thành công!');
            }
            onClose();
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
            showNotification('Lỗi: ' + errorMsg, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            const newAttachments = await Promise.all(
                files.map(async (file) => {
                    const compressed = await compressImage(file);
                    return {
                        name: file.name,
                        type: file.type,
                        file: compressed, // Binary for upload
                        data: URL.createObjectURL(compressed), // Preview URL
                        isNew: true
                    };
                })
            );
            setFormData(prev => ({
                ...prev,
                attachments: [...(prev.attachments || []), ...newAttachments]
            }));
        }
    };

    const removeAttachment = (index) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
    };

    const filteredCategories = categories.filter(c => c.type === formData.type);

    // react-select styles aligned with design system
    const selectStyles = {
        control: (base, state) => ({
            ...base,
            minHeight: '44px',
            borderRadius: '10px',
            borderWidth: '1.5px',
            borderColor: state.isFocused ? '#2563eb' : '#e2e8f0',
            boxShadow: state.isFocused ? '0 0 0 3px rgba(37,99,235,0.12)' : 'none',
            fontSize: '1rem',
            '&:hover': { borderColor: '#94a3b8' }
        }),
        valueContainer: (base) => ({ ...base, padding: '0 12px' }),
        input:          (base) => ({ ...base, margin: '0', padding: '0', fontSize: '1rem' }),
        option: (base, state) => ({
            ...base,
            fontSize: '0.9375rem',
            padding: '10px 12px',
            background: state.isSelected ? '#2563eb' : state.isFocused ? '#eff6ff' : 'white',
            color: state.isSelected ? '#fff' : '#0f172a',
        }),
        menu:           (base) => ({ ...base, zIndex: 9999, borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }),
        placeholder:    (base) => ({ ...base, color: '#94a3b8', fontSize: '0.9375rem' }),
    };

    const categoryOptions = filteredCategories.map(cat => ({ value: cat.id, label: cat.name }));
    const unitOptions = units.map(u => ({ value: u.id, label: u.name }));
    const partnerOptions = partners
        .filter(p => !p.type || p.type === 'both' || (formData.type === 'income' ? p.type === 'customer' : p.type === 'supplier'))
        .map(p => ({ value: p.id, label: p.name }));

    const handleSelectChange = (name, selectedOption) => {
        setFormData(prev => ({ ...prev, [name]: selectedOption ? selectedOption.value : '' }));
    };

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={initialData ? 'Cập nhật giao dịch' : 'Thêm mới giao dịch'}>
            <div className="modal-content">
                <div className="modal-header">
                    <h3>{initialData ? 'Cập nhật Giao dịch' : 'Thêm mới Giao dịch'}</h3>
                    <button onClick={onClose} className="close-btn"><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className="tx-form">

                    {/* ── Row 1: Loại phiếu | Ngày ──────────────── */}
                    <div className="form-row">
                        <div className="form-group">
                            <label>Loại phiếu</label>
                            <div className="type-toggle">
                                <button
                                    type="button"
                                    className={clsx({ active: formData.type === 'income' })}
                                    onClick={() => setFormData(prev => ({ ...prev, type: 'income' }))}
                                >Thu</button>
                                <button
                                    type="button"
                                    className={clsx({ active: formData.type === 'expense' })}
                                    onClick={() => setFormData(prev => ({ ...prev, type: 'expense' }))}
                                >Chi</button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Ngày</label>
                            <input type="date" name="date" value={formData.date} onChange={handleChange} required />
                        </div>
                    </div>

                    {/* ── Row 2: Hạng mục (full width) ──────────── */}
                    <div className="form-group">
                        <label>Hạng mục <span style={{ color: 'red' }}>*</span></label>
                        <Select
                            value={categoryOptions.find(o => o.value === formData.categoryId) || null}
                            onChange={(selected) => handleSelectChange('categoryId', selected)}
                            options={categoryOptions}
                            placeholder="-- Chọn hạng mục --"
                            isClearable
                            styles={selectStyles}
                        />
                    </div>

                    {/* ── Row 3: Nội dung (full width textarea) ─── */}
                    <div className="form-group">
                        <label>{formData.type === 'income' ? 'Nội dung thu' : 'Nội dung chi'}</label>
                        <textarea name="content" value={formData.content} onChange={handleChange} required rows={2} />
                    </div>

                    {/* ── Row 4a: Đơn vị tính — riêng 1 dòng với chip gợi ý ── */}
                    <div className="form-group unit-row">
                        <label>Đơn vị tính</label>
                        <div className="unit-input-wrap">
                            <div className="unit-select-box">
                                <Select
                                    value={unitOptions.find(o => o.value === formData.unitId) || null}
                                    onChange={(selected) => handleSelectChange('unitId', selected)}
                                    options={unitOptions}
                                    placeholder="-- Chọn đơn vị --"
                                    isClearable
                                    styles={selectStyles}
                                />
                            </div>
                            <div className="unit-chips">
                                {QUICK_UNITS.map(name => {
                                    const opt = unitOptions.find(o => o.label.toLowerCase() === name.toLowerCase());
                                    const isActive = opt && formData.unitId === opt.value;
                                    return (
                                        <button
                                            key={name}
                                            type="button"
                                            className={clsx('unit-chip', { 'unit-chip--active': isActive })}
                                            onClick={() => opt && handleSelectChange('unitId', opt)}
                                            title={name}
                                        >
                                            {name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ── Row 4b: Số lượng | Đơn giá ── */}
                    <div className="form-row">
                        <div className="form-group">
                            <label>Số lượng</label>
                            <input type="text" name="quantity" value={formatDisplayNumber(formData.quantity)} onChange={handleNumberFormatChange} />
                        </div>
                        <div className="form-group">
                            <label>Đơn giá</label>
                            <input
                                type="text"
                                name="unitPrice"
                                value={formatDisplayNumber(formData.unitPrice)}
                                onChange={handleNumberFormatChange}
                            />
                        </div>
                    </div>

                    {/* ── Nhóm Thành Tiền ── */}
                    <div className="form-group">
                        <label>Thành tiền</label>
                        <input
                            type="text"
                            value={new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 10 }).format(formData.subtotal || 0)}
                            readOnly
                            className="readonly-amount highlight-total"
                        />
                    </div>

                    {/* ── Row 5.1: VAT% | Tiền VAT ──── */}
                    <div className="form-row">
                        <div className="form-group">
                            <label>VAT (%)</label>
                            <input
                                type="number"
                                name="vatPercentage"
                                value={formData.vatPercentage}
                                onChange={handleChange}
                                min="0" max="100" step="0.01"
                            />
                        </div>
                        <div className="form-group">
                            <label>Tiền VAT</label>
                            <input
                                type="text"
                                value={new Intl.NumberFormat('vi-VN').format(formData.vatAmount)}
                                readOnly
                                className="readonly-amount"
                            />
                        </div>
                    </div>

                    {/* ── Row 6: Giảm giá% | Số giảm ── */}
                    <div className="form-row">
                        <div className="form-group">
                            <label>Giảm giá (%)</label>
                            <input
                                type="number"
                                name="discountPercentage"
                                value={formData.discountPercentage}
                                onChange={handleChange}
                                min="0" max="100" step="0.01"
                                placeholder="0"
                            />
                        </div>
                        <div className="form-group">
                            <label>Số tiền giảm</label>
                            <input
                                type="text"
                                value={new Intl.NumberFormat('vi-VN').format(formData.discountAmount)}
                                readOnly
                                className="readonly-amount discount-amount"
                            />
                        </div>
                    </div>

                    {/* ── Nhóm Thực Thanh Toán ── */}
                    <div className="form-group">
                        <label>Thực thanh toán</label>
                        <input
                            type="text"
                            value={new Intl.NumberFormat('vi-VN').format(formData.amount)}
                            readOnly
                            className="readonly-amount highlight-final"
                        />
                    </div>

                    {/* ── Row 7: Đối tác ──────── */}
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label>{formData.type === 'income' ? 'Khách hàng' : 'Nhà cung cấp'}</label>
                        <Select
                            value={partnerOptions.find(o => o.value === formData.partnerId) || null}
                            onChange={(selected) => handleSelectChange('partnerId', selected)}
                            options={partnerOptions}
                            placeholder="-- Chọn đối tác --"
                            isClearable
                            styles={selectStyles}
                        />
                    </div>

                    {/* ── Row 7.1: Người nộp/nhận ──────── */}
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label>{formData.type === 'income' ? 'Người nộp' : 'Người nhận'}</label>
                        <input type="text" name="receiver" value={formData.receiver} onChange={handleChange} />
                    </div>

                    {/* ── Row 8: Số HĐ (gần đính kèm) ─────────── */}
                    <div className="form-group">
                        <label>Số hoá đơn</label>
                        <input type="text" name="voucherCode" value={formData.voucherCode} onChange={handleChange} placeholder="Tùy chọn" />
                    </div>

                    {/* ── Row 9: Đính kèm ───────────────────────── */}
                    <div className="form-group">
                        <label>Đính kèm (Hóa đơn, chứng từ)</label>
                        <div className="file-upload">
                            <label className="upload-btn">
                                <Upload size={16} /> Chọn ảnh/file
                                <input type="file" multiple accept="image/*,.pdf" onChange={handleFileChange} hidden />
                            </label>
                            <div className="attachment-list">
                                {formData.attachments?.map((file, index) => (
                                    <div key={index} className="attachment-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <a href={file.data} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit', flex: 1 }}>
                                            {file.type?.startsWith('image/') && file.data && (
                                                <img src={file.data} alt="preview" className="file-preview-mini" />
                                            )}
                                            <span className="file-name" style={{ color: '#2563eb', textDecoration: 'underline' }}>{file.name}</span>
                                        </a>
                                        <button type="button" onClick={() => removeAttachment(index)} className="remove-file"><X size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn-secondary" disabled={isUploading}>Hủy bỏ</button>
                        <button type="submit" className="btn-primary" disabled={isUploading}>
                            {isUploading ? 'Đang lưu...' : (initialData ? 'Cập nhật' : 'Lưu phiếu')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

};

export default TransactionForm;

