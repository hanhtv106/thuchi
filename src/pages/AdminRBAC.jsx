import { useState, useEffect } from 'react';
import apiService from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { Trash2, Edit, Plus, User, Shield, Lock, Save } from 'lucide-react';
import './AdminRBAC.css';

const initials = (name = '') =>
    name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

const AdminRBAC = () => {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showNotification } = useNotification();

    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentRole, setCurrentRole] = useState(null);
    const [formData, setFormData] = useState({});
    const [rolePermissions, setRolePermissions] = useState([]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [u, r, p] = await Promise.all([
                apiService.getAllUsers(),
                apiService.getAllRoles(),
                apiService.getAllPermissions(),
            ]);
            setUsers(u); setRoles(r); setPermissions(p);
        } catch (err) {
            console.error('Failed to load RBAC data', err);
        } finally {
            setIsLoading(false);
        }
    };

    /* ── User handlers ─────────────────────────────────────────── */
    const handleAddUser = () => {
        setCurrentUser(null);
        setFormData({ username: '', email: '', password: '', fullName: '', role: roles[0]?.id || '' });
        setIsEditing(true);
    };
    const handleEditUser = (user) => {
        setCurrentUser(user);
        setFormData({ ...user, password: '' });
        setIsEditing(true);
    };
    const handleSaveUser = async (e) => {
        e.preventDefault();
        try {
            if (currentUser) {
                const upd = { ...currentUser, ...formData };
                if (!formData.password) delete upd.password;
                await apiService.updateUser(upd.id, upd);
                showNotification('Cập nhật người dùng thành công!');
            } else {
                await apiService.addUser(formData);
                showNotification('Thêm người dùng mới thành công!');
            }
            setIsEditing(false); loadData();
        } catch (err) { showNotification(err.message, 'error'); }
    };
    const handleDeleteUser = (id) => {
        setTimeout(async () => {
            if (!window.confirm('Xóa người dùng này?')) return;
            try { await apiService.deleteUser(id); showNotification('Đã xóa người dùng'); loadData(); }
            catch (err) { showNotification('Lỗi: ' + (err.response?.data?.error || err.message), 'error'); }
        }, 0);
    };

    /* ── Role handlers ─────────────────────────────────────────── */
    const handleAddRole = () => {
        setCurrentRole(null);
        setFormData({ id: '', name: '', description: '' });
        setRolePermissions([]);
        setIsEditing(true);
    };
    const handleEditRole = async (role) => {
        setCurrentRole(role); setFormData({ ...role });
        const ids = await apiService.getPermissionsByRole(role.id);
        setRolePermissions(ids); setIsEditing(true);
    };
    const handleSaveRole = async (e) => {
        e.preventDefault();
        try {
            if (currentRole) await apiService.updateRole(formData.id, formData);
            else await apiService.addRole(formData);
            const roleId = currentRole ? currentRole.id : formData.id;
            await apiService.updateRolePermissions(roleId, rolePermissions);
            showNotification('Lưu vai trò thành công!');
            setIsEditing(false); loadData();
        } catch (err) { showNotification('Lỗi: ' + err.message, 'error'); }
    };
    const handleDeleteRole = (id) => {
        if (id === 'admin') { showNotification('Không thể xóa vai trò Admin hệ thống', 'error'); return; }
        setTimeout(async () => {
            if (!window.confirm('Xóa vai trò này?')) return;
            try { await apiService.deleteRole(id); showNotification('Đã xóa vai trò'); loadData(); }
            catch (err) { showNotification('Lỗi: ' + (err.response?.data?.error || err.message), 'error'); }
        }, 0);
    };
    const togglePermission = (permId) =>
        setRolePermissions(prev =>
            prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
        );

    /* ── Group permissions ─────────────────────────────────────── */
    const GROUP_ICONS = {
        'Giao dịch': '📊',
        'Tất toán': '💰',
        'Báo cáo': '📈',
        'Dữ liệu nguồn': '📁',
        'Hệ thống': '⚙️',
    };
    const groupedPermissions = permissions.reduce((acc, curr) => {
        const g = curr.group || 'Khác';
        const key = (GROUP_ICONS[g] || '🔒') + ' ' + g;
        if (!acc[key]) acc[key] = [];
        acc[key].push(curr);
        return acc;
    }, {});

    /* ── NavTab ────────────────────────────────────────────────── */
    const NavTab = ({ name, label, icon: Icon }) => (
        <button
            className={`tab-btn${activeTab === name ? ' active' : ''}`}
            onClick={() => { setActiveTab(name); setIsEditing(false); }}
            aria-current={activeTab === name ? 'page' : undefined}
        >
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
        </button>
    );

    if (isLoading) return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            Đang tải...
        </div>
    );

    return (
        <div className="rbac-page">
            <h1 className="page-title">Quản trị Hệ thống</h1>

            <div className="tabs-container">
                <NavTab name="users"       label="Người dùng" icon={User}   />
                <NavTab name="roles"       label="Vai trò"    icon={Shield} />
                <NavTab name="permissions" label="Quyền hạn"  icon={Lock}   />
            </div>

            <div className="tab-content">

                {/* ══ USERS ══════════════════════════════════════════ */}
                {activeTab === 'users' && (
                    <div className="rbac-section">
                        <div className="section-header">
                            <h2>Danh sách Người dùng</h2>
                            {!isEditing && (
                                <button onClick={handleAddUser} className="btn btn-primary">
                                    <Plus size={15} aria-hidden="true" /> Thêm
                                </button>
                            )}
                        </div>

                        {isEditing ? (
                            <form onSubmit={handleSaveUser} className="rbac-form">
                                <div className="form-group">
                                    <label>Tên đăng nhập</label>
                                    <input type="text" value={formData.username || ''} onChange={e => setFormData({ ...formData, username: e.target.value })} required placeholder="user123" />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} required placeholder="user@gmail.com" />
                                </div>
                                <div className="form-group">
                                    <label>Mật khẩu</label>
                                    <input type="password" value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!currentUser} placeholder={currentUser ? 'Để trống nếu không đổi' : ''} />
                                </div>
                                <div className="form-group">
                                    <label>Họ tên</label>
                                    <input value={formData.fullName || ''} onChange={e => setFormData({ ...formData, fullName: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Vai trò</label>
                                    <select value={formData.role || ''} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-actions">
                                    <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary">Hủy</button>
                                    <button type="submit" className="btn-primary"><Save size={15} /> Lưu</button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div className="rbac-card-list" role="list">
                                    {users.length === 0 && <p className="text-center">Chưa có người dùng nào</p>}
                                    {users.map(u => (
                                        <div key={u.id} className="rbac-user-card" role="listitem">
                                            <div className="rbac-user-avatar" aria-hidden="true">{initials(u.fullName)}</div>
                                            <div className="rbac-user-info">
                                                <span className="rbac-user-name">{u.fullName || u.username}</span>
                                                <span className="rbac-user-email">{u.email}</span>
                                                <div className="rbac-user-meta">
                                                    <span className="role-badge">{roles.find(r => r.id === u.role)?.name || u.role}</span>
                                                </div>
                                            </div>
                                            <div className="rbac-card-actions">
                                                <button onClick={() => handleEditUser(u)} className="btn-icon-action" title="Sửa"><Edit size={16} /></button>
                                                <button onClick={() => handleDeleteUser(u.id)} className="btn-icon-action text-red" title="Xóa"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <table className="rbac-desktop-table">
                                    <thead>
                                        <tr>
                                            <th>Tên đăng nhập</th>
                                            <th>Email</th>
                                            <th>Họ tên</th>
                                            <th>Vai trò</th>
                                            <th style={{ width: 90 }}>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr key={u.id}>
                                                <td>{u.username}</td>
                                                <td>{u.email}</td>
                                                <td>{u.fullName}</td>
                                                <td><span className="role-badge">{roles.find(r => r.id === u.role)?.name || u.role}</span></td>
                                                <td style={{ display: 'flex', gap: 4 }}>
                                                    <button onClick={() => handleEditUser(u)} className="btn-icon-action" title="Sửa"><Edit size={15} /></button>
                                                    <button onClick={() => handleDeleteUser(u.id)} className="btn-icon-action text-red" title="Xóa"><Trash2 size={15} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {users.length === 0 && <tr><td colSpan={5} className="text-center">Chưa có người dùng nào</td></tr>}
                                    </tbody>
                                </table>
                            </>
                        )}
                    </div>
                )}

                {/* ══ ROLES ══════════════════════════════════════════ */}
                {activeTab === 'roles' && (
                    <div className="rbac-section">
                        <div className="section-header">
                            <h2>Danh sách Vai trò</h2>
                            {!isEditing && (
                                <button onClick={handleAddRole} className="btn btn-primary">
                                    <Plus size={15} aria-hidden="true" /> Thêm
                                </button>
                            )}
                        </div>

                        {isEditing ? (
                            <form onSubmit={handleSaveRole} className="rbac-form role-form">
                                <div className="role-basic-info">
                                    <div className="form-group">
                                        <label>Mã vai trò (ID)</label>
                                        <input value={formData.id || ''} onChange={e => setFormData({ ...formData, id: e.target.value })} required disabled={!!currentRole} />
                                    </div>
                                    <div className="form-group">
                                        <label>Tên vai trò</label>
                                        <input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Mô tả</label>
                                        <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} />
                                    </div>
                                </div>

                                <div className="permission-selector">
                                    <h3>Phân quyền</h3>
                                    <div className="permissions-grid">
                                        {Object.entries(groupedPermissions).map(([group, perms]) => (
                                            <div key={group} className="permission-group">
                                                <h4>{group}</h4>
                                                {perms.map(p => (
                                                    <label key={p.id} className="permission-item">
                                                        <input type="checkbox" checked={rolePermissions.includes(p.id)} onChange={() => togglePermission(p.id)} />
                                                        <span>{p.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-actions">
                                    <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary">Hủy</button>
                                    <button type="submit" className="btn-primary"><Save size={15} /> Lưu</button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div className="rbac-card-list" role="list">
                                    {roles.map(r => (
                                        <div key={r.id} className="rbac-user-card" role="listitem">
                                            <div className="rbac-user-info">
                                                <span className="rbac-user-name">{r.name}</span>
                                                <span className="rbac-user-email">{r.id}</span>
                                                {r.description && <span className="rbac-user-email">{r.description}</span>}
                                            </div>
                                            <div className="rbac-card-actions">
                                                <button onClick={() => handleEditRole(r)} className="btn-icon-action" title="Sửa"><Edit size={16} /></button>
                                                <button onClick={() => handleDeleteRole(r.id)} className="btn-icon-action text-red" title="Xóa"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <table className="rbac-desktop-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th><th>Tên vai trò</th><th>Mô tả</th>
                                            <th style={{ width: 90 }}>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {roles.map(r => (
                                            <tr key={r.id}>
                                                <td><code>{r.id}</code></td>
                                                <td>{r.name}</td>
                                                <td>{r.description}</td>
                                                <td style={{ display: 'flex', gap: 4 }}>
                                                    <button onClick={() => handleEditRole(r)} className="btn-icon-action" title="Sửa"><Edit size={15} /></button>
                                                    <button onClick={() => handleDeleteRole(r.id)} className="btn-icon-action text-red" title="Xóa"><Trash2 size={15} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )}
                    </div>
                )}

                {/* ══ PERMISSIONS ════════════════════════════════════ */}
                {activeTab === 'permissions' && (
                    <div className="rbac-section">
                        <div className="section-header">
                            <h2>Danh sách Quyền hạn (Hệ thống)</h2>
                        </div>

                        <div className="rbac-card-list" role="list">
                            {Object.entries(groupedPermissions).map(([group, perms]) => (
                                <div key={group}>
                                    <div style={{ padding: '0.5rem 1rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{group}</span>
                                    </div>
                                    {perms.map(p => (
                                        <div key={p.id} className="rbac-user-card" role="listitem">
                                            <div className="rbac-user-info">
                                                <span className="rbac-user-name">{p.name}</span>
                                                <code style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#475569', padding: '0.1rem 0.35rem', borderRadius: 4, fontFamily: 'monospace', width: 'fit-content' }}>{p.code}</code>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        <table className="rbac-desktop-table">
                            <thead>
                                <tr><th>Mã quyền</th><th>Tên quyền</th><th>Nhóm</th></tr>
                            </thead>
                            <tbody>
                                {permissions.map(p => (
                                    <tr key={p.id}>
                                        <td><code>{p.code}</code></td>
                                        <td>{p.name}</td>
                                        <td>{p.group}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminRBAC;
