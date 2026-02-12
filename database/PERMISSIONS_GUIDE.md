# Hướng dẫn cấu hình Permissions cho hệ thống Thu Chi

## Tổng quan
Hệ thống có **20 quyền (permissions)** được chia thành **5 module chính**:

### 1. Thu Chi (TRANSACTION) - 4 quyền
- `TRANSACTION_VIEW` - Xem thu chi
- `TRANSACTION_ADD` - Thêm thu chi
- `TRANSACTION_EDIT` - Sửa thu chi
- `TRANSACTION_DELETE` - Xóa thu chi

### 2. Tất toán (SETTLEMENT) - 4 quyền
- `SETTLEMENT_VIEW` - Xem tất toán
- `SETTLEMENT_ADD` - Thêm tất toán
- `SETTLEMENT_EDIT` - Sửa tất toán
- `SETTLEMENT_DELETE` - Xóa tất toán

### 3. Báo cáo (REPORT) - 4 quyền
- `REPORT_VIEW` - Xem báo cáo
- `REPORT_ADD` - Tạo báo cáo
- `REPORT_EDIT` - Sửa báo cáo
- `REPORT_DELETE` - Xóa báo cáo

### 4. Quản lý dữ liệu (MASTER DATA) - 4 quyền
- `MASTER_VIEW` - Xem dữ liệu
- `MASTER_ADD` - Thêm dữ liệu
- `MASTER_EDIT` - Sửa dữ liệu
- `MASTER_DELETE` - Xóa dữ liệu

### 5. Phân quyền (RBAC) - 4 quyền
- `RBAC_VIEW` - Xem phân quyền
- `RBAC_ADD` - Thêm phân quyền
- `RBAC_EDIT` - Sửa phân quyền
- `RBAC_DELETE` - Xóa phân quyền

---

## Cách cài đặt

### Bước 1: Truy cập Supabase
1. Đăng nhập vào [Supabase Dashboard](https://supabase.com/dashboard)
2. Chọn project của bạn
3. Vào **SQL Editor** (biểu tượng </> ở menu bên trái)

### Bước 2: Chạy Script
1. Nhấn **New Query**
2. Copy toàn bộ nội dung file `permissions_seed.sql`
3. Paste vào SQL Editor
4. Nhấn **Run** (hoặc Ctrl+Enter)

### Bước 3: Kiểm tra
Vào tab **Table Editor** → chọn bảng `permissions` để xem 20 quyền đã được tạo.

---

## Gợi ý phân quyền theo vai trò

### Admin (Quản trị viên)
**Tất cả quyền** - 20/20 permissions

```sql
INSERT INTO role_permissions (roleId, permissionId)
SELECT 'admin', code FROM permissions;
```

### Accountant (Kế toán)
**14 quyền** - Không có quyền xóa và phân quyền

- ✅ Thu Chi: Xem, Thêm, Sửa
- ✅ Tất toán: Xem, Thêm, Sửa
- ✅ Báo cáo: Xem, Thêm
- ✅ Quản lý dữ liệu: Xem, Thêm, Sửa
- ❌ Không có quyền xóa
- ❌ Không có quyền phân quyền

```sql
INSERT INTO role_permissions (roleId, permissionId)
SELECT 'accountant', code FROM permissions
WHERE code IN (
    'TRANSACTION_VIEW', 'TRANSACTION_ADD', 'TRANSACTION_EDIT',
    'SETTLEMENT_VIEW', 'SETTLEMENT_ADD', 'SETTLEMENT_EDIT',
    'REPORT_VIEW', 'REPORT_ADD',
    'MASTER_VIEW', 'MASTER_ADD', 'MASTER_EDIT'
);
```

### Employee (Nhân viên)
**4 quyền** - Chỉ xem và thêm thu chi

- ✅ Thu Chi: Xem, Thêm
- ✅ Tất toán: Xem
- ✅ Báo cáo: Xem
- ❌ Không được sửa/xóa
- ❌ Không quản lý dữ liệu
- ❌ Không phân quyền

```sql
INSERT INTO role_permissions (roleId, permissionId)
SELECT 'employee', code FROM permissions
WHERE code IN (
    'TRANSACTION_VIEW', 'TRANSACTION_ADD',
    'SETTLEMENT_VIEW',
    'REPORT_VIEW'
);
```

---

## Lưu ý quan trọng

1. **Role ID phải khớp**: Các ví dụ trên giả định bạn có role với id là `'admin'`, `'accountant'`, `'employee'`. Hãy thay đổi cho phù hợp với role ID thực tế trong database của bạn.

2. **Chạy từng lệnh**: Nếu muốn gán quyền cho role, hãy bỏ comment (`/* */`) và chạy từng đoạn SQL riêng biệt.

3. **Kiểm tra trước khi xóa**: Đoạn `DELETE FROM permissions;` ở đầu file đã được comment. Chỉ bỏ comment nếu bạn chắc chắn muốn xóa hết quyền cũ.

---

## Kiểm tra kết quả

Sau khi chạy script, vào trang **Quản trị → RBAC → Quản lý vai trò** trong ứng dụng để:
- Chọn một role
- Nhấn nút **Sửa**
- Xem danh sách 20 permissions
- Tick chọn các quyền phù hợp cho role đó
