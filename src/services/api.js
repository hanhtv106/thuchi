import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

axios.interceptors.request.use(config => {
    const user = JSON.parse(localStorage.getItem('thuchi_user'));
    if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
}, error => Promise.reject(error));

const apiService = {
    async login(email, password) { return (await axios.post(`${API_URL}/auth/login`, { email, password })).data; },

    // Transactions
    async getAllTransactions() { return (await axios.get(`${API_URL}/transactions`)).data; },
    async addTransaction(tx) { return (await axios.post(`${API_URL}/transactions`, tx)).data; },
    async updateTransaction(id, tx) { return (await axios.put(`${API_URL}/transactions/${id}`, tx)).data; },
    async deleteTransaction(id) { return (await axios.delete(`${API_URL}/transactions/${id}`)).data; },
    async approveTransaction(id) { return (await axios.post(`${API_URL}/transactions/${id}/approve`)).data; },
    async rejectTransaction(id) { return (await axios.post(`${API_URL}/transactions/${id}/reject`)).data; },
    async revokeTransaction(id) { return (await axios.post(`${API_URL}/transactions/${id}/revoke`)).data; },

    // Categories
    async getAllCategories() { return (await axios.get(`${API_URL}/categories`)).data; },
    async addCategory(cat) { return (await axios.post(`${API_URL}/categories`, cat)).data; },
    async updateCategory(id, cat) { return (await axios.put(`${API_URL}/categories/${id}`, cat)).data; },
    async deleteCategory(id) { return (await axios.delete(`${API_URL}/categories/${id}`)).data; },

    // Units
    async getAllUnits() { return (await axios.get(`${API_URL}/units`)).data; },
    async addUnit(unit) { return (await axios.post(`${API_URL}/units`, unit)).data; },
    async updateUnit(id, unit) { return (await axios.put(`${API_URL}/units/${id}`, unit)).data; },
    async deleteUnit(id) { return (await axios.delete(`${API_URL}/units/${id}`)).data; },

    // Partners
    async getAllPartners() { return (await axios.get(`${API_URL}/partners`)).data; },
    async addPartner(ptr) { return (await axios.post(`${API_URL}/partners`, ptr)).data; },
    async updatePartner(id, ptr) { return (await axios.put(`${API_URL}/partners/${id}`, ptr)).data; },
    async deletePartner(id) { return (await axios.delete(`${API_URL}/partners/${id}`)).data; },

    // Users
    async getAllUsers() { return (await axios.get(`${API_URL}/users`)).data; },
    async addUser(u) { return (await axios.post(`${API_URL}/users`, u)).data; },
    async updateUser(id, u) { return (await axios.put(`${API_URL}/users/${id}`, u)).data; },
    async deleteUser(id) { return (await axios.delete(`${API_URL}/users/${id}`)).data; },

    // Roles & Permissions
    async getAllRoles() { return (await axios.get(`${API_URL}/roles`)).data; },
    async addRole(role) { return (await axios.post(`${API_URL}/roles`, role)).data; },
    async updateRole(id, role) { return (await axios.put(`${API_URL}/roles/${id}`, role)).data; },
    async deleteRole(id) { return (await axios.delete(`${API_URL}/roles/${id}`)).data; },

    async getAllPermissions() { return (await axios.get(`${API_URL}/permissions`)).data; },
    async getPermissionsByRole(roleId) { return (await axios.get(`${API_URL}/role-permissions/${roleId}`)).data; },
    async updateRolePermissions(roleId, pIds) { return (await axios.post(`${API_URL}/role-permissions`, { roleId, permissionIds: pIds })).data; }
};

export default apiService;
