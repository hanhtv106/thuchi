import { useState } from 'react';
import { Edit, Trash2, Plus, Save, X } from 'lucide-react';
import './DataManagementTable.css';

const DataManagementTable = ({ title, data, onAdd, onUpdate, onDelete, columns = [{ key: 'name', label: 'Tên' }] }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({});

    const handleStartAdd = () => {
        setIsAdding(true);
        setFormData({});
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData({});
    };

    const handleSave = async () => {
        try {
            if (isAdding) {
                await onAdd(formData);
            } else if (editingId) {
                await onUpdate(editingId, formData);
            }
            handleCancel();
        } catch (error) {
            alert('Lỗi: ' + error.message);
        }
    };

    const handleStartEdit = (item) => {
        setEditingId(item.id);
        const initialData = {};
        columns.forEach(col => {
            initialData[col.key] = item[col.key];
        });
        setFormData(initialData);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa?')) {
            try {
                await onDelete(id);
            } catch (error) {
                alert('Lỗi xóa: ' + error.message);
            }
        }
    };

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="data-mgmt-card">
            <div className="data-mgmt-header">
                <h3 className="data-mgmt-title">{title}</h3>
                {!isAdding && !editingId && (
                    <button onClick={handleStartAdd} className="btn btn-primary">
                        <Plus size={16} /> Thêm mới
                    </button>
                )}
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            {columns.map(col => (
                                <th key={col.key}>{col.label}</th>
                            ))}
                            <th style={{ width: '100px' }}>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isAdding && (
                            <tr className="add-row">
                                {columns.map(col => (
                                    <td key={col.key}>
                                        {col.type === 'select' ? (
                                            <select
                                                autoFocus={col === columns[0]}
                                                value={formData[col.key] || ''}
                                                onChange={e => handleChange(col.key, e.target.value)}
                                            >
                                                <option value="">Chọn...</option>
                                                {col.options.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                autoFocus={col === columns[0]}
                                                type={col.type || 'text'}
                                                value={formData[col.key] || ''}
                                                onChange={e => handleChange(col.key, e.target.value)}
                                                placeholder={col.label}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSave();
                                                    if (e.key === 'Escape') handleCancel();
                                                }}
                                            />
                                        )}
                                    </td>
                                ))}
                                <td>
                                    <div className="action-buttons">
                                        <button onClick={handleSave} className="btn-icon-action btn-save" title="Lưu"><Save size={18} /></button>
                                        <button onClick={handleCancel} className="btn-icon-action btn-cancel" title="Hủy"><X size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {data.map(item => (
                            <tr key={item.id}>
                                {editingId === item.id ? (
                                    <>
                                        {columns.map(col => (
                                            <td key={col.key}>
                                                {col.type === 'select' ? (
                                                    <select
                                                        autoFocus={col === columns[0]}
                                                        value={formData[col.key] || ''}
                                                        onChange={e => handleChange(col.key, e.target.value)}
                                                    >
                                                        <option value="">Chọn...</option>
                                                        {col.options.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        autoFocus={col === columns[0]}
                                                        type={col.type || 'text'}
                                                        value={formData[col.key] || ''}
                                                        onChange={e => handleChange(col.key, e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSave();
                                                            if (e.key === 'Escape') handleCancel();
                                                        }}
                                                    />
                                                )}
                                            </td>
                                        ))}
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={handleSave} className="btn-icon-action btn-save" title="Lưu"><Save size={18} /></button>
                                                <button onClick={handleCancel} className="btn-icon-action btn-cancel" title="Hủy"><X size={18} /></button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        {columns.map(col => (
                                            <td key={col.key}>
                                                {col.type === 'select'
                                                    ? col.options.find(o => o.value === item[col.key])?.label || item[col.key]
                                                    : item[col.key]}
                                            </td>
                                        ))}
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={() => handleStartEdit(item)} className="btn-icon-action btn-edit" title="Sửa"><Edit size={18} /></button>
                                                <button onClick={() => handleDelete(item.id)} className="btn-icon-action btn-delete" title="Xóa"><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}

                        {data.length === 0 && !isAdding && (
                            <tr>
                                <td colSpan={columns.length + 1} className="empty-state">
                                    Chưa có dữ liệu. Hãy thêm mới!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DataManagementTable;
