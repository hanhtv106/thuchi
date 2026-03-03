const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Tự động phục vụ giao diện Web từ thư mục dist
app.use(express.static(path.join(__dirname, '../dist')));

// Enhanced Logger
app.use((req, res, next) => {
    const now = new Date().toLocaleTimeString();
    console.log(`[${now}] RECV ${req.method} ${req.url}`); // Log ngay khi nhận
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${now}] DONE ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

const config = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST,
    database: process.env.MSSQL_DATABASE,
    port: parseInt(process.env.MSSQL_PORT),
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

const SECRET_KEY = 'your_jwt_secret_key';

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(async pool => {
        console.log('Connected to SQL Server');
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM Roles WHERE id = 'admin') INSERT INTO Roles (id, name, description) VALUES ('admin', 'Quản trị viên', 'Quyền cao nhất');
                IF NOT EXISTS (SELECT * FROM Roles WHERE id = 'user') INSERT INTO Roles (id, name, description) VALUES ('user', 'Nhân viên', 'Quyền cơ bản');

                IF NOT EXISTS (SELECT * FROM Permissions WHERE id = 'tx_view') INSERT INTO Permissions (id, name, code, [group]) VALUES ('tx_view', N'Xem giao dịch', 'TRANSACTION_VIEW', N'Giao dịch');
                IF NOT EXISTS (SELECT * FROM Permissions WHERE id = 'tx_create') INSERT INTO Permissions (id, name, code, [group]) VALUES ('tx_create', N'Thêm giao dịch', 'TRANSACTION_CREATE', N'Giao dịch');
                IF NOT EXISTS (SELECT * FROM Permissions WHERE id = 'tx_update') INSERT INTO Permissions (id, name, code, [group]) VALUES ('tx_update', N'Sửa giao dịch', 'TRANSACTION_UPDATE', N'Giao dịch');
                IF NOT EXISTS (SELECT * FROM Permissions WHERE id = 'tx_delete') INSERT INTO Permissions (id, name, code, [group]) VALUES ('tx_delete', N'Xoá giao dịch', 'TRANSACTION_DELETE', N'Giao dịch');
                IF NOT EXISTS (SELECT * FROM Permissions WHERE id = 'tx_approve') INSERT INTO Permissions (id, name, code, [group]) VALUES ('tx_approve', N'Duyệt giao dịch', 'TRANSACTION_APPROVE', N'Giao dịch');
                
                IF NOT EXISTS (SELECT * FROM Permissions WHERE id = 'settle_view') INSERT INTO Permissions (id, name, code, [group]) VALUES ('settle_view', N'Xem tất toán', 'SETTLEMENT_VIEW', N'Tất toán');
                IF NOT EXISTS (SELECT * FROM Permissions WHERE id = 'settle_manage') INSERT INTO Permissions (id, name, code, [group]) VALUES ('settle_manage', N'Thực hiện tất toán', 'SETTLEMENT_MANAGE', N'Tất toán');
                
                IF NOT EXISTS (SELECT * FROM Permissions WHERE id = 'report_view') INSERT INTO Permissions (id, name, code, [group]) VALUES ('report_view', N'Xem báo cáo', 'REPORT_VIEW', N'Báo cáo');
                
                IF NOT EXISTS (SELECT * FROM Permissions WHERE id = 'master_view') INSERT INTO Permissions (id, name, code, [group]) VALUES ('master_view', N'Xem dữ liệu nguồn', 'MASTER_DATA_VIEW', N'Dữ liệu nguồn');
                IF NOT EXISTS (SELECT * FROM Permissions WHERE id = 'master_manage') INSERT INTO Permissions (id, name, code, [group]) VALUES ('master_manage', N'Quản lý dữ liệu nguồn', 'MASTER_DATA_MANAGE', N'Dữ liệu nguồn');
                
                IF NOT EXISTS (SELECT * FROM Permissions WHERE id = 'rbac_manage') INSERT INTO Permissions (id, name, code, [group]) VALUES ('rbac_manage', N'Quản lý phân quyền', 'SYSTEM_MANAGE', N'Hệ thống');

                IF NOT EXISTS (SELECT * FROM RolePermissions WHERE roleId = 'admin')
                INSERT INTO RolePermissions (roleId, permissionId) SELECT 'admin', id FROM Permissions WHERE id NOT IN (SELECT permissionId FROM RolePermissions WHERE roleId = 'admin');

                IF NOT EXISTS (SELECT * FROM Users WHERE email = 'admin@gmail.com')
                INSERT INTO Users (id, email, username, password, fullName, role) VALUES (NEWID(), 'admin@gmail.com', 'admin', '123456', 'Admin System', 'admin');
            `);
            console.log('RBAC System Ready.');
        } catch (err) {
            console.error('Seeding error:', err.message);
        }
        return pool;
    })
    .catch(err => console.log('Database Connection Failed!', err));

// --- API ROUTES ---

// Auth
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body; // 'email' field now contains either email or username
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('loginId', sql.VarChar, email)
            .query('SELECT * FROM Users WHERE email = @loginId OR username = @loginId');

        const user = result.recordset[0];
        if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại' });

        const valid = (password === user.password) || (await bcrypt.compare(password, user.password));
        if (!valid) return res.status(401).json({ message: 'Mật khẩu không chính xác' });

        const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1d' });
        const perms = await pool.request().input('roleId', sql.VarChar, user.role).query('SELECT p.code FROM Permissions p JOIN RolePermissions rp ON p.id = rp.permissionId WHERE rp.roleId = @roleId');

        res.json({ token, user: { uid: user.id, email: user.email, fullName: user.fullName, role: user.role, permissions: perms.recordset.map(p => p.code) } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Generic Helper
const registerCrud = (tableName) => {
    const route = `/api/${tableName.toLowerCase()}`;

    // GET List
    app.get(route, async (req, res) => {
        try {
            const pool = await poolPromise;
            if (!pool) throw new Error('Cơ sở dữ liệu chưa sẵn sàng');
            const result = await pool.request().query(`SELECT * FROM ${tableName}`);
            res.json(result.recordset);
        } catch (err) {
            console.error(`Error in GET ${route}:`, err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // GET Single
    app.get(`${route}/:id`, async (req, res) => {
        try {
            const pool = await poolPromise;
            const result = await pool.request().input('id', sql.VarChar, req.params.id).query(`SELECT * FROM ${tableName} WHERE id = @id`);
            if (result.recordset[0]) res.json(result.recordset[0]);
            else res.status(404).json({ message: 'Not found' });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // PUT Update (Generic)
    app.put(`${route}/:id`, async (req, res) => {
        try {
            const pool = await poolPromise;
            const data = req.body;
            delete data.id; // Tránh update khóa chính

            let query = `UPDATE ${tableName} SET `;
            const request = pool.request().input('id', sql.VarChar, req.params.id);

            const sets = Object.keys(data).map((key, i) => {
                const val = data[key];
                // Sử dụng NVarChar cho tiếng Việt, Decimal cho số tiền
                if (typeof val === 'string') request.input(`param${i}`, sql.NVarChar, val);
                else if (typeof val === 'number') request.input(`param${i}`, sql.Decimal(18, 2), val);
                else request.input(`param${i}`, val);

                return `${key} = @param${i}`;
            });

            query += sets.join(', ') + ' WHERE id = @id';
            await request.query(query);
            res.json({ message: 'Updated' });
        } catch (err) {
            console.error(`Error updating ${tableName}:`, err.message);
            res.status(500).json({ error: err.message });
        }
    });
};

// Transactions
app.get('/api/transactions', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Transactions WHERE isDeleted = 0 ORDER BY date DESC');
        // Parse attachments JSON nếu có
        const records = result.recordset.map(row => ({
            ...row,
            attachments: row.attachments ? JSON.parse(row.attachments) : []
        }));
        res.json(records);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/transactions', async (req, res) => {
    try {
        const tx = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('date', sql.DateTime, tx.date)
            .input('type', sql.VarChar, tx.type)
            .input('amount', sql.Decimal(18, 2), tx.amount)
            .input('content', sql.NVarChar, tx.content)
            .input('categoryId', sql.VarChar, tx.categoryId)
            .input('unitId', sql.VarChar, tx.unitId)
            .input('partnerId', sql.VarChar, tx.partnerId)
            .input('quantity', sql.Decimal(18, 2), tx.quantity || 1)
            .input('unitPrice', sql.Decimal(18, 2), tx.unitPrice || 0)
            .input('receiver', sql.NVarChar, tx.receiver)
            .input('attachments', sql.NVarChar(sql.MAX), JSON.stringify(tx.attachments || []))
            .input('createdBy', sql.UniqueIdentifier, tx.createdBy)
            .query(`INSERT INTO Transactions (date, type, amount, content, categoryId, unitId, partnerId, quantity, unitPrice, receiver, attachments, createdBy) 
                    VALUES (@date, @type, @amount, @content, @categoryId, @unitId, @partnerId, @quantity, @unitPrice, @receiver, @attachments, @createdBy)`);
        res.json({ message: 'Created' });
    } catch (err) {
        console.error('Error adding transaction:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/transactions/:id', async (req, res) => {
    try {
        const tx = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.VarChar, req.params.id)
            .input('date', sql.DateTime, tx.date)
            .input('type', sql.VarChar, tx.type)
            .input('amount', sql.Decimal(18, 2), tx.amount)
            .input('content', sql.NVarChar, tx.content)
            .input('categoryId', sql.VarChar, tx.categoryId)
            .input('unitId', sql.VarChar, tx.unitId)
            .input('partnerId', sql.VarChar, tx.partnerId)
            .input('status', sql.VarChar, tx.status)
            .input('quantity', sql.Decimal(18, 2), tx.quantity)
            .input('unitPrice', sql.Decimal(18, 2), tx.unitPrice)
            .input('receiver', sql.NVarChar, tx.receiver)
            .input('attachments', sql.NVarChar(sql.MAX), JSON.stringify(tx.attachments || []))
            .query(`UPDATE Transactions SET date = @date, type = @type, amount = @amount, content = @content, 
                    categoryId = @categoryId, unitId = @unitId, partnerId = @partnerId, status = @status, 
                    quantity = @quantity, unitPrice = @unitPrice, receiver = @receiver, attachments = @attachments 
                    WHERE id = @id`);
        res.json({ message: 'Updated' });
    } catch (err) {
        console.error('Error updating transaction:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/transactions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[DELETE] Request to delete transaction ID: ${id}`);

        const pool = await poolPromise;
        if (!pool) throw new Error('Cơ sở dữ liệu chưa sẵn sàng');
        const result = await pool.request()
            .input('id', sql.VarChar, id) // Use VarChar for better string matching compatibility
            .query('UPDATE Transactions SET isDeleted = 1, deletedAt = GETDATE() WHERE id = @id');

        console.log(`[DELETE] Query success, rows affected:`, result.rowsAffected);

        if (result.rowsAffected[0] === 0) {
            console.warn(`[DELETE] No transaction found with ID: ${id}`);
            return res.status(404).json({ message: 'Không tìm thấy phiếu để xóa hoặc đã bị xóa trước đó' });
        }

        console.log(`[DELETE] Successfully soft-deleted transaction: ${id}`);
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error('[DELETE] Error in delete transaction:', err);
        res.status(500).json({ error: 'Lỗi máy chủ khi xóa phiếu: ' + err.message });
    }
});

// Workflow
app.post('/api/transactions/:id/approve', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('id', sql.UniqueIdentifier, req.params.id)
            .query("UPDATE Transactions SET status = 'approved', settledAt = GETDATE() WHERE id = @id");
        res.json({ message: 'Approved' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/transactions/:id/reject', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('id', sql.UniqueIdentifier, req.params.id)
            .query("UPDATE Transactions SET status = 'rejected' WHERE id = @id");
        res.json({ message: 'Rejected' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/transactions/:id/revoke', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('id', sql.UniqueIdentifier, req.params.id)
            .query("UPDATE Transactions SET status = 'pending', settledAt = NULL WHERE id = @id");
        res.json({ message: 'Revoked' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Categories
app.delete('/api/categories/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const check = await pool.request().input('id', sql.VarChar, req.params.id).query('SELECT COUNT(*) as count FROM Transactions WHERE categoryId = @id');
        if (check.recordset[0].count > 0) return res.status(400).json({ error: 'Hạng mục này đã được sử dụng trong giao dịch, không thể xóa.' });
        await pool.request().input('id', sql.VarChar, req.params.id).query('DELETE FROM Categories WHERE id = @id');
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
registerCrud('Categories');
app.post('/api/categories', async (req, res) => {
    try {
        const { id, name, type } = req.body;
        const pool = await poolPromise;
        await pool.request().input('id', sql.VarChar, id).input('name', sql.NVarChar, name).input('type', sql.VarChar, type).query('INSERT INTO Categories (id, name, type) VALUES (@id, @name, @type)');
        res.json({ message: 'Created' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Units
app.delete('/api/units/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const check = await pool.request().input('id', sql.VarChar, req.params.id).query('SELECT COUNT(*) as count FROM Transactions WHERE unitId = @id');
        if (check.recordset[0].count > 0) return res.status(400).json({ error: 'Đơn vị tính này đã được sử dụng trong giao dịch, không thể xóa.' });
        await pool.request().input('id', sql.VarChar, req.params.id).query('DELETE FROM Units WHERE id = @id');
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
registerCrud('Units');
app.post('/api/units', async (req, res) => {
    try {
        const { id, name } = req.body;
        const pool = await poolPromise;
        await pool.request().input('id', sql.VarChar, id).input('name', sql.NVarChar, name).query('INSERT INTO Units (id, name) VALUES (@id, @name)');
        res.json({ message: 'Created' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Partners
app.delete('/api/partners/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const check = await pool.request().input('id', sql.VarChar, req.params.id).query('SELECT COUNT(*) as count FROM Transactions WHERE partnerId = @id');
        if (check.recordset[0].count > 0) return res.status(400).json({ error: 'Đối tác này đã được sử dụng trong giao dịch, không thể xóa.' });
        await pool.request().input('id', sql.VarChar, req.params.id).query('DELETE FROM Partners WHERE id = @id');
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
registerCrud('Partners');
app.post('/api/partners', async (req, res) => {
    try {
        const { id, name, type, phone } = req.body;
        const pool = await poolPromise;
        await pool.request().input('id', sql.VarChar, id).input('name', sql.NVarChar, name).input('type', sql.VarChar, type).input('phone', sql.VarChar, phone).query('INSERT INTO Partners (id, name, type, phone) VALUES (@id, @name, @type, @phone)');
        res.json({ message: 'Created' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Users
app.get('/api/users', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT id, email, username, fullName, role FROM Users');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
    try {
        const { email, username, password, fullName, role } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        const pool = await poolPromise;
        await pool.request()
            .input('email', sql.VarChar, email)
            .input('username', sql.VarChar, username || email)
            .input('password', sql.VarChar, hashed)
            .input('fullName', sql.NVarChar, fullName)
            .input('role', sql.VarChar, role)
            .query('INSERT INTO Users (id, email, username, password, fullName, role) VALUES (NEWID(), @email, @username, @password, @fullName, @role)');
        res.json({ message: 'Created' });
    } catch (err) {
        console.error('Error adding user:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { email, fullName, role, password } = req.body;
        const pool = await poolPromise;
        let query = 'UPDATE Users SET email = @email, fullName = @fullName, role = @role';
        const request = pool.request().input('id', sql.UniqueIdentifier, req.params.id).input('email', sql.VarChar, email).input('fullName', sql.NVarChar, fullName).input('role', sql.VarChar, role);
        if (password) {
            const hashed = await bcrypt.hash(password, 10);
            request.input('password', sql.VarChar, hashed);
            query += ', password = @password';
        }
        query += ' WHERE id = @id';
        await request.query(query);
        res.json({ message: 'Updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const userId = req.params.id;

        // Kiểm tra xem user có giao dịch nào không
        const checkTx = await pool.request().input('id', sql.UniqueIdentifier, userId).query('SELECT COUNT(*) as count FROM Transactions WHERE createdBy = @id');
        if (checkTx.recordset[0].count > 0) {
            return res.status(400).json({ error: 'Không thể xóa người dùng này vì họ đã tạo các giao dịch. Hãy vô hiệu hóa tài khoản thay vì xóa.' });
        }

        await pool.request().input('id', sql.UniqueIdentifier, userId).query('DELETE FROM Users WHERE id = @id');
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Roles
app.get('/api/roles', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Roles');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/roles', async (req, res) => {
    try {
        const { id, name, description } = req.body;
        const pool = await poolPromise;
        await pool.request().input('id', sql.VarChar, id).input('name', sql.NVarChar, name).input('description', sql.NVarChar, description).query('INSERT INTO Roles (id, name, description) VALUES (@id, @name, @description)');
        res.json({ message: 'Created' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/roles/:id', async (req, res) => {
    try {
        const { name, description } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.VarChar, req.params.id)
            .input('name', sql.NVarChar, name)
            .input('description', sql.NVarChar, description)
            .query('UPDATE Roles SET name = @name, description = @description WHERE id = @id');
        res.json({ message: 'Updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/roles/:id', async (req, res) => {
    try {
        const roleId = req.params.id;
        if (roleId === 'admin') return res.status(400).json({ error: 'Không thể xóa vai trò Admin hệ thống' });

        const pool = await poolPromise;
        const checkUser = await pool.request().input('id', sql.VarChar, roleId).query('SELECT COUNT(*) as count FROM Users WHERE role = @id');
        if (checkUser.recordset[0].count > 0) return res.status(400).json({ error: 'Vai trò này đang có người dùng sử dụng' });

        await pool.request().input('id', sql.VarChar, roleId).query('DELETE FROM RolePermissions WHERE roleId = @id');
        await pool.request().input('id', sql.VarChar, roleId).query('DELETE FROM Roles WHERE id = @id');
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Permissions
app.get('/api/permissions', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Permissions');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/role-permissions/:roleId', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().input('roleId', sql.VarChar, req.params.roleId).query('SELECT permissionId FROM RolePermissions WHERE roleId = @roleId');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/role-permissions', async (req, res) => {
    try {
        const { roleId, permissionIds } = req.body;
        const pool = await poolPromise;
        const trans = new sql.Transaction(pool);
        await trans.begin();
        try {
            await trans.request().input('roleId', sql.VarChar, roleId).query('DELETE FROM RolePermissions WHERE roleId = @roleId');
            for (const pid of permissionIds) {
                await trans.request().input('roleId', sql.VarChar, roleId).input('pid', sql.VarChar, pid).query('INSERT INTO RolePermissions (roleId, permissionId) VALUES (@roleId, @pid)');
            }
            await trans.commit();
            res.json({ message: 'OK' });
        } catch (e) { await trans.rollback(); throw e; }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Catch-all
app.get('*splat', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(5001, () => {
    console.log('==============================================');
    console.log('--- SERVER PHIÊN BẢN MỚI ĐÃ SẴN SÀNG ---');
    console.log('ỨNG DỤNG THU CHI: http://localhost:5001');
    console.log('==============================================');
});
