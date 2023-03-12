const mysql = require('mysql2');
const connection = mysql.createConnection('mysql://root:6CGDC8LvKKOkPY8PsmTh@containers-us-west-179.railway.app:6875/railway');

connection.connect((error)=>{
    if(error) {
        console.log(error);
    }else{
        console.log('Estas conectado');
    }
});
module.exports = connection;