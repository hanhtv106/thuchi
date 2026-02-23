-- ============================================================
-- Script khởi tạo Permissions và Role Permissions cho hệ thống
-- ============================================================
-- Chạy script này trong Supabase SQL Editor sau khi đã tạo bảng.
-- Script ĐỒNG BỘ với seedData() trong supabaseService.js

-- Bước 1: Xóa dữ liệu phân quyền cũ
DELETE FROM role_permissions;
DELETE FROM permissions;

-- ============================================================
-- Bước 2: Tạo Roles mẫu (nếu chưa có)
-- ============================================================
INSERT INTO roles (id, name, description) VALUES
    ('admin',      'Admin',     'Quản trị viên hệ thống - toàn quyền'),
    ('accountant', 'Kế toán',   'Quản lý thu chi, tất toán và báo cáo'),
    ('employee',   'Nhân viên', 'Nhập liệu thu chi cơ bản')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- ============================================================
-- Bước 3: Tạo Permissions
-- ============================================================

-- 🗂️ Nhóm: Giao dịch Thu Chi
INSERT INTO permissions (id, code, name, "group") VALUES
    ('tx_view',    'TRANSACTION_VIEW',    'Xem Thu Chi',   'Giao dịch'),
    ('tx_create',  'TRANSACTION_CREATE',  'Thêm Thu Chi',  'Giao dịch'),
    ('tx_update',  'TRANSACTION_UPDATE',  'Sửa Thu Chi',   'Giao dịch'),
    ('tx_delete',  'TRANSACTION_DELETE',  'Xóa Thu Chi',   'Giao dịch'),
    ('tx_approve', 'TRANSACTION_APPROVE', 'Duyệt Thu Chi', 'Giao dịch');

-- 💰 Nhóm: Tất toán
INSERT INTO permissions (id, code, name, "group") VALUES
    ('settle_view',   'SETTLEMENT_VIEW',   'Xem Tất toán',     'Tất toán'),
    ('settle_manage', 'SETTLEMENT_MANAGE', 'Quản lý Tất toán', 'Tất toán');

-- 📈 Nhóm: Báo cáo
INSERT INTO permissions (id, code, name, "group") VALUES
    ('report_view',   'REPORT_VIEW',   'Xem Báo cáo',  'Báo cáo'),
    ('report_export', 'REPORT_EXPORT', 'Xuất Báo cáo', 'Báo cáo');

-- 📁 Nhóm: Dữ liệu nguồn (Master Data)
INSERT INTO permissions (id, code, name, "group") VALUES
    ('md_view',   'MASTER_DATA_VIEW',   'Xem Dữ liệu nguồn',     'Dữ liệu nguồn'),
    ('md_manage', 'MASTER_DATA_MANAGE', 'Quản lý Dữ liệu nguồn', 'Dữ liệu nguồn');

-- ⚙️ Nhóm: Hệ thống
INSERT INTO permissions (id, code, name, "group") VALUES
    ('sys_manage', 'SYSTEM_MANAGE', 'Quản trị Hệ thống', 'Hệ thống');

-- ============================================================
-- Bước 4: Gán quyền cho từng Role
-- ============================================================

-- 👑 ADMIN: Toàn quyền (tất cả permissions)
INSERT INTO role_permissions (roleId, permissionId)
SELECT 'admin', id FROM permissions;

-- 📒 KẾ TOÁN (accountant): Xem/Thêm/Sửa/Duyệt thu chi, quản lý tất toán, xem+xuất báo cáo, xem dữ liệu nguồn
INSERT INTO role_permissions (roleId, permissionId) VALUES
    ('accountant', 'tx_view'),
    ('accountant', 'tx_create'),
    ('accountant', 'tx_update'),
    ('accountant', 'tx_approve'),
    ('accountant', 'settle_view'),
    ('accountant', 'settle_manage'),
    ('accountant', 'report_view'),
    ('accountant', 'report_export'),
    ('accountant', 'md_view');

-- 👤 NHÂN VIÊN (employee): Chỉ nhập thu chi và xem
INSERT INTO role_permissions (roleId, permissionId) VALUES
    ('employee', 'tx_view'),
    ('employee', 'tx_create'),
    ('employee', 'settle_view'),
    ('employee', 'report_view');

-- ============================================================
-- Kiểm tra kết quả
-- ============================================================
-- SELECT r.name as role, p.name as permission, p."group"
-- FROM role_permissions rp
-- JOIN roles r ON r.id = rp."roleId"
-- JOIN permissions p ON p.id = rp."permissionId"
-- ORDER BY r.name, p."group", p.name;
