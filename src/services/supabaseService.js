import { supabase, supabaseAdmin } from './supabase';

const supabaseService = {
    // Cac phuong thuc chung
    async getAll(tableName) {
        // Thay doi sang supabaseAdmin de doc du lieu xuyen qua RLS
        const { data, error } = await supabaseAdmin.from(tableName).select('*');
        if (error) throw error;
        return data;
    },

    async getById(tableName, id) {
        const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    },

    async add(tableName, data) {
        const { data: inserted, error } = await supabase.from(tableName).insert(data).select().single();
        if (error) throw error;
        return inserted;
    },

    async update(tableName, id, data) {
        const { data: updated, error } = await supabase.from(tableName).update(data).eq('id', id).select().single();
        if (error) throw error;
        return updated;
    },

    async delete(tableName, id) {
        const { error } = await supabase.from(tableName).delete().eq('id', id);
        if (error) throw error;
    },

    // Transaction methods
    async getAllTransactions() { return this.getAll('transactions'); },
    async getTransaction(id) { return this.getById('transactions', id); },
    async addTransaction(transaction) { return this.add('transactions', transaction); },
    async updateTransaction(transaction) { return this.update('transactions', transaction.id, transaction); },
    async deleteTransaction(id) { return this.delete('transactions', id); },

    // Storage methods
    async uploadFile(file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload to 'attachments' bucket
        const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data } = supabase.storage
            .from('attachments')
            .getPublicUrl(filePath);

        return data.publicUrl;
    },

    // Category methods
    async getAllCategories() { return this.getAll('categories'); },
    async addCategory(category) { return this.add('categories', category); },
    async updateCategory(category) { return this.update('categories', category.id, category); },
    async deleteCategory(id) { return this.delete('categories', id); },

    // Unit methods
    async getAllUnits() { return this.getAll('units'); },
    async addUnit(unit) { return this.add('units', unit); },
    async updateUnit(unit) { return this.update('units', unit.id, unit); },
    async deleteUnit(id) { return this.delete('units', id); },

    // Partner methods
    async getAllPartners() { return this.getAll('partners'); },
    async addPartner(partner) { return this.add('partners', partner); },
    async updatePartner(partner) { return this.update('partners', partner.id, partner); },
    async deletePartner(id) { return this.delete('partners', id); },

    // Role methods
    async getAllRoles() { return this.getAll('roles'); },
    async addRole(role) { return this.add('roles', role); },
    async updateRole(role) { return this.update('roles', role.id, role); },
    async deleteRole(id) { return this.delete('roles', id); },

    // Permission methods
    async getAllPermissions() { return this.getAll('permissions'); },
    async getPermissionsByRole(roleId) {
        const { data, error } = await supabase.from('role_permissions').select('*').eq('roleId', roleId);
        if (error) throw error;
        return data;
    },

    async updateRolePermissions(roleId, permissionIds) {
        const { error: delError } = await supabase.from('role_permissions').delete().eq('roleId', roleId);
        if (delError) throw delError;

        if (permissionIds.length > 0) {
            const inserts = permissionIds.map(permId => ({ roleId, permissionId: permId }));
            const { error: insError } = await supabase.from('role_permissions').insert(inserts);
            if (insError) throw insError;
        }
    },

    // User management methods
    async getAllUsers() { return this.getAll('users'); },

    async addUser(user) {
        // 1. Tao tai khoan Auth (dung Admin Client)
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true
        });

        if (authError) throw authError;

        // 2. Luu ho so vao bang users (Chi lay cac truong hop le)
        const profileData = {
            id: authUser.user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role
        };

        const { data, error } = await supabase
            .from('users')
            .insert(profileData)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateUser(user) {
        const id = user.id || user.uid;

        // Cap nhat mat khau neu co
        if (user.password) {
            await supabaseAdmin.auth.admin.updateUserById(id, { password: user.password });
        }

        // Chi lay cac truong hop le de cap nhat Profile
        const profileData = {
            email: user.email,
            fullName: user.fullName,
            role: user.role
        };

        const { data, error } = await supabase
            .from('users')
            .update(profileData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteUser(id) {
        // 1. Xoa ben Auth
        await supabaseAdmin.auth.admin.deleteUser(id);
        // 2. Xoa ho so
        return this.delete('users', id);
    },

    // Khoi tao du lieu mau
    async seedData() {
        try {
            // Su dung supabaseAdmin de bypass RLS va quan ly toan quyen
            console.log('Bat dau khoi tao du lieu...');

            // 1. Ghi Categories (Hang muc)
            const categories = [
                { id: 'cat_1', name: 'Tiền lương', type: 'income' },
                { id: 'cat_2', name: 'Bán hàng', type: 'income' },
                { id: 'cat_3', name: 'Thưởng', type: 'income' },
                { id: 'cat_4', name: 'Ăn uống', type: 'expense' },
                { id: 'cat_5', name: 'Đi lại', type: 'expense' },
                { id: 'cat_6', name: 'Mua sắm', type: 'expense' },
                { id: 'cat_7', name: 'Điện nước', type: 'expense' },
            ];
            const { error: catErr } = await supabaseAdmin.from('categories').upsert(categories, { onConflict: 'id' });
            if (catErr) throw new Error('Lỗi bảng Hạng mục (Categories): ' + catErr.message);

            // 2. Ghi Units (Don vi tinh)
            const units = [
                { id: 'unit_1', name: 'Cái' },
                { id: 'unit_2', name: 'Kg' },
                { id: 'unit_3', name: 'Hộp' },
                { id: 'unit_4', name: 'Bộ' },
            ];
            const { error: unitErr } = await supabaseAdmin.from('units').upsert(units, { onConflict: 'id' });
            if (unitErr) throw new Error('Lỗi bảng Đơn vị (Units): ' + unitErr.message);

            // 3. Ghi Roles (Vai tro)
            const roles = [
                { id: 'admin', name: 'Admin', description: 'Quản trị viên hệ thống' },
                { id: 'accountant', name: 'Kế toán', description: 'Quản lý thu chi' },
                { id: 'employee', name: 'Nhân viên', description: 'Nhân viên bình thường' }
            ];
            const { error: roleErr } = await supabaseAdmin.from('roles').upsert(roles, { onConflict: 'id' });
            if (roleErr) throw new Error('Lỗi bảng Vai trò (Roles): ' + roleErr.message);

            // 4. Ghi Permissions (Quyen han)
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
            const { error: permErr } = await supabaseAdmin.from('permissions').upsert(permissions, { onConflict: 'id' });
            if (permErr) throw new Error('Lỗi bảng Quyền hạn (Permissions): ' + permErr.message);

            // 5. Ghi Partners (Doi tac mau)
            const partners = [
                { id: 'part_1', name: 'Công ty ABC', type: 'both', phone: '0123456789' },
                { id: 'part_2', name: 'Cửa hàng Tiện Lợi', type: 'supplier', phone: '0987654321' },
                { id: 'part_3', name: 'Khách hàng Lẻ', type: 'customer' }
            ];
            const { error: partErr } = await supabaseAdmin.from('partners').upsert(partners, { onConflict: 'id' });
            if (partErr) throw new Error('Lỗi bảng Đối tác (Partners): ' + partErr.message);

            alert('Khởi tạo dữ liệu thành công! Hãy F5 lại trang.');
            return true;
        } catch (error) {
            console.error('Loi nghiem trong khi khoi tao:', error);
            alert(error.message); // Hien thi loi chi tiet cho nguoi dung
            throw error;
        }
    }
};

export default supabaseService;
