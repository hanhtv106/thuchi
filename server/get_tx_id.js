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
    return pool.request().query("SELECT TOP 1 id FROM Transactions WHERE isDeleted = 0");
}).then(res => {
    console.log(JSON.stringify(res.recordset, null, 2));
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
