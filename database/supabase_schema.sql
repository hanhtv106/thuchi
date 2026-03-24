-- ============================================================
-- SQL Script: Migration Clean Start (PostgreSQL - Supabase)
-- Application: Thu - Chi
-- ============================================================

-- Xóa dữ liệu cũ để tránh xung đột cột
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.partners CASCADE;
DROP TABLE IF EXISTS public.units CASCADE;

-- 1. Table: Roles
CREATE TABLE public.roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

-- 2. Table: Permissions
CREATE TABLE public.permissions (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    "group" TEXT
);

-- 3. Table: Role_Permissions
CREATE TABLE public.role_permissions (
    role_id TEXT REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id TEXT REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Table: Profiles (Extends Supabase Auth)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    role TEXT REFERENCES public.roles(id) DEFAULT 'employee',
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 5. Table: Units
CREATE TABLE public.units (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Table: Categories
CREATE TABLE public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('income', 'expense')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Table: Partners
CREATE TABLE public.partners (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT, -- 'customer', 'supplier', 'both'
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Table: Transactions
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    type TEXT CHECK (type IN ('income', 'expense')),
    amount DECIMAL(18, 2) DEFAULT 0,
    content TEXT,
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    unit_id TEXT REFERENCES public.units(id) ON DELETE SET NULL,
    partner_id TEXT REFERENCES public.partners(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    is_settled BOOLEAN DEFAULT FALSE,
    settled_at TIMESTAMP WITH TIME ZONE,
    quantity DECIMAL(18, 2) DEFAULT 1,
    unit_price DECIMAL(18, 2) DEFAULT 0,
    subtotal DECIMAL(18, 2) DEFAULT 0,           -- Số lượng × đơn giá, trước VAT và giảm giá
    vat_percentage DECIMAL(5, 2) DEFAULT 0,       -- % thuế VAT
    vat_amount DECIMAL(18, 2) DEFAULT 0,          -- Tiền thuế VAT
    discount_percentage DECIMAL(5, 2) DEFAULT 0,  -- % giảm giá
    discount_amount DECIMAL(18, 2) DEFAULT 0,      -- Số tiền giảm giá
    voucher_code TEXT,                             -- Số hoá đơn
    receiver TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on Transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can see transactions." ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert transactions." ON public.transactions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update transactions." ON public.transactions FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================
-- PRE-SEEDING DATA
-- ============================================================

-- Roles
INSERT INTO public.roles (id, name, description) VALUES
    ('admin', 'Quản trị viên', 'Quyền cao nhất hệ thống'),
    ('accountant', 'Kế toán', 'Quản lý thu chi và tất toán'),
    ('employee', 'Nhân viên', 'Nhập liệu cơ bản')
ON CONFLICT (id) DO NOTHING;

-- Permissions
INSERT INTO public.permissions (id, code, name, "group") VALUES
    ('tx_view', 'TRANSACTION_VIEW', 'Xem Thu Chi', 'Giao dịch'),
    ('tx_create', 'TRANSACTION_CREATE', 'Thêm Thu Chi', 'Giao dịch'),
    ('tx_update', 'TRANSACTION_UPDATE', 'Sửa Thu Chi', 'Giao dịch'),
    ('tx_delete', 'TRANSACTION_DELETE', 'Xóa Thu Chi', 'Giao dịch'),
    ('tx_approve', 'TRANSACTION_APPROVE', 'Duyệt Thu Chi', 'Giao dịch'),
    ('settle_view', 'SETTLEMENT_VIEW', 'Xem Tất toán', 'Tất toán'),
    ('settle_manage', 'SETTLEMENT_MANAGE', 'Thực hiện Tất toán', 'Tất toán'),
    ('report_view', 'REPORT_VIEW', 'Xem Báo cáo', 'Báo cáo'),
    ('md_view', 'MASTER_DATA_VIEW', 'Xem Dữ liệu nguồn', 'Dữ liệu nguồn'),
    ('md_manage', 'MASTER_DATA_MANAGE', 'Quản lý Dữ liệu nguồn', 'Dữ liệu nguồn'),
    ('sys_manage', 'SYSTEM_MANAGE', 'Quản trị Hệ thống', 'Hệ thống')
ON CONFLICT (id) DO NOTHING;

-- Assign all permissions to Admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'admin', id FROM public.permissions
ON CONFLICT DO NOTHING;

-- ============================================================
-- TRIGGER: Auto-create profile on Auth signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'employee');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
