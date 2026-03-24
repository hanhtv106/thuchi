import { useState } from 'react';
import { Edit, Trash2, Plus, Save, X } from 'lucide-react';
import './DataManagementTable.css';

// ─── Helper: render field value for display ──────────────
const displayValue = (col, item) =>
    col.type === 'select'
        ? col.options?.find(o => o.value === item[col.key])?.label ?? item[col.key] ?? '—'
        : item[col.key] ?? '—';

// ─── Inline edit/add form — shared between mobile & desktop
const EditFields = ({ columns, formData, onChange, onSave, onCancel, className = '' }) => (
    <div className={`dm-edit-card ${className}`}>
        <div className="dm-edit-fields">
            {columns.map(col => (
                <div key={col.key} className="dm-edit-field">
                    <span className="dm-edit-label">{col.label}</span>
                    {col.type === 'select' ? (
                        <select
                            value={formData[col.key] || ''}
                            onChange={e => onChange(col.key, e.target.value)}
                        >
                            <option value="">Chọn...</option>
                            {col.options.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            type={col.type || 'text'}
                            value={formData[col.key] || ''}
                            onChange={e => onChange(col.key, e.target.value)}
                            placeholder={col.label}
                            onKeyDown={e => {
                                if (e.key === 'Enter') onSave();
                                if (e.key === 'Escape') onCancel();
                            }}
                        />
                    )}
                </div>
            ))}
        </div>
        <div className="dm-edit-actions">
            <button onClick={onCancel} className="btn-icon-action btn-cancel" title="Hủy" aria-label="Hủy">
                <X size={18} aria-hidden="true" />
            </button>
            <button onClick={onSave} className="btn-icon-action btn-save" title="Lưu" aria-label="Lưu">
                <Save size={18} aria-hidden="true" />
            </button>
        </div>
    </div>
);

// ─── Main component ──────────────────────────────────────
const DataManagementTable = ({
    title, data, onAdd, onUpdate, onDelete,
    columns = [{ key: 'name', label: 'Tên' }],
    readOnly = false
}) => {
    const [isAdding, setIsAdding]   = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData]   = useState({});

    const handleStartAdd = () => { setIsAdding(true); setFormData({}); };

    const handleCancel = () => { setIsAdding(false); setEditingId(null); setFormData({}); };

    const handleSave = async () => {
        try {
            if (isAdding)       await onAdd(formData);
            else if (editingId) await onUpdate(editingId, formData);
            handleCancel();
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    };

    const handleStartEdit = (item) => {
        setEditingId(item.id);
        const init = {};
        columns.forEach(col => { init[col.key] = item[col.key]; });
        setFormData(init);
    };

    const handleDelete = (id) => {
        setTimeout(async () => {
            if (!window.confirm('Xóa mục này?')) return;
            try { await onDelete(id); }
            catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
        }, 0);
    };

    const handleChange = (key, value) =>
        setFormData(prev => ({ ...prev, [key]: value }));

    // Props shared to both mobile and desktop edit forms
    const editProps = { columns, formData, onChange: handleChange, onSave: handleSave, onCancel: handleCancel };

    return (
        <div className="data-mgmt-card">
            {/* ── Header ─────────────────────────────── */}
            <div className="data-mgmt-header">
                <h3 className="data-mgmt-title">{title}</h3>
                {!isAdding && !editingId && !readOnly && (
                    <button onClick={handleStartAdd} className="btn btn-primary" aria-label={`Thêm ${title}`}>
                        <Plus size={15} aria-hidden="true" /> Thêm mới
                    </button>
                )}
            </div>

            <div className="table-container">

                {/* ════ MOBILE: card list ════════════════ */}
                <div className="dm-card-list" role="list" aria-label={title}>

                    {/* Add form (mobile) */}
                    {isAdding && <EditFields {...editProps} />}

                    {data.length === 0 && !isAdding && (
                        <p className="empty-state">Chưa có dữ liệu. Hãy thêm mới!</p>
                    )}

                    {data.map(item => (
                        editingId === item.id ? (
                            /* Edit form (mobile) */
                            <EditFields key={item.id} {...editProps} />
                        ) : (
                            <div key={item.id} className="dm-item-card" role="listitem">
                                <div className="dm-item-info">
                                    <span className="dm-item-name">
                                        {displayValue(columns[0], item)}
                                    </span>
                                    {/* Extra columns as meta */}
                                    {columns.slice(1).map(col => (
                                        <span key={col.key} className="dm-item-meta">
                                            {col.label}: {displayValue(col, item)}
                                        </span>
                                    ))}
                                </div>
                                {!readOnly && (
                                    <div className="dm-item-actions">
                                        <button
                                            onClick={() => handleStartEdit(item)}
                                            className="btn-icon text-blue"
                                            aria-label={`Sửa ${displayValue(columns[0], item)}`}
                                            title="Sửa"
                                        >
                                            <Edit size={16} aria-hidden="true" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="btn-icon text-red"
                                            aria-label={`Xóa ${displayValue(columns[0], item)}`}
                                            title="Xóa"
                                        >
                                            <Trash2 size={16} aria-hidden="true" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    ))}
                </div>

                {/* ════ DESKTOP: table ═══════════════════ */}
                <table className="data-table" aria-label={title}>
                    <thead>
                        <tr>
                            {columns.map(col => <th key={col.key} scope="col">{col.label}</th>)}
                            {!readOnly && <th scope="col" style={{ width: '100px' }}>Hành động</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {/* Add row */}
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
                                                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
                                            />
                                        )}
                                    </td>
                                ))}
                                <td>
                                    <div className="action-buttons">
                                        <button onClick={handleSave}  className="btn-icon-action btn-save"   title="Lưu"  aria-label="Lưu"><Save   size={18} /></button>
                                        <button onClick={handleCancel} className="btn-icon-action btn-cancel" title="Hủy" aria-label="Hủy"><X      size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {/* Data rows */}
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
                                                        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
                                                    />
                                                )}
                                            </td>
                                        ))}
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={handleSave}  className="btn-icon-action btn-save"   title="Lưu"  aria-label="Lưu"><Save size={18} /></button>
                                                <button onClick={handleCancel} className="btn-icon-action btn-cancel" title="Hủy" aria-label="Hủy"><X    size={18} /></button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        {columns.map(col => (
                                            <td key={col.key}>{displayValue(col, item)}</td>
                                        ))}
                                        <td>
                                            {!readOnly && (
                                                <div className="action-buttons">
                                                    <button onClick={() => handleStartEdit(item)} className="btn-icon text-blue" title="Sửa"  aria-label={`Sửa ${displayValue(columns[0], item)}`}><Edit   size={16} /></button>
                                                    <button onClick={() => handleDelete(item.id)} className="btn-icon text-red"  title="Xóa" aria-label={`Xóa ${displayValue(columns[0], item)}`}><Trash2 size={16} /></button>
                                                </div>
                                            )}
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
