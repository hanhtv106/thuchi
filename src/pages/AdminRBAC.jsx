import { useState, useEffect } from 'react';
import supabaseService from '../services/supabaseService';
import { useNotification } from '../context/NotificationContext';
import { Trash2, Edit, Plus, User, Shield, Lock, Save, X, CheckSquare, Square } from 'lucide-react';
import './AdminRBAC.css';

const AdminRBAC = () => {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showNotification } = useNotification();

    // Form States
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentRole, setCurrentRole] = useState(null);
    const [formData, setFormData] = useState({});

    // Role Permission State
    const [rolePermissions, setRolePermissions] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [u, r, p] = await Promise.all([
                supabaseService.getAllUsers(),
                supabaseService.getAllRoles(),
                supabaseService.getAllPermissions()
            ]);
            setUsers(u);
            setRoles(r);
            setPermissions(p);
        } catch (error) {
            console.error('Failed to load RBAC data', error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- User Handlers ---
    const handleAddUser = () => {
        setCurrentUser(null);
        // Sử dụng role đầu tiên trong danh sách thay vì hardcode 'employee'
        const defaultRole = roles.length > 0 ? roles[0].id : '';
        setFormData({ email: '', password: '', fullName: '', role: defaultRole });
        setIsEditing(true);
    };

    const handleEditUser = (user) => {
        setCurrentUser(user);
        setFormData({ ...user });
        setIsEditing(true);
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        try {
            if (currentUser) {
                await supabaseService.updateUser(formData);
                showNotification('Cập nhật người dùng thành công!');
            } else {
                await supabaseService.addUser(formData);
                showNotification('Thêm người dùng mới thành công!');
            }
            setIsEditing(false);
            loadData();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm('Xóa người dùng này?')) {
            await supabaseService.deleteUser(id);
            loadData();
        }
    };

    // --- Role Handlers ---
    const handleAddRole = () => {
        setCurrentRole(null);
        setFormData({ id: '', name: '', description: '' });
        setRolePermissions([]);
        setIsEditing(true);
    };

    const handleEditRole = async (role) => {
        setCurrentRole(role);
        setFormData({ ...role });

        // Fetch existing permissions for this role
        const assigned = await supabaseService.getPermissionsByRole(role.id);
        const assignedIds = assigned.map(a => a.permissionId);
        setRolePermissions(assignedIds);

        setIsEditing(true);
    };

    const handleSaveRole = async (e) => {
        e.preventDefault();
        try {
            if (currentRole) {
                await supabaseService.updateRole(formData);
            } else {
                await supabaseService.addRole(formData);
            }

            // Save Permissions
            const roleId = currentRole ? currentRole.id : formData.id;
            await supabaseService.updateRolePermissions(roleId, rolePermissions);

            setIsEditing(false);
            loadData();
        } catch (error) {
            alert('Lỗi: ' + error.message);
        }
    };

    const handleDeleteRole = async (id) => {
        if (id === 'admin') {
            alert('Không thể xóa vai trò Admin hệ thống');
            return;
        }
        if (window.confirm('Xóa vai trò này?')) {
            await supabaseService.deleteRole(id);
            loadData();
        }
    };

    const togglePermission = (permId) => {
        setRolePermissions(prev => {
            if (prev.includes(permId)) {
                return prev.filter(id => id !== permId);
            } else {
                return [...prev, permId];
            }
        });
    };

    // Group permissions by module based on code prefix
    const groupedPermissions = permissions.reduce((acc, curr) => {
        // Xác định nhóm dựa vào prefix của code
        let groupName = 'Khác';
        if (curr.code.startsWith('TRANSACTION_')) {
            groupName = '📊 Thu Chi';
        } else if (curr.code.startsWith('SETTLEMENT_')) {
            groupName = '💰 Tất toán';
        } else if (curr.code.startsWith('REPORT_')) {
            groupName = '📈 Báo cáo';
        } else if (curr.code.startsWith('MASTER_')) {
            groupName = '📁 Quản lý dữ liệu';
        } else if (curr.code.startsWith('RBAC_')) {
            groupName = '👥 Phân quyền';
        }

        if (!acc[groupName]) acc[groupName] = [];
        acc[groupName].push(curr);
        return acc;
    }, {});

    const NavTab = ({ name, label, icon: Icon }) => (
        <button
            className={`tab-btn ${activeTab === name ? 'active' : ''}`}
            onClick={() => { setActiveTab(name); setIsEditing(false); }}
        >
            <Icon size={18} /> {label}
        </button>
    );

    return (
        <div className="rbac-page">
            <h1 className="page-title">Quản trị Hệ thống</h1>

            <div className="tabs-container">
                <NavTab name="users" label="Người dùng" icon={User} />
                <NavTab name="roles" label="Vai trò" icon={Shield} />
                <NavTab name="permissions" label="Quyền hạn" icon={Lock} />
            </div>

            <div className="tab-content">
                {activeTab === 'users' && (
                    <div className="rbac-section">
                        <div className="section-header">
                            <h2>Danh sách Người dùng</h2>
                            {!isEditing && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={async () => {
                                            if (window.confirm('Khởi tạo dữ liệu hệ thống mẫu lên Supabase?')) {
                                                await supabaseService.seedData();
                                                loadData();
                                            }
                                        }}
                                        className="btn btn-secondary"
                                    >
                                        Khởi tạo dữ liệu
                                    </button>
                                    <button onClick={handleAddUser} className="btn btn-primary">
                                        <Plus size={16} /> Thêm người dùng
                                    </button>
                                </div>
                            )}
                        </div>

                        {isEditing ? (
                            <form onSubmit={handleSaveUser} className="rbac-form">
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        disabled={!!currentUser}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Mật khẩu</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        placeholder={currentUser ? 'Để trống nếu không đổi' : ''}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Họ tên</label>
                                    <input
                                        value={formData.fullName}
                                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Vai trò</label>
                                    <select
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        {roles.map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-actions">
                                    <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary">Hủy</button>
                                    <button type="submit" className="btn-primary"><Save size={16} /> Lưu</button>
                                </div>
                            </form>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Email</th>
                                        <th>Họ tên</th>
                                        <th>Vai trò</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id}>
                                            <td>{u.email || u.username}</td>
                                            <td>{u.fullName}</td>
                                            <td>
                                                <span className="role-badge">{roles.find(r => r.id === u.role)?.name || u.role}</span>
                                            </td>
                                            <td>
                                                <button onClick={() => handleEditUser(u)} className="btn-icon-action"><Edit size={16} /></button>
                                                <button onClick={() => handleDeleteUser(u.id)} className="btn-icon-action text-red"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {activeTab === 'roles' && (
                    <div className="rbac-section">
                        <div className="section-header">
                            <h2>Danh sách Vai trò</h2>
                            {!isEditing && (
                                <button onClick={handleAddRole} className="btn btn-primary">
                                    <Plus size={16} /> Thêm vai trò
                                </button>
                            )}
                        </div>

                        {isEditing ? (
                            <form onSubmit={handleSaveRole} className="rbac-form role-form">
                                <div className="role-basic-info">
                                    <div className="form-group">
                                        <label>Mã vai trò (ID)</label>
                                        <input
                                            value={formData.id}
                                            onChange={e => setFormData({ ...formData, id: e.target.value })}
                                            required
                                            disabled={!!currentRole}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Tên vai trò</label>
                                        <input
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Mô tả</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            rows={2}
                                        />
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
                                                        <input
                                                            type="checkbox"
                                                            checked={rolePermissions.includes(p.id)}
                                                            onChange={() => togglePermission(p.id)}
                                                        />
                                                        <span>{p.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-actions">
                                    <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary">Hủy</button>
                                    <button type="submit" className="btn-primary"><Save size={16} /> Lưu</button>
                                </div>
                            </form>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Tên vai trò</th>
                                        <th>Mô tả</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {roles.map(r => (
                                        <tr key={r.id}>
                                            <td>{r.id}</td>
                                            <td>{r.name}</td>
                                            <td>{r.description}</td>
                                            <td>
                                                <button onClick={() => handleEditRole(r)} className="btn-icon-action"><Edit size={16} /></button>
                                                <button onClick={() => handleDeleteRole(r.id)} className="btn-icon-action text-red"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {activeTab === 'permissions' && (
                    <div className="rbac-section">
                        <div className="section-header">
                            <h2>Danh sách Quyền hạn (Hệ thống)</h2>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Mã quyền</th>
                                    <th>Tên quyền</th>
                                    <th>Nhóm</th>
                                </tr>
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
