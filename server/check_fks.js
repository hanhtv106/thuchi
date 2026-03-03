const sql = require('mssql');
require('dotenv').config();
const config = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST,
    database: process.env.MSSQL_DATABASE,
    port: parseInt(process.env.MSSQL_PORT),
    options: { encrypt: false, trustServerCertificate: true }
};
sql.connect(config).then(pool => {
    return pool.request().query(`
        SELECT 
            f.name AS ForeignKey,
            OBJECT_NAME(f.parent_object_id) AS TableName,
            COL_NAME(fc.parent_object_id, fc.parent_column_id) AS ColumnName,
            OBJECT_NAME(f.referenced_object_id) AS ReferenceTableName,
            COL_NAME(f.referenced_object_id, f.referenced_column_id) AS ReferenceColumnName
        FROM sys.foreign_keys AS f
        INNER JOIN sys.foreign_key_columns AS fc 
            ON f.OBJECT_ID = fc.constraint_object_id
        WHERE OBJECT_NAME(f.parent_object_id) = 'Transactions'
    `);
}).then(res => {
    console.log(JSON.stringify(res.recordset, null, 2));
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
