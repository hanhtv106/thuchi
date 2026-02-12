import { useState, useEffect } from 'react';
import { useTransactions } from '../../context/TransactionContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { X, Upload, Plus } from 'lucide-react';
import clsx from 'clsx';
import './TransactionForm.css'; // We'll create this

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
        unit: '',
        amount: 0,
        partner: '',
        receiver: '',
        attachments: []
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
        const amount = (parseFloat(formData.quantity) || 0) * (parseFloat(formData.unitPrice) || 0);
        setFormData(prev => ({ ...prev, amount }));
    }, [formData.quantity, formData.unitPrice]);

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
            showNotification('Lỗi: ' + error.message, 'error');
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

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>{initialData ? 'Cập nhật Giao dịch' : 'Thêm mới Giao dịch'}</h3>
                    <button onClick={onClose} className="close-btn"><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className="tx-form">
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
                            <label>Ngày chứng từ</label>
                            <input type="date" name="date" value={formData.date} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group full">
                            <label>Hạng mục</label>
                            <select name="categoryId" value={formData.categoryId} onChange={handleChange} required>
                                <option value="">-- Chọn hạng mục --</option>
                                {filteredCategories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>{formData.type === 'income' ? 'Nội dung thu' : 'Nội dung chi'}</label>
                        <textarea name="content" value={formData.content} onChange={handleChange} required rows={2} />
                    </div>

                    <div className="form-row three-cols">
                        <div className="form-group">
                            <label>Số lượng</label>
                            <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" />
                        </div>
                        <div className="form-group">
                            <label>Đơn vị tính</label>
                            <select name="unit" value={formData.unit} onChange={handleChange}>
                                <option value="">-- Chọn đơn vị --</option>
                                {units.map(u => (
                                    <option key={u.id} value={u.name}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Đơn giá</label>
                            <input
                                type="text"
                                name="unitPrice"
                                value={new Intl.NumberFormat('vi-VN').format(formData.unitPrice)}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setFormData(prev => ({ ...prev, unitPrice: val ? parseInt(val, 10) : 0 }));
                                }}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Thành tiền (Tự động)</label>
                        <input
                            type="text"
                            value={new Intl.NumberFormat('vi-VN').format(formData.amount)}
                            readOnly
                            className="readonly-amount"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>{formData.type === 'income' ? 'Người nộp' : 'Người nhận'}</label>
                            <input type="text" name="receiver" value={formData.receiver} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>{formData.type === 'income' ? 'Khách hàng' : 'Nhà cung cấp'}</label>
                            <select name="partner" value={formData.partner} onChange={handleChange}>
                                <option value="">-- Chọn đối tác --</option>
                                {partners
                                    .filter(p => {
                                        if (!p.type) return true; // Hiển thị nếu không có loại (dữ liệu cũ)
                                        if (p.type === 'both') return true; // Hiển thị nếu là cả hai
                                        return formData.type === 'income' ? p.type === 'customer' : p.type === 'supplier';
                                    })
                                    .map(p => (
                                        <option key={p.id} value={p.name}>{p.name}</option>
                                    ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Đính kèm (Hóa đơn, chứng từ)</label>
                        <div className="file-upload">
                            <label className="upload-btn">
                                <Upload size={16} /> Chọn ảnh/file
                                <input type="file" multiple accept="image/*,.pdf" onChange={handleFileChange} hidden />
                            </label>
                            <div className="attachment-list">
                                {formData.attachments?.map((file, index) => (
                                    <div key={index} className="attachment-item">
                                        <span className="file-name">{file.name}</span>
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
