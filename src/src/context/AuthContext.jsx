import { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = sessionStorage.getItem('thuchi_user');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                sessionStorage.removeItem('thuchi_user');
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
            sessionStorage.setItem('thuchi_user', JSON.stringify(sessionUser));
            return sessionUser;
        } catch (error) {
            let message = error.message;

            // Dịch lỗi Supabase sang Tiếng Việt
            if (message === 'Invalid login credentials') {
                message = 'Email/Tên đăng nhập hoặc mật khẩu không chính xác';
            } else if (message === 'Email not confirmed') {
                message = 'Email chưa được xác thực. Vui lòng kiểm tra hộp thư';
            } else if (message === 'Username không tồn tại') {
                message = 'Tên đăng nhập không tồn tại trên hệ thống';
            } else if (message.includes('rate limit')) {
                message = 'Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau vài phút';
            } else {
                message = 'Lỗi hệ thống: ' + message;
            }

            throw new Error(message);
        }
    };


    const logout = () => {
        setUser(null);
        sessionStorage.removeItem('thuchi_user');
    };

    useEffect(() => {
        let timeout;

        const resetTimer = () => {
            clearTimeout(timeout);
            if (user) {
                // 15 phút = 15 * 60 * 1000 = 900000 milliseconds
                timeout = setTimeout(() => {
                    logout();
                    alert("Phiên đăng nhập đã hết hạn do không hoạt động trong 15 phút. Vui lòng đăng nhập lại.");
                }, 900000);
            }
        };

        const events = ['mousemove', 'keydown', 'scroll', 'click'];

        if (user) {
            events.forEach(e => window.addEventListener(e, resetTimer));
            resetTimer();
        }

        return () => {
            clearTimeout(timeout);
            events.forEach(e => window.removeEventListener(e, resetTimer));
        };
    }, [user]);

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
