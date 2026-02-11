import { useState, useEffect } from 'react';
import { useTransactions } from '../../context/TransactionContext';
import { useAuth } from '../../context/AuthContext';
import { X, Upload, Plus } from 'lucide-react';
import clsx from 'clsx';
import './TransactionForm.css'; // We'll create this

const TransactionForm = ({ onClose, initialData }) => {
    const { addTransaction, updateTransaction, categories, units, partners } = useTransactions();
    const { user } = useAuth();

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
        attachments: [] // Placeholder for file logic
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                date: initialData.date.split('T')[0] // Format for input type=date
            });
        } else {
            // Set default category for type
            const firstCat = categories.find(c => c.type === formData.type);
            if (firstCat) setFormData(prev => ({ ...prev, categoryId: firstCat.id }));
        }
    }, [initialData, categories, formData.type]);

    // Auto calculate amount
    useEffect(() => {
        const amount = (parseFloat(formData.quantity) || 0) * (parseFloat(formData.unitPrice) || 0);
        setFormData(prev => ({ ...prev, amount }));
    }, [formData.quantity, formData.unitPrice]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (initialData) {
                // Security check for approved transactions
                if (initialData.status === 'approved' && user.role !== 'admin') {
                    alert('Bạn không có quyền chỉnh sửa phiếu đã duyệt!');
                    return;
                }
                await updateTransaction(initialData.id, formData);
            } else {
                await addTransaction(formData);
            }
            onClose();
        } catch (error) {
            alert('Lỗi: ' + error.message);
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            // Convert to Base64
            Promise.all(files.map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve({ name: file.name, type: file.type, data: reader.result });
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            })).then(results => {
                setFormData(prev => ({ ...prev, attachments: [...(prev.attachments || []), ...results] }));
            });
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
                                    .filter(p => !p.type || (formData.type === 'income' ? p.type === 'customer' : p.type === 'supplier'))
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
                        <button type="button" onClick={onClose} className="btn-secondary">Hủy bỏ</button>
                        <button type="submit" className="btn-primary">Lưu phiếu</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TransactionForm;
