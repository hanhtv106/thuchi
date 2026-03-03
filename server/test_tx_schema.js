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
    pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Transactions'").then(res => {
        console.log('Transactions Columns:', res.recordset.map(r => `${r.COLUMN_NAME} (${r.DATA_TYPE})`));
        pool.close();
    });
}).catch(err => { console.error(err); });
