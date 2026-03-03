import { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('thuchi_user');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                localStorage.removeItem('thuchi_user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            // Gọi API đăng nhập tới Backend SQL Server
            const data = await apiService.login(email, password);

            // data bao gồm { token, user: { uid, email, fullName, role, permissions } }
            const sessionUser = {
                ...data.user,
                token: data.token
            };

            setUser(sessionUser);
            localStorage.setItem('thuchi_user', JSON.stringify(sessionUser));
            return sessionUser;
        } catch (error) {
            const message = error.response?.data?.message || 'Lỗi đăng nhập hệ thống';
            throw new Error(message);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('thuchi_user');
    };

    const hasPermission = (permissionCode) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        return user.permissions?.includes(permissionCode);
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
