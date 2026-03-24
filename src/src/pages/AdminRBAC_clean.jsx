import { useState, useEffect } from 'react';
import apiService from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { Trash2, Edit, Plus, User, Shield, Lock, Save } from 'lucide-react';
import './AdminRBAC.css';

// Avatar initials helper
const initials = (name = '') => name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

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
                apiService.getAllPermissions()
            ]);
            setUsers(u); setRoles(r); setPermissions(p);
        } catch (error) {
            console.error('Failed to load RBAC data', error);
        } finally {
            setIsLoading(false);
        }
    };

    // User handlers
    const handleAddUser = () => {
        setCurrentUser(null);
        setFormData({ username: '', email: '', password: '', fullName: '', role: roles[0]?.id || '' });
        setIsEditing(true);
    };
    const handleEditUser = (user) => { setCurrentUser(user); setFormData({ ...user, password: '' }); setIsEditing(true); };
    const handleSaveUser = async (e) => {
        e.preventDefault();
        try {
            if (currentUser) {
                const updateData = { ...currentUser, ...formData };
                if (!formData.password) delete updateData.password;
                await apiService.updateUser(updateData.id, updateData);
                showNotification('Cáº­p nháº­t ngÆ°á»i dÃ¹ng thÃ nh cÃ´ng!');
            } else {
                await apiService.addUser(formData);
                showNotification('ThÃªm ngÆ°á»i dÃ¹ng má»›i thÃ nh cÃ´ng!');
            }
            setIsEditing(false); loadData();
        } catch (error) { showNotification(error.message, 'error'); }
    };
    const handleDeleteUser = (id) => {
        setTimeout(async () => {
            if (!window.confirm('XÃ³a ngÆ°á»i dÃ¹ng nÃ y?')) return;
            try { await apiService.deleteUser(id); showNotification('ÄÃ£ xÃ³a ngÆ°á»i dÃ¹ng'); loadData(); }
            catch (error) { showNotification('Lá»—i: ' + (error.response?.data?.error || error.message), 'error'); }
        }, 0);
    };

    // Role handlers
    const handleAddRole = () => { setCurrentRole(null); setFormData({ id: '', name: '', description: '' }); setRolePermissions([]); setIsEditing(true); };
    const handleEditRole = async (role) => {
        setCurrentRole(role); setFormData({ ...role });
        const assignedIds = await apiService.getPermissionsByRole(role.id);
        setRolePermissions(assignedIds); setIsEditing(true);
    };
    const handleSaveRole = async (e) => {
        e.preventDefault();
        try {
            if (currentRole) { await apiService.updateRole(formData.id, formData); }
            else { await apiService.addRole(formData); }
            const roleId = currentRole ? currentRole.id : formData.id;
            await apiService.updateRolePermissions(roleId, rolePermissions);
            showNotification('LÆ°u vai trÃ² thÃ nh cÃ´ng!'); setIsEditing(false); loadData();
        } catch (error) { showNotification('Lá»—i: ' + error.message, 'error'); }
    };
    const handleDeleteRole = (id) => {
        if (id === 'admin') { showNotification('KhÃ´ng thá»ƒ xÃ³a vai trÃ² Admin há»‡ thá»‘ng', 'error'); return; }
        setTimeout(async () => {
            if (!window.confirm('XÃ³a vai trÃ² nÃ y?')) return;
            try { await apiService.deleteRole(id); showNotification('ÄÃ£ xÃ³a vai trÃ²'); loadData(); }
            catch (error) { showNotification('Lá»—i: ' + (error.response?.data?.error || error.message), 'error'); }
        }, 0);
    };
    const togglePermission = (permId) =>
        setRolePermissions(prev => prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]);

    const GROUP_ICONS = { 'Giao dá»‹ch': 'ðŸ“Š', 'Táº¥t toÃ¡n': 'ðŸ’°', 'BÃ¡o cÃ¡o': 'ðŸ“ˆ', 'Dá»¯ liá»‡u nguá»“n': 'ðŸ“', 'Há»‡ thá»‘ng': 'âš™ï¸' };
    const groupedPermissions = permissions.reduce((acc, curr) => {
        const groupName = curr.group || 'KhÃ¡c';
        const displayName = `${GROUP_ICONS[groupName] || 'ðŸ”’'} ${groupName}`;
        if (!acc[displayName]) acc[displayName] = [];
        acc[displayName].push(curr);
        return acc;
    }, {});

    const NavTab = ({ name, label, icon: Icon }) => (
        <button
            className={`tab-btn ${activeTab === name ? 'active' : ''}`}
            onClick={() => { setActiveTab(name); setIsEditing(false); }}
            aria-current={activeTab === name ? 'page' : undefined}
        >
            <Icon size={16} aria-hidden="true" /> {label}
        </button>
    );

    if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Äang táº£i...</div>;

    return (
        <div className="rbac-page">
            <h1 className="page-title">Quáº£n trá»‹ Há»‡ thá»‘ng</h1>

            <div className="tabs-container">
                <NavTab name="users"       label="NgÆ°á»i dÃ¹ng" icon={User}   />
                <NavTab name="roles"       label="Vai trÃ²"    icon={Shield} />
                <NavTab name="permissions" label="Quyá»n háº¡n"  icon={Lock}   />
            </div>

            <div className="tab-content">

                {/* â•â• USERS TAB â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
                {activeTab === 'users' && (
                    <div className="rbac-section">
                        <div className="section-header">
                            <h2>Danh sÃ¡ch NgÆ°á»i dÃ¹ng</h2>
                            {!isEditing && (
                                <button onClick={handleAddUser} className="btn btn-primary" aria-label="ThÃªm ngÆ°á»i dÃ¹ng">
                                    <Plus size={15} aria-hidden="true" /> ThÃªm
                                </button>
                            )}
                        </div>

                        {isEditing ? (
                            <form onSubmit={handleSaveUser} className="rbac-form">
                                <div className="form-group">
                                    <label>TÃªn Ä‘Äƒng nháº­p</label>
                                    <input type="text" value={formData.username || ''} onChange={e => setFormData({ ...formData, username: e.target.value })} required placeholder="user123" />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} required placeholder="user@gmail.com" />
                                </div>
                                <div className="form-group">
                                    <label>Máº­t kháº©u</label>
                                    <input type="password" value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!currentUser} placeholder={currentUser ? 'Äá»ƒ trá»‘ng náº¿u khÃ´ng Ä‘á»•i' : ''} />
                                </div>
                                <div className="form-group">
                                    <label>Há» tÃªn</label>
                                    <input value={formData.fullName || ''} onChange={e => setFormData({ ...formData, fullName: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Vai trÃ²</label>
                                    <select value={formData.role || ''} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-actions">
                                    <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary">Há»§y</button>
                                    <button type="submit" className="btn-primary"><Save size={15} aria-hidden="true" /> LÆ°u</button>
                                </div>
                            </form>
                        ) : (
                            <>
                                {/* Mobile Card List */}
                                <div className="rbac-card-list" role="list">
                                    {users.length === 0 && <p className="text-center">ChÆ°a cÃ³ ngÆ°á»i dÃ¹ng nÃ o</p>}
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
                                                <button onClick={() => handleEditUser(u)} className="btn-icon-action" aria-label={`Sá»­a ${u.fullName}`} title="Sá»­a"><Edit size={16} /></button>
                                                <button onClick={() => handleDeleteUser(u.id)} className="btn-icon-action text-red" aria-label={`XÃ³a ${u.fullName}`} title="XÃ³a"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop Table */}
                                <table className="rbac-desktop-table" aria-label="Danh sÃ¡ch ngÆ°á»i dÃ¹ng">
                                    <thead>
                                        <tr>
                                            <th>TÃªn Ä‘Äƒng nháº­p</th>
                                            <th>Email</th>
                                            <th>Há» tÃªn</th>
                                            <th>Vai trÃ²</th>
                                            <th style={{ width: '90px' }}>HÃ nh Ä‘á»™ng</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr key={u.id}>
                                                <td>{u.username}</td>
                                                <td>{u.email}</td>
                                                <td>{u.fullName}</td>
                                                <td><span className="role-badge">{roles.find(r => r.id === u.role)?.name || u.role}</span></td>
                                                <td style={{ display: 'flex', gap: '4px' }}>
                                                    <button onClick={() => handleEditUser(u)} className="btn-icon-action" aria-label={`Sá»­a ${u.fullName}`} title="Sá»­a"><Edit size={15} /></button>
                                                    <button onClick={() => handleDeleteUser(u.id)} className="btn-icon-action text-red" aria-label={`XÃ³a ${u.fullName}`} title="XÃ³a"><Trash2 size={15} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {users.length === 0 && <tr><td colSpan="5" className="text-center">ChÆ°a cÃ³ ngÆ°á»i dÃ¹ng nÃ o</td></tr>}
                                    </tbody>
                                </table>
                            </>
                        )}
                    </div>
                )}

                {/* â•â• ROLES TAB â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
                {activeTab === 'roles' && (
                    <div className="rbac-section">
                        <div className="section-header">
                            <h2>Danh sÃ¡ch Vai trÃ²</h2>
                            {!isEditing && (
                                <button onClick={handleAddRole} className="btn btn-primary" aria-label="ThÃªm vai trÃ²">
                                    <Plus size={15} aria-hidden="true" /> ThÃªm
                                </button>
                            )}
                        </div>

                        {isEditing ? (
                            <form onSubmit={handleSaveRole} className="rbac-form role-form">
                                <div className="role-basic-info">
                                    <div className="form-group">
                                        <label>MÃ£ vai trÃ² (ID)</label>
                                        <input value={formData.id || ''} onChange={e => setFormData({ ...formData, id: e.target.value })} required disabled={!!currentRole} />
                                    </div>
                                    <div className="form-group">
                                        <label>TÃªn vai trÃ²</label>
                                        <input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label>MÃ´ táº£</label>
                                        <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} />
                                    </div>
                                </div>

                                <div className="permission-selector">
                                    <h3>PhÃ¢n quyá»n</h3>
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
                                    <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary">Há»§y</button>
                                    <button type="submit" className="btn-primary"><Save size={15} aria-hidden="true" /> LÆ°u</button>
                                </div>
                            </form>
                        ) : (
                            <>
                                {/* Mobile Card */}
                                <div className="rbac-card-list" role="list">
                                    {roles.map(r => (
                                        <div key={r.id} className="rbac-user-card" role="listitem">
                                            <div className="rbac-user-info">
                                                <span className="rbac-user-name">{r.name}</span>
                                                <span className="rbac-user-email">{r.id}</span>
                                                {r.description && <span className="rbac-user-email">{r.description}</span>}
                                            </div>
                                            <div className="rbac-card-actions">
                                                <button onClick={() => handleEditRole(r)} className="btn-icon-action" aria-label={`Sá»­a ${r.name}`} title="Sá»­a"><Edit size={16} /></button>
                                                <button onClick={() => handleDeleteRole(r.id)} className="btn-icon-action text-red" aria-label={`XÃ³a ${r.name}`} title="XÃ³a"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop Table */}
                                <table className="rbac-desktop-table" aria-label="Danh sÃ¡ch vai trÃ²">
                                    <thead>
                                        <tr>
                                            <th>ID</th><th>TÃªn vai trÃ²</th><th>MÃ´ táº£</th><th style={{ width: '90px' }}>HÃ nh Ä‘á»™ng</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {roles.map(r => (
                                            <tr key={r.id}>
                                                <td><code>{r.id}</code></td>
                                                <td>{r.name}</td>
                                                <td>{r.description}</td>
                                                <td style={{ display: 'flex', gap: '4px' }}>
                                                    <button onClick={() => handleEditRole(r)} className="btn-icon-action" title="Sá»­a"><Edit size={15} /></button>
                                                    <button onClick={() => handleDeleteRole(r.id)} className="btn-icon-action text-red" title="XÃ³a"><Trash2 size={15} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )}
                    </div>
                )}

                {/* â•â• PERMISSIONS TAB â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
                {activeTab === 'permissions' && (
                    <div className="rbac-section">
                        <div className="section-header">
                            <h2>Danh sÃ¡ch Quyá»n háº¡n (Há»‡ thá»‘ng)</h2>
                        </div>

                        {/* Mobile: group cards */}
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
                                                <code style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#475569', padding: '0.1rem 0.35rem', borderRadius: '4px', fontFamily: 'monospace', width: 'fit-content' }}>{p.code}</code>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Desktop table */}
                        <table className="rbac-desktop-table" aria-label="Danh sÃ¡ch quyá»n háº¡n">
                            <thead>
                                <tr><th>MÃ£ quyá»n</th><th>TÃªn quyá»n</th><th>NhÃ³m</th></tr>
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

