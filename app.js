//1. invocamos express
const express = require('express');
const app = express();
const nodemailer = require('nodemailer');
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'campusute.fii@unmsm.edu.pe',
        pass: 'Campus3217t'
    }
});
const PORT = process.env.PORT || 3000;
const environment = process.env.NODE_ENV || 'dev'
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

//2. seteamos urlencoded para capturar datos del formulario
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//3. invocamos a dotenv
const dotenv = require('dotenv');
dotenv.config({path:'./env/.env'});

//4. directorio del public
app.use('/resources', express.static('public'));
app.use('/resources', express.static(__dirname + 'public'));

app.use('/lte', express.static(__dirname + '/node_modules/admin-lte/plugin'));

//5. establecer motor de plantillas
app.set('view engine', 'ejs');

//6. invocamos a bcryptjs
const bcryptjs = require('bcryptjs');

//7. variables de sesion
const session = require('express-session');
app.use(session({
    secret:'secret',
    resave: true,
    saveUninitialized: true
}));

//8. Invocar conexion
const connection = require('./database/db');

//9. estableciendo rutas
app.get('/', (req, res) => {
    if(req.session.loggedin){
        if(req.session.admin){
            res.redirect('admin');
        }else{
            res.render('index', {name: req.session.name});
        }
    }else{
        res.render('login');
    }
})
app.get('/admin', (req, res) => {
    if(req.session.loggedin){
        if(req.session.admin){
            connection.query('SELECT * FROM wp_users u INNER JOIN wp_usermeta d ON u.ID = d.user_id WHERE d.meta_key = "user_english_level"', null, async (error, rows) => {
                res.render('admin', {name: req.session.name, data: rows});
            });
        }else{
            res.redirect('/');
        }
    }else{
        res.render('login');
    }
})
app.get('/register', (req, res) => {
    if(req.session.loggedin){
        if(req.session.admin){
            res.render('register', {name: req.session.name});
        }else{
            res.redirect('/');
        }
    }else{
        res.render('login');
    }
})
app.get('/login', (req, res) => { 
    if(req.session.loggedin){
        res.redirect('/');
    }else{
        res.render('login');
    }
})

//11. login
app.post('/auth', async (req, res) => {
    const user = req.body.user;
    const pass = req.body.pass;
    if(user && pass) {
        var hasher = require('wordpress-hash-node');
        connection.query('SELECT * FROM wp_users WHERE user_login = ?', [user], async (error, results) => {
            if( results.length == 0 || !(hasher.CheckPassword(pass, results[0].user_pass))){
                res.render('login', {
                    alert:true,
                    alertTitle: "Error",
                    alertMessage: "Usuario y/o contraseña incorrectas",
                    alertIcon: "error",
                    showConfirmButton: true,
                    timer: 100000,
                    ruta: 'login'
                });
            }else{
                req.session.loggedin = true;
                req.session.id = results[0].ID;
                req.session.name = results[0].user_login;
                wp_auth.getUserMetas( results[0].ID, [ 'wp_capabilities', 'first_name', 'last_name' ], function( data ) {
                    var ruta = '';
                    if( typeof data !== 'undefined' ){
                        req.session.name = data[0]['first_name'] + ' ' + data[1]['last_name'];
                        if( typeof data[2] !== 'undefined' ){
                            if( data[2]['wp_capabilities']['administrator'] ){
                                req.session.admin = true;
                                ruta = 'admin';
                            }
                        }
                    }
                    res.render('login', {
                        alert:true,
                        alertTitle: "Conexión exitosa",
                        alertMessage: "¡LOGIN CORRECTO!",
                        alertIcon: "success", 
                        showConfirmButton: true,
                        timer: 1500,
                        ruta: ruta
                    });
                } );
            }
        });
    }
});
//12. cerrar ssion
app.get('/exit', async (req, res) => {
    req.session.loggedin = false;
    req.session.id = null;
    req.session.name = null;
    req.session.admin = null;
    res.redirect('/');
});

let date_ob = new Date();

//13. challenge
app.post('/challenge', async (req, res) => {
    const first_name = req.body.first_name;
    const user_email = req.body.user_email;
    const user_english_level = req.body.user_english_level;
    if(first_name && user_email && user_english_level) {
        var hasher = require('wordpress-hash-node');
        connection.query('SELECT * FROM wp_users WHERE user_email = ?', [user_email], async (error, results) => {
            if( results.length == 0 ){
                const user_login = user_email.substring(0, user_email.indexOf("@"));
                var password = Math.random().toString(36).slice(-8);
                var hash = hasher.HashPassword(password);
                
                let date = date_time.getDate();
                let month = date_time.getMonth() + 1;
                let year = date_time.getFullYear();
                let hours = date_time.getHours();
                let minutes = date_time.getMinutes();
                let seconds = date_time.getSeconds();
                let user_registered = year + '-' + month + '-' + date + ' ' + hours + ':' + minutes + ':' + seconds;

                var sql = "INSERT INTO wp_users(user_login, user_pass, user_nicename, user_email, user_registered) VALUES (?, ? ,? ,?, ?)";
                connection.query( sql, [user_login, hash, user_login, user_email, user_registered], async ( err, rows ) => {
                    if (err) throw err;
                    wp_auth.setUserMeta( rows.insertId, 'nickname', first_name );
                    wp_auth.setUserMeta( rows.insertId, 'first_name', first_name );
                    wp_auth.setUserMeta( rows.insertId, 'last_name', '' );
                    //wp_auth.setUserMeta( rows.insertId, 'wp_capabilities', '');
                    wp_auth.setUserMeta( rows.insertId, 'user_english_level', user_english_level );
                    /*
                    var sql = "INSERT INTO wp_usermeta(user_id, meta_key, meta_value) VALUES (?, ? ,?), (?, ? ,?)";
                    connection.query( sql, [user_login, 'hash', user_login, user_email], async ( err, rows ) => {
                        if (err) throw err;
                    } );*/
                    transporter.sendMail({
                        from: '"WordPress" <campusute.fii@unmsm.edu.pe>',
                        to: user_email,
                        subject: 'Challenge - Canaway Academy',
                        text: 'Welcome! Your English level is: ' + user_english_level + '\n\nAccess your account here: http://localhost:3000/login and use these credentials:\n\nUsername: ' + user_login + '\nPassword: ' + password
                    }, (err, info) => {
                        //console.log(info.envelope);
                        //console.log(info.messageId);
                    });
                    res.render('register', {
                        alert:true,
                        alertTitle: "Operación exitosa",
                        alertMessage: "El usuario fue creado exitosamente.",
                        alertIcon: "success", 
                        showConfirmButton: true,
                        timer: 2000,
                        ruta: 'admin',
                        name: req.session.name
                    });
                } );              
            }else{
                wp_auth.setUserMeta( results[0].ID, 'user_english_level', user_english_level );
                transporter.sendMail({
                    from: '"WordPress" <campusute.fii@unmsm.edu.pe>',
                    to: user_email,
                    subject: 'Challenge - Canaway Academy',
                    text: 'Congratulations! Your English level is: ' + user_english_level + '\n\nAccess your account here: http://localhost:3000/login'
                }, (err, info) => {
                    //console.log(info.envelope);
                    //console.log(info.messageId);
                });
                res.render('register', {
                    alert:true,
                    alertTitle: "Operación exitosa",
                    alertMessage: "¡Nivel de ingles actualizado correctamente!",
                    alertIcon: "success", 
                    showConfirmButton: true,
                    timer: 2000,
                    ruta: 'admin',
                    name: req.session.name
                });
            }
        });
    }
});

/*
const wordpress = require("wordpress");
const client = wordpress.createClient({
    url: "http://localhost/canaway"
});
client.getPosts(function( error, posts ) {
	console.log( "Found " + posts.length + " posts!" );
});
console.log(wordpress);
*/
app.listen(PORT, (req, res) => {
    console.log('Server running: http://localhost:3000' ); 
});