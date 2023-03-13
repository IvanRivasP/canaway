//1. invocamos express nodemailer y hash 
const express = require('express');
const app = express();
const nodemailer = require('nodemailer');
const hasher = require('wordpress-hash-node');
const PORT = process.env.PORT || 3000;
const environment = process.env.NODE_ENV || 'dev'

//2. seteamos urlencoded para capturar datos del formulario
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//3. invocamos a dotenv
const dotenv = require('dotenv');
dotenv.config({path:'./env/.env'});

//4. directorio del public
app.use('/resources', express.static('public'));
app.use('/resources', express.static(__dirname + 'public'));

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

var request = require('request');

/*
request.post(
    'http://localhost/canaway/wp-json/wp/v2/users',
    { json: { username: 'eder.rivas', email: 'irivasp@unmsm.edu.pe', password: '12345678'} },
    function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body);
        }
    }
);*/




//8. Invocar conexion y mailer
const connection = require('./database/db');
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_PASSWORD
    }
});

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
            /*
            request.get({
                url: 'http://localhost/canaway/wp-json/wp/v2/users',
                json: true
              }, function(error, response, body){
                req.session.users = body
                res.render('admin', {name: req.session.name, data: body});
              });
            */
            connection.db.query('SELECT u.`ID`, u.`user_login`, u.`user_email`, d.meta_value, ( SELECT meta_value FROM wp_usermeta WHERE user_id = d.user_id AND meta_key = "user_age"  ) AS "age" FROM wp_users u INNER JOIN wp_usermeta d ON u.ID = d.user_id WHERE d.meta_key = "user_english_level"', null, async (error, rows) => {
                req.session.users = rows;
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
        connection.db.query('SELECT * FROM wp_users WHERE user_login = ?', [user], async (error, results) => {
            if( results.length == 0 || !(hasher.CheckPassword(pass, results[0].user_pass))){
                res.render('login', {
                    alert:true,
                    alertTitle: "Error",
                    alertMessage: "Wrong credentials",
                    alertIcon: "error",
                    showConfirmButton: true,
                    timer: 100000,
                    ruta: 'login'
                });
            }else{
                req.session.loggedin = true;
                req.session.id = results[0].ID;
                req.session.name = results[0].user_login;
                connection.wp_auth.getUserMetas( results[0].ID, [ 'wp_capabilities', 'first_name', 'last_name' ], function( data ) {
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
                        alertTitle: "successful connection",
                        alertMessage: "¡CORRECT LOGIN!",
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
    const user_age = req.body.user_age;
    if(first_name && user_email && user_english_level) {
        var hasher = require('wordpress-hash-node');
        connection.db.query('SELECT * FROM wp_users WHERE user_email = ?', [user_email], async (error, results) => {
            if( results.length == 0 ){
                const user_login = user_email.substring(0, user_email.indexOf("@"));
                var password = Math.random().toString(36).slice(-8);
                var hash = hasher.HashPassword(password);
                /*
                let date = date_ob.getDate();
                let month = date_ob.getMonth() + 1;
                let year = date_ob.getFullYear();
                let hours = date_ob.getHours();
                let minutes = date_ob.getMinutes();
                let seconds = date_ob.getSeconds();
                let user_registered = year + '-' + month + '-' + date + ' ' + hours + ':' + minutes + ':' + seconds;*/

                request.post({
                    url: 'http://localhost/canaway/wp-json/wp/v2/users',
                    body: { username: user_login, email: user_email, password: password, first_name: first_name, last_name: ''},
                    json: true
                  }, function(error, response, body){
                    connection.wp_auth.setUserMeta( body.id, 'user_english_level', user_english_level );
                    connection.wp_auth.setUserMeta( body.id, 'user_age', user_age );
                    transporter.sendMail({
                        from: '"WordPress" <campusute.fii@unmsm.edu.pe>',
                        to: user_email,
                        subject: 'Challenge - Canaway Academy',
                        text: 'Welcome! Your English level is: ' + user_english_level + '\n\nAccess your account here: http://localhost/canaway/login and use these credentials:\n\nUsername: ' + user_login + '\nPassword: ' + password
                    }, (err, info) => {
                        //console.log(info.envelope);
                        //console.log(info.messageId);
                    });
                    res.render('register', {
                        alert:true,
                        alertTitle: "Successful operation",
                        alertMessage: "The user was created successfully.",
                        alertIcon: "success", 
                        showConfirmButton: true,
                        timer: 2000,
                        ruta: 'admin',
                        name: req.session.name
                    });
                });
                /*
                var sql = "INSERT INTO wp_users(user_login, user_pass, user_nicename, user_email, user_registered) VALUES (?, ? ,? ,?, ?)";
                connection.db.query( sql, [user_login, hash, user_login, user_email, user_registered], async ( err, rows ) => {
                    if (err) throw err;
                    connection.wp_auth.setUserMeta( rows.insertId, 'nickname', first_name );
                    connection.wp_auth.setUserMeta( rows.insertId, 'first_name', first_name );
                    connection.wp_auth.setUserMeta( rows.insertId, 'last_name', '' );
                    //connection.wp_auth.setUserMeta( rows.insertId, 'wp_capabilities', '');
                    connection.wp_auth.setUserMeta( rows.insertId, 'user_english_level', user_english_level );
                    /*
                    var sql = "INSERT INTO wp_usermeta(user_id, meta_key, meta_value) VALUES (?, ? ,?), (?, ? ,?)";
                    connection.db.query( sql, [user_login, 'hash', user_login, user_email], async ( err, rows ) => {
                        if (err) throw err;
                    } );
                    transporter.sendMail({
                        from: '"WordPress" <campusute.fii@unmsm.edu.pe>',
                        to: user_email,
                        subject: 'Challenge - Canaway Academy',
                        text: 'Welcome! Your English level is: ' + user_english_level + '\n\nAccess your account here: https://canaway-production.up.railway.app and use these credentials:\n\nUsername: ' + user_login + '\nPassword: ' + password
                    }, (err, info) => {
                        //console.log(info.envelope);
                        //console.log(info.messageId);
                    });
                    res.render('register', {
                        alert:true,
                        alertTitle: "Successful operation",
                        alertMessage: "The user was created successfully.",
                        alertIcon: "success", 
                        showConfirmButton: true,
                        timer: 2000,
                        ruta: 'admin',
                        name: req.session.name
                    });
                } );   */           
            }else{
                connection.wp_auth.setUserMeta( results[0].ID, 'user_english_level', user_english_level );
                connection.wp_auth.setUserMeta( results[0].ID, 'user_age', user_age );
                transporter.sendMail({
                    from: '"WordPress" <campusute.fii@unmsm.edu.pe>',
                    to: user_email,
                    subject: 'Challenge - Canaway Academy',
                    text: 'Congratulations! Your English level is: ' + user_english_level + '\n\nAccess your account here: http://localhost/canaway/login'
                }, (err, info) => {
                    //console.log(info.envelope);
                    //console.log(info.messageId);
                });
                res.render('register', {
                    alert:true,
                    alertTitle: "Successful operation",
                    alertMessage: "¡English level updated correctly!",
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

//14. Delete
app.post('/delete', async (req, res) => {
    const ID = req.body.ID;
    if(ID) {
        request.delete({
            url: 'http://localhost/canaway/wp-json/wp/v2/users/' + ID,
            body: { reassign: false, force: true },
            json: true
          }, function(error, response, body){
            res.render('admin', {
                alert:true,
                alertTitle: "Successful operation",
                alertMessage: "The user was deleted successfully.",
                alertIcon: "success", 
                showConfirmButton: true,
                timer: 2000,
                ruta: 'admin',
                name: req.session.name,
                data: req.session.users
            });
          });
          /*
        connection.db.query('DELETE `wp_usermeta`, `wp_users` FROM `wp_usermeta` JOIN `wp_users` ON `wp_usermeta`.user_id = `wp_users`.ID WHERE `wp_usermeta`.user_id = ?', [ID], async (error, results) => {
            res.render('admin', {
                alert:true,
                alertTitle: "Successful operation",
                alertMessage: "The user was deleted successfully.",
                alertIcon: "success", 
                showConfirmButton: true,
                timer: 2000,
                ruta: 'admin',
                name: req.session.name,
                data: req.session.users
            });
        });*/
    }
});

app.listen(PORT, (req, res) => {
    console.log('Server running: http://localhost:3000' ); 
});