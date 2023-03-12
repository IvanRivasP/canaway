const mysql = require('mysql2');
const connection = mysql.createConnection('mysql://root:6CGDC8LvKKOkPY8PsmTh@containers-us-west-179.railway.app:6875/railway');

connection.connect((error)=>{
    if(error) {
        console.log(error);
    }else{
        console.log('Estas conectado');
    }
});

const wp_auth = require('wp-auth').create({
    wpurl: 'https://canaway-production.up.railway.app/',
    logged_in_key: '%Ng-P$S$Z$mY;KsIcxz#A:ovfa@Z?/R;xjk2sJ$ch[ZpCp)Ea1Fp?I= =JK2(}<<',
    logged_in_salt: '/rqi+n8~<5U/D_2m=Zf4UX@d6y#}e_e|WX~g@r%T`P6wGO$[-+DDBsP.gH$5oZBr',
    mysql_host: 'containers-us-west-179.railway.app',
    mysql_user: 'root',
    mysql_pass: '6CGDC8LvKKOkPY8PsmTh',
    mysql_port: '6875',
    mysql_db: 'railway',
    wp_table_prefix: 'wp_' });

module.exports = {
    db: connection, // or whatever you want to assign it to
    wp_auth: wp_auth // again, set it to what you like
};