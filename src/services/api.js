import { supabase } from './supabaseClient';

const apiService = {
    // Auth
    async login(identifier, password) {
        let email = identifier;

        // Nếu không phải email (không có @), tìm email từ username trong bảng profiles
        if (!identifier.includes('@')) {
            const { data: profile, error: findError } = await supabase
                .from('profiles')
                .select('email')
                .eq('username', identifier)
                .single();

            if (findError || !profile) {
                throw new Error('Username không tồn tại');
            }
            email = profile.email;
        }

        // 1. Sign in with Supabase
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) throw authError;

        // 2. Fetch Profile & Role Permissions
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*, roles(name)')
            .eq('id', authData.user.id)
            .single();

        if (profileError) throw profileError;

        // 3. Fetch Permissions Codes
        const { data: perms, error: permsError } = await supabase
            .from('role_permissions')
            .select('permissions(code)')
            .eq('role_id', profile.role);

        if (permsError) throw permsError;

        // Map safe - handle cases where permissions object might be null or array
        const permissionCodes = perms
            .map(p => p.permissions?.code || (Array.isArray(p.permissions) ? p.permissions[0]?.code : null))
            .filter(Boolean);


        return {
            token: authData.session.access_token,
            user: {
                uid: authData.user.id,
                email: authData.user.email,
                username: profile.username,
                fullName: profile.full_name,
                role: profile.role,
                permissions: permissionCodes
            }
        };
    },


    async logout() {
        await supabase.auth.signOut();
    },

    // Transactions
    async getAllTransactions() {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('is_deleted', false)
            .order('date', { ascending: false });
        if (error) throw error;
        // Map snake_case to camelCase for frontend compatibility if needed, 
        // but here we might just map the fields manually or keep them if they match.
        // The SQL Server version used camelCase for some fields but the PostgeSQL uses snake_case.
        // Let's map them to keep frontend working.
        return data.map(item => ({
            ...item,
            categoryId: item.category_id,
            unitId: item.unit_id,
            partnerId: item.partner_id,
            unitPrice: item.unit_price,
            isSettled: item.is_settled,
            settledAt: item.settled_at,
            createdBy: item.created_by
        }));
    },

    async addTransaction(tx) {
        const { error } = await supabase.from('transactions').insert({
            date: tx.date,
            type: tx.type,
            amount: tx.amount,
            content: tx.content,
            category_id: tx.categoryId,
            unit_id: tx.unitId,
            partner_id: tx.partnerId,
            quantity: tx.quantity,
            unit_price: tx.unitPrice,
            receiver: tx.receiver,
            attachments: tx.attachments,
            created_by: tx.createdBy
        });
        if (error) throw error;
        return { message: 'Created' };
    },

    async updateTransaction(id, tx) {
        const { error } = await supabase.from('transactions').update({
            date: tx.date,
            type: tx.type,
            amount: tx.amount,
            content: tx.content,
            category_id: tx.categoryId,
            unit_id: tx.unitId,
            partner_id: tx.partnerId,
            status: tx.status,
            quantity: tx.quantity,
            unit_price: tx.unitPrice,
            receiver: tx.receiver,
            attachments: tx.attachments,
            is_settled: tx.isSettled,
            settled_at: tx.settledAt
        }).eq('id', id);
        if (error) throw error;
        return { message: 'Updated' };
    },

    async deleteTransaction(id) {
        const { error } = await supabase
            .from('transactions')
            .update({ is_deleted: true, deleted_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
        return { message: 'Deleted' };
    },

    async approveTransaction(id) {
        const { error } = await supabase
            .from('transactions')
            .update({ status: 'approved', settled_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
        return { message: 'Approved' };
    },

    async rejectTransaction(id) {
        const { error } = await supabase
            .from('transactions')
            .update({ status: 'rejected' })
            .eq('id', id);
        if (error) throw error;
        return { message: 'Rejected' };
    },

    async revokeTransaction(id) {
        const { error } = await supabase
            .from('transactions')
            .update({ status: 'pending', settled_at: null })
            .eq('id', id);
        if (error) throw error;
        return { message: 'Revoked' };
    },

    // Categories
    async getAllCategories() {
        const { data, error } = await supabase.from('categories').select('*');
        if (error) throw error;
        return data;
    },
    async addCategory(cat) {
        const { error } = await supabase.from('categories').insert(cat);
        if (error) throw error;
        return { message: 'Created' };
    },
    async updateCategory(id, cat) {
        const { error } = await supabase.from('categories').update(cat).eq('id', id);
        if (error) throw error;
        return { message: 'Updated' };
    },
    async deleteCategory(id) {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
        return { message: 'Deleted' };
    },

    // Units
    async getAllUnits() {
        const { data, error } = await supabase.from('units').select('*');
        if (error) throw error;
        return data;
    },
    async addUnit(unit) {
        const { error } = await supabase.from('units').insert(unit);
        if (error) throw error;
        return { message: 'Created' };
    },
    async updateUnit(id, unit) {
        const { error } = await supabase.from('units').update(unit).eq('id', id);
        if (error) throw error;
        return { message: 'Updated' };
    },
    async deleteUnit(id) {
        const { error } = await supabase.from('units').delete().eq('id', id);
        if (error) throw error;
        return { message: 'Deleted' };
    },

    // Partners
    async getAllPartners() {
        const { data, error } = await supabase.from('partners').select('*');
        if (error) throw error;
        return data;
    },
    async addPartner(ptr) {
        const { error } = await supabase.from('partners').insert(ptr);
        if (error) throw error;
        return { message: 'Created' };
    },
    async updatePartner(id, ptr) {
        const { error } = await supabase.from('partners').update(ptr).eq('id', id);
        if (error) throw error;
        return { message: 'Updated' };
    },
    async deletePartner(id) {
        const { error } = await supabase.from('partners').delete().eq('id', id);
        if (error) throw error;
        return { message: 'Deleted' };
    },

    // Users (Profiles in Supabase)
    async getAllUsers() {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        return data.map(u => ({
            id: u.id,
            email: u.email,
            username: u.username,
            fullName: u.full_name,
            role: u.role
        }));
    },

    async addUser(userData) {
        // Lưu ý: Để tạo user trong Auth cần Edge Function hoặc Service Role Key.
        // Ở đây chúng ta thử dùng signUp, nhưng nó có thể yêu cầu xác thực email.
        const { data, error: authError } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: {
                    full_name: userData.fullName,
                    username: userData.username,
                }
            }
        });

        if (authError) throw authError;

        // Cập nhật profile nếu trigger chưa làm hoặc cần update role ngay
        if (data.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: userData.fullName,
                    role: userData.role,
                    username: userData.username
                })
                .eq('id', data.user.id);
            if (profileError) console.error('Error updating profile:', profileError);
        }

        return data;
    },

    async updateUser(id, userData) {
        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: userData.fullName,
                role: userData.role,
                username: userData.username
            })
            .eq('id', id);
        if (error) throw error;
        return { message: 'Updated' };
    },

    async deleteUser(id) {
        // Xoá profile (Xoá Auth cần Admin API)
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return { message: 'Deleted' };
    },

    // Note: AddUser/DeleteUser for Supabase Auth requires Admin API or custom Edge Function.
    // For now, we'll assume users sign up themselves or admin uses Supabase Dashboard.

    // Roles & Permissions
    async getAllRoles() {
        const { data, error } = await supabase.from('roles').select('*');
        if (error) throw error;
        return data;
    },

    async addRole(roleData) {
        const { error } = await supabase.from('roles').insert(roleData);
        if (error) throw error;
        return { message: 'Created' };
    },

    async updateRole(id, roleData) {
        const { error } = await supabase.from('roles').update(roleData).eq('id', id);
        if (error) throw error;
        return { message: 'Updated' };
    },

    async deleteRole(id) {
        const { error } = await supabase.from('roles').delete().eq('id', id);
        if (error) throw error;
        return { message: 'Deleted' };
    },

    async getAllPermissions() {
        const { data, error } = await supabase.from('permissions').select('*');
        if (error) throw error;
        return data;
    },
    async getPermissionsByRole(roleId) {
        const { data, error } = await supabase
            .from('role_permissions')
            .select('permission_id')
            .eq('role_id', roleId);
        if (error) throw error;
        return data.map(rp => rp.permission_id);
    },
    async updateRolePermissions(roleId, pIds) {
        // Delete existing
        const { error: delError } = await supabase.from('role_permissions').delete().eq('role_id', roleId);
        if (delError) throw delError;

        // Insert new only if there are items
        if (pIds && pIds.length > 0) {
            const rows = pIds.map(pid => ({ role_id: roleId, permission_id: pid }));
            const { error } = await supabase.from('role_permissions').insert(rows);
            if (error) throw error;
        }
        return { message: 'Updated' };
    }

};

export default apiService;
