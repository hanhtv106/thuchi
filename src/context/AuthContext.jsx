import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active sessions and subscribe to auth changes
        const setupAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                await fetchUserProfile(session.user);
            } else {
                setUser(null);
                setLoading(false);
            }

            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
                if (session?.user) {
                    await fetchUserProfile(session.user);
                } else {
                    setUser(null);
                }
                setLoading(false);
            });

            return () => subscription.unsubscribe();
        };

        setupAuth();
    }, []);

    const fetchUserProfile = async (supabaseUser) => {
        try {
            // 1. Lấy thông tin cơ bản người dùng
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', supabaseUser.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') throw profileError;

            const userRole = profile?.role || 'employee';

            // 2. Lấy danh sách mã quyền từ bảng permissions thông qua role_permissions
            let userPermissions = [];
            if (userRole === 'admin') {
                // Admin mặc định có tất cả quyền (hoặc kiểm tra từ database nếu muốn)
                const { data: allPerms } = await supabase.from('permissions').select('code');
                userPermissions = allPerms?.map(p => p.code) || [];
            } else {
                const { data: permsData, error: permsError } = await supabase
                    .from('role_permissions')
                    .select('permissions(code)')
                    .eq('roleId', userRole);

                if (!permsError && permsData) {
                    userPermissions = permsData.map(p => p.permissions?.code).filter(Boolean);
                }
            }

            setUser({
                uid: supabaseUser.id,
                email: supabaseUser.email,
                role: userRole,
                fullName: profile?.fullName || supabaseUser.user_metadata?.full_name || 'Người dùng mới',
                permissions: userPermissions
            });
        } catch (error) {
            console.error('Lỗi khi tải thông tin người dùng:', error);
            setUser({
                uid: supabaseUser.id,
                email: supabaseUser.email,
                role: 'employee',
                permissions: []
            });
        } finally {
            setLoading(false);
        }
    };

    const hasPermission = (permissionCode) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        return user.permissions?.includes(permissionCode);
    };

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            let message = 'Lỗi đăng nhập';
            if (error.status === 400) message = 'Sai email hoặc mật khẩu';
            throw new Error(message);
        }
        return data.user;
    };

    const logout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            hasPermission,
            isAuthenticated: !!user,
            loading
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
