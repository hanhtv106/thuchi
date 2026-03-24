import { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNotification } from '../context/NotificationContext';
import { Lock, Save, AlertCircle } from 'lucide-react';
import './ProfilePage.css';

const ProfilePage = () => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { showNotification } = useNotification();

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            showNotification('Mật khẩu xác nhận không khớp', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showNotification('Mật khẩu mới phải có ít nhất 6 ký tự', 'error');
            return;
        }

        setIsLoading(true);
        try {
            // Since we are using Supabase Auth, they have a dedicated method
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            showNotification('Đổi mật khẩu thành công', 'success');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            showNotification('Lỗi: ' + err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="profile-page">
            <div className="profile-card">
                <div className="card-header">
                    <Lock size={24} className="text-blue" />
                    <h2>Đổi mật khẩu</h2>
                </div>

                <div className="alert-info">
                    <AlertCircle size={20} />
                    <span>Sau khi đổi mật khẩu, bạn cần dùng mật khẩu mới cho lần đăng nhập sau.</span>
                </div>

                <form onSubmit={handleChangePassword} className="profile-form">
                    <div className="form-group">
                        <label>Mật khẩu mới</label>
                        <input
                            type="password"
                            className="form-input"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Nhập mật khẩu mới..."
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Xác nhận mật khẩu mới</label>
                        <input
                            type="password"
                            className="form-input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Nhập lại mật khẩu mới..."
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={isLoading}>
                        <Save size={18} />
                        {isLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage;
