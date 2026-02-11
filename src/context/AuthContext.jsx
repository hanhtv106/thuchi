import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Mock Users Data
const MOCK_USERS = [
    { id: '1', username: 'admin', password: '123', role: 'admin', fullName: 'Administrator' },
    { id: '2', username: 'manager', password: '123', role: 'accountant', fullName: 'Trưởng phòng Kế toán' },
    { id: '3', username: 'staff', password: '123', role: 'employee', fullName: 'Nhân viên Kinh doanh' },
];

import { dbService } from '../services/db';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    useEffect(() => {
        const seedUsers = async () => {
            try {
                const users = await dbService.getAllUsers();
                if (users.length === 0) {
                    await Promise.all(MOCK_USERS.map(u => dbService.addUser(u)));
                    console.log('Seeded default users to DB');
                }
            } catch (error) {
                console.error('Error seeding users:', error);
            }
        };
        seedUsers();
    }, []);

    const login = async (username, password) => {
        try {
            const users = await dbService.getAllUsers();
            const foundUser = users.find(u => u.username === username && u.password === password);

            if (foundUser) {
                const { password, ...userData } = foundUser;
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
                return userData;
            } else {
                throw new Error('Sai tên đăng nhập hoặc mật khẩu');
            }
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};
