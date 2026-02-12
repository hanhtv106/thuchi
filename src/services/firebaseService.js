import {
    collection,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    setDoc,
    writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

const firebaseService = {
    // Generic methods
    async getAll(collectionName) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getById(collectionName, id) {
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    },

    async add(collectionName, data) {
        // If data has an ID, use setDoc, otherwise addDoc
        if (data.id) {
            const { id, ...rest } = data;
            await setDoc(doc(db, collectionName, id), rest);
            return data;
        } else {
            const docRef = await addDoc(collection(db, collectionName), data);
            return { id: docRef.id, ...data };
        }
    },

    async update(collectionName, id, data) {
        const docRef = doc(db, collectionName, id);
        const { id: _, ...rest } = data;
        await updateDoc(docRef, rest);
        return { id, ...rest };
    },

    async delete(collectionName, id) {
        await deleteDoc(doc(db, collectionName, id));
    },

    async seedData() {
        const batch = writeBatch(db);

        // 1. Seed Categories
        const categories = [
            { id: 'cat_1', name: 'Tiền lương', type: 'income' },
            { id: 'cat_2', name: 'Bán hàng', type: 'income' },
            { id: 'cat_3', name: 'Thưởng', type: 'income' },
            { id: 'cat_4', name: 'Ăn uống', type: 'expense' },
            { id: 'cat_5', name: 'Đi lại', type: 'expense' },
            { id: 'cat_6', name: 'Mua sắm', type: 'expense' },
            { id: 'cat_7', name: 'Điện nước', type: 'expense' },
        ];
        categories.forEach(cat => {
            const ref = doc(db, 'categories', cat.id);
            batch.set(ref, cat);
        });

        // 2. Seed Units
        const units = [
            { id: 'unit_1', name: 'Cái' },
            { id: 'unit_2', name: 'Kg' },
            { id: 'unit_3', name: 'Hộp' },
            { id: 'unit_4', name: 'Bộ' },
        ];
        units.forEach(u => {
            const ref = doc(db, 'units', u.id);
            batch.set(ref, u);
        });

        // 3. Seed Roles
        const roles = [
            { id: 'admin', name: 'Admin', description: 'Quản trị viên hệ thống' },
            { id: 'accountant', name: 'Kế toán', description: 'Quản lý thu chi' },
            { id: 'employee', name: 'Nhân viên', description: 'Nhân viên bình thường' }
        ];
        roles.forEach(r => {
            const ref = doc(db, 'roles', r.id);
            batch.set(ref, r);
        });

        // 4. Seed Permissions
        const permissions = [
            { id: 'tx_view', code: 'TRANSACTION_VIEW', name: 'Xem Thu Chi', group: 'Giao dịch' },
            { id: 'tx_create', code: 'TRANSACTION_CREATE', name: 'Thêm Thu Chi', group: 'Giao dịch' },
            { id: 'tx_update', code: 'TRANSACTION_UPDATE', name: 'Sửa Thu Chi', group: 'Giao dịch' },
            { id: 'tx_delete', code: 'TRANSACTION_DELETE', name: 'Xóa Thu Chi', group: 'Giao dịch' },
            { id: 'tx_approve', code: 'TRANSACTION_APPROVE', name: 'Duyệt Thu Chi', group: 'Giao dịch' },
            { id: 'settle_manage', code: 'SETTLEMENT_MANAGE', name: 'Quản lý Tất toán', group: 'Tất toán' },
            { id: 'md_view', code: 'MASTER_DATA_VIEW', name: 'Xem Dữ liệu nguồn', group: 'Dữ liệu nguồn' },
            { id: 'md_manage', code: 'MASTER_DATA_MANAGE', name: 'Quản lý Dữ liệu nguồn', group: 'Dữ liệu nguồn' },
            { id: 'sys_manage', code: 'SYSTEM_MANAGE', name: 'Quản trị Hệ thống', group: 'Hệ thống' },
        ];
        permissions.forEach(p => {
            const ref = doc(db, 'permissions', p.id);
            batch.set(ref, p);
        });

        await batch.commit();
        console.log('Seeded Firestore with initial data');
    },

    // Specific entity wrappers (to maintain compatibility with dbService interface)
    async getAllTransactions() { return this.getAll('transactions'); },
    async getTransaction(id) { return this.getById('transactions', id); },
    async addTransaction(transaction) { return this.add('transactions', transaction); },
    async updateTransaction(transaction) { return this.update('transactions', transaction.id, transaction); },
    async deleteTransaction(id) { return this.delete('transactions', id); },

    async getAllCategories() { return this.getAll('categories'); },
    async addCategory(category) { return this.add('categories', category); },
    async updateCategory(category) { return this.update('categories', category.id, category); },
    async deleteCategory(id) { return this.delete('categories', id); },

    async getAllUnits() { return this.getAll('units'); },
    async addUnit(unit) { return this.add('units', unit); },
    async updateUnit(unit) { return this.update('units', unit.id, unit); },
    async deleteUnit(id) { return this.delete('units', id); },

    async getAllPartners() { return this.getAll('partners'); },
    async addPartner(partner) { return this.add('partners', partner); },
    async updatePartner(partner) { return this.update('partners', partner.id, partner); },
    async deletePartner(id) { return this.delete('partners', id); },

    async getAllRoles() { return this.getAll('roles'); },
    async addRole(role) { return this.add('roles', role); },
    async updateRole(role) { return this.update('roles', role.id, role); },
    async deleteRole(id) { return this.delete('roles', id); },

    async getAllPermissions() { return this.getAll('permissions'); },
    async getPermissionsByRole(roleId) {
        const q = query(collection(db, 'role_permissions'), where('roleId', '==', roleId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async updateRolePermissions(roleId, permissionIds) {
        // 1. Delete existing
        const q = query(collection(db, 'role_permissions'), where('roleId', '==', roleId));
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // 2. Add new
        permissionIds.forEach(permId => {
            const ref = doc(collection(db, 'role_permissions'));
            batch.set(ref, {
                roleId: roleId,
                permissionId: permId
            });
        });

        await batch.commit();
    },

    async getAllUsers() { return this.getAll('users'); },
    async addUser(user) { return this.add('users', user); },
    async updateUser(user) {
        const id = user.id || user.uid;
        return this.update('users', id, user);
    },
    async deleteUser(id) { return this.delete('users', id); }
};

export default firebaseService;
