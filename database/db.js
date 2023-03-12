const mysql = require('mysql');
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE
});

connection.connect((error)=>{
    if(error) {
        console.log(error);
    }
    console.log('Estas conectado');
});
module.exports = connection;