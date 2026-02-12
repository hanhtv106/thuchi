-- Script tạo các quyền (permissions) chi tiết cho hệ thống
-- Chạy script này trong Supabase SQL Editor

-- XÓA CÁC QUYỀN CŨ (uncomment để chạy)
DELETE FROM role_permissions;
DELETE FROM permissions;

-- 1. QUYỀN THU CHI (TRANSACTION)
INSERT INTO permissions (id, code, name) VALUES
('TRANSACTION_VIEW', 'TRANSACTION_VIEW', 'Xem thu chi'),
('TRANSACTION_ADD', 'TRANSACTION_ADD', 'Thêm thu chi'),
('TRANSACTION_EDIT', 'TRANSACTION_EDIT', 'Sửa thu chi'),
('TRANSACTION_DELETE', 'TRANSACTION_DELETE', 'Xóa thu chi');

-- 2. QUYỀN TẤT TOÁN (SETTLEMENT)
INSERT INTO permissions (id, code, name) VALUES
('SETTLEMENT_VIEW', 'SETTLEMENT_VIEW', 'Xem tất toán'),
('SETTLEMENT_ADD', 'SETTLEMENT_ADD', 'Thêm tất toán'),
('SETTLEMENT_EDIT', 'SETTLEMENT_EDIT', 'Sửa tất toán'),
('SETTLEMENT_DELETE', 'SETTLEMENT_DELETE', 'Xóa tất toán');

-- 3. QUYỀN BÁO CÁO (REPORT)
INSERT INTO permissions (id, code, name) VALUES
('REPORT_VIEW', 'REPORT_VIEW', 'Xem báo cáo'),
('REPORT_ADD', 'REPORT_ADD', 'Tạo báo cáo'),
('REPORT_EDIT', 'REPORT_EDIT', 'Sửa báo cáo'),
('REPORT_DELETE', 'REPORT_DELETE', 'Xóa báo cáo');

-- 4. QUYỀN QUẢN LÝ DỮ LIỆU (MASTER DATA)
INSERT INTO permissions (id, code, name) VALUES
('MASTER_VIEW', 'MASTER_VIEW', 'Xem dữ liệu'),
('MASTER_ADD', 'MASTER_ADD', 'Thêm dữ liệu'),
('MASTER_EDIT', 'MASTER_EDIT', 'Sửa dữ liệu'),
('MASTER_DELETE', 'MASTER_DELETE', 'Xóa dữ liệu');

-- 5. QUYỀN PHÂN QUYỀN (RBAC - Role Based Access Control)
INSERT INTO permissions (id, code, name) VALUES
('RBAC_VIEW', 'RBAC_VIEW', 'Xem phân quyền'),
('RBAC_ADD', 'RBAC_ADD', 'Thêm phân quyền'),
('RBAC_EDIT', 'RBAC_EDIT', 'Sửa phân quyền'),
('RBAC_DELETE', 'RBAC_DELETE', 'Xóa phân quyền');

-- ==========================================
-- GỢI Ý PHÂN QUYỀN CHO CÁC VAI TRÒ
-- ==========================================

-- VÍ DỤ: Gán quyền cho role 'admin' (tất cả quyền)
-- Giả sử admin role ID là 'admin'
/*
INSERT INTO role_permissions (roleId, permissionId)
SELECT 'admin', code FROM permissions;
*/

-- VÍ DỤ: Gán quyền cho role 'accountant' (kế toán)
-- Giả sử accountant role ID là 'accountant'
/*
INSERT INTO role_permissions (roleId, permissionId)
SELECT 'accountant', code FROM permissions
WHERE code IN (
    'TRANSACTION_VIEW', 'TRANSACTION_ADD', 'TRANSACTION_EDIT',
    'SETTLEMENT_VIEW', 'SETTLEMENT_ADD', 'SETTLEMENT_EDIT',
    'REPORT_VIEW', 'REPORT_ADD',
    'MASTER_VIEW', 'MASTER_ADD', 'MASTER_EDIT'
);
*/

-- VÍ DỤ: Gán quyền cho role 'employee' (nhân viên)
-- Giả sử employee role ID là 'employee'
/*
INSERT INTO role_permissions (roleId, permissionId)
SELECT 'employee', code FROM permissions
WHERE code IN (
    'TRANSACTION_VIEW', 'TRANSACTION_ADD',
    'SETTLEMENT_VIEW',
    'REPORT_VIEW'
);
*/
