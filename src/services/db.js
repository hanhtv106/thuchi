import { openDB } from 'idb';

const DB_NAME = 'thuchi-db';
const DB_VERSION = 4;

export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
            // Transactions Store
            if (!db.objectStoreNames.contains('transactions')) {
                const store = db.createObjectStore('transactions', { keyPath: 'id' });
                store.createIndex('date', 'date');
                store.createIndex('type', 'type');
                store.createIndex('categoryId', 'categoryId');
                store.createIndex('status', 'status');
                store.createIndex('createdBy', 'createdBy');
            }

            // Categories Store
            if (!db.objectStoreNames.contains('categories')) {
                const store = db.createObjectStore('categories', { keyPath: 'id' });
                // Seed default categories
                const defaultCategories = [
                    { id: 'cat_1', name: 'Tiền lương', type: 'income' },
                    { id: 'cat_2', name: 'Bán hàng', type: 'income' },
                    { id: 'cat_3', name: 'Thưởng', type: 'income' },
                    { id: 'cat_4', name: 'Ăn uống', type: 'expense' },
                    { id: 'cat_5', name: 'Đi lại', type: 'expense' },
                    { id: 'cat_6', name: 'Mua sắm', type: 'expense' },
                    { id: 'cat_7', name: 'Điện nước', type: 'expense' },
                ];
                defaultCategories.forEach(cat => store.put(cat));
            }

            // Users Store (Optional if we want to store user settings or profiles locally)
            if (!db.objectStoreNames.contains('users')) {
                db.createObjectStore('users', { keyPath: 'id' });
            }

            // Units Store
            if (!db.objectStoreNames.contains('units')) {
                const store = db.createObjectStore('units', { keyPath: 'id' });
                // Seed default units
                const defaultUnits = [
                    { id: 'unit_1', name: 'Cái' },
                    { id: 'unit_2', name: 'Kg' },
                    { id: 'unit_3', name: 'Hộp' },
                    { id: 'unit_4', name: 'Bộ' },
                ];
                defaultUnits.forEach(u => store.put(u));
            }

            // Partners Store
            if (!db.objectStoreNames.contains('partners')) {
                db.createObjectStore('partners', { keyPath: 'id' });
            }

            // RBAC Stores
            if (!db.objectStoreNames.contains('roles')) {
                const store = db.createObjectStore('roles', { keyPath: 'id' });
                const defaultRoles = [
                    { id: 'admin', name: 'Admin', description: 'Quản trị viên hệ thống' },
                    { id: 'accountant', name: 'Kế toán', description: 'Quản lý thu chi' },
                    { id: 'employee', name: 'Nhân viên', description: 'Nhân viên bình thường' }
                ];
                defaultRoles.forEach(r => store.put(r));
            }

            if (!db.objectStoreNames.contains('permissions')) {
                db.createObjectStore('permissions', { keyPath: 'id' });
            }

            // Always update permissions on upgrade to ensure we have the latest list
            const permissionStore = transaction.objectStore('permissions');
            const defaultPermissions = [
                // Transactions
                { id: 'tx_view', code: 'TRANSACTION_VIEW', name: 'Xem Thu Chi', group: 'Giao dịch' },
                { id: 'tx_create', code: 'TRANSACTION_CREATE', name: 'Thêm Thu Chi', group: 'Giao dịch' },
                { id: 'tx_update', code: 'TRANSACTION_UPDATE', name: 'Sửa Thu Chi', group: 'Giao dịch' },
                { id: 'tx_delete', code: 'TRANSACTION_DELETE', name: 'Xóa Thu Chi', group: 'Giao dịch' },
                { id: 'tx_approve', code: 'TRANSACTION_APPROVE', name: 'Duyệt Thu Chi', group: 'Giao dịch' },

                // Settlement
                { id: 'settle_manage', code: 'SETTLEMENT_MANAGE', name: 'Quản lý Tất toán', group: 'Tất toán' },

                // Master Data
                { id: 'md_view', code: 'MASTER_DATA_VIEW', name: 'Xem Dữ liệu nguồn', group: 'Dữ liệu nguồn' },
                { id: 'md_manage', code: 'MASTER_DATA_MANAGE', name: 'Quản lý Dữ liệu nguồn', group: 'Dữ liệu nguồn' },

                // System
                { id: 'sys_manage', code: 'SYSTEM_MANAGE', name: 'Quản trị Hệ thống', group: 'Hệ thống' },
            ];
            defaultPermissions.forEach(p => permissionStore.put(p));

            if (!db.objectStoreNames.contains('role_permissions')) {
                const store = db.createObjectStore('role_permissions', { keyPath: 'id' }); // id = roleId_permissionId
                store.createIndex('roleId', 'roleId');
            }

            if (!db.objectStoreNames.contains('user_roles')) {
                const store = db.createObjectStore('user_roles', { keyPath: 'id' }); // id = userId_roleId
                store.createIndex('userId', 'userId');
            }
        },
    });
};

export const dbService = {
    async getAllTransactions() {
        const db = await initDB();
        return db.getAll('transactions');
    },

    async getTransaction(id) {
        const db = await initDB();
        return db.get('transactions', id);
    },

    async addTransaction(transaction) {
        const db = await initDB();
        return db.add('transactions', transaction);
    },

    async updateTransaction(transaction) {
        const db = await initDB();
        return db.put('transactions', transaction);
    },

    async deleteTransaction(id) {
        // We use soft delete in logic, but this is for hard delete if needed
        const db = await initDB();
        return db.delete('transactions', id);
    },

    async getAllCategories() {
        const db = await initDB();
        return db.getAll('categories');
    },

    async addCategory(category) {
        const db = await initDB();
        return db.add('categories', category);
    },

    async updateCategory(category) {
        const db = await initDB();
        return db.put('categories', category);
    },

    async deleteCategory(id) {
        const db = await initDB();
        return db.delete('categories', id);
    },

    // Units
    async getAllUnits() {
        const db = await initDB();
        return db.getAll('units');
    },

    async addUnit(unit) {
        const db = await initDB();
        return db.add('units', unit);
    },

    async updateUnit(unit) {
        const db = await initDB();
        return db.put('units', unit);
    },

    async deleteUnit(id) {
        const db = await initDB();
        return db.delete('units', id);
    },

    // Partners
    async getAllPartners() {
        const db = await initDB();
        return db.getAll('partners');
    },

    async addPartner(partner) {
        const db = await initDB();
        return db.add('partners', partner);
    },

    async updatePartner(partner) {
        const db = await initDB();
        return db.put('partners', partner);
    },

    async deletePartner(id) {
        const db = await initDB();
        return db.delete('partners', id);
    },

    // RBAC Methods
    async getAllRoles() {
        const db = await initDB();
        return db.getAll('roles');
    },

    async addRole(role) {
        const db = await initDB();
        return db.add('roles', role);
    },

    async updateRole(role) {
        const db = await initDB();
        return db.put('roles', role);
    },

    async deleteRole(id) {
        const db = await initDB();
        return db.delete('roles', id);
    },

    async getAllPermissions() {
        const db = await initDB();
        return db.getAll('permissions');
    },

    async getPermissionsByRole(roleId) {
        const db = await initDB();
        const assignments = await db.getAllFromIndex('role_permissions', 'roleId', roleId);
        // Returns list of { id, roleId, permissionId }
        // We might want to return just permissionIds or full permission objects.
        // Let's return the assignments first.
        return assignments;
    },

    async updateRolePermissions(roleId, permissionIds) {
        const db = await initDB();
        const tx = db.transaction('role_permissions', 'readwrite');
        const store = tx.objectStore('role_permissions');
        const index = store.index('roleId');

        // 1. Delete all existing permissions for this role
        // This is a bit inefficient without a way to delete range by index, 
        // so we fetch keys first.
        const existingKeys = await index.getAllKeys(roleId);
        await Promise.all(existingKeys.map(key => store.delete(key)));

        // 2. Add new permissions
        await Promise.all(permissionIds.map(permId => {
            return store.add({
                id: `${roleId}_${permId}`,
                roleId: roleId,
                permissionId: permId
            });
        }));

        await tx.done;
    },

    // User Methods
    async getAllUsers() {
        const db = await initDB();
        return db.getAll('users');
    },

    async addUser(user) {
        const db = await initDB();
        return db.add('users', user);
    },

    async updateUser(user) {
        const db = await initDB();
        return db.put('users', user);
    },

    async deleteUser(id) {
        const db = await initDB();
        return db.delete('users', id);
    }
};
