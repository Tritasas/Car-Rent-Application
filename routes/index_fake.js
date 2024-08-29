var express = require('express');
var dayjs = require('dayjs');
var locale_de = require('dayjs/locale/th')
var router = express.Router();
let formidable = require('formidable')
let fs = require('fs');
const axios = require('axios').default;
const multer = require('multer');

const url_api_employee_ite = 'https://hr.italthaiengineering.com/api_employee_ite';

const cookieParser = require('cookie-parser');
router.use(cookieParser('some_secret_1234'));
const cookieConfig = {
  httpOnly: true, 
  maxAge: 1000000000, 
  signed: true 
};

router.use(express.static(__dirname+"/public"));

let mysql = require('mysql');

////////////////////////////////////////////////////////////////////////////////////////////////////////

// Set up multer storage configuration
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/') // Destination folder for uploaded files
//   },
//   filename: function (req, file, cb) {
//     // Rename the file to prevent naming conflicts
//     cb(null, Date.now() + '-' + file.originalname);
//   }
// });

// // Initialize multer instance with the storage configuration
// const upload = multer({ storage: storage });

////////////////////////////////////////////////////////////////////////////////////////////////////////

// let condb = mysql.createConnection({
//   host : "localhost" , 
//   user : "root" ,
//   password : "" ,
//   database : "db_car_rent"
// })

// condb.connect( function(e){
//   if(e){
//     throw e ;
//   }
//   console.log("connect to db_car_rent success 123456");
// } )

// let url_now = "http://192.168.100.169:7011" // syntec-dis
// let url_now = "http://10.167.200.52:7011" // syntec-control
// let url_now = "http://172.16.5.148:7011" // syntec-office site 
let url_now = "http://10.161.200.223:7011" // syntec-office
let powerapps_link = `https://apps.powerapps.com/play/e/default-031562b8-dcd2-4b83-a934-909ce954f3ae/a/afc06fd8-dbaf-4756-89d5-9a2412ebc9e5?tenantId=031562b8-dcd2-4b83-a934-909ce954f3ae&hint=e1be904e-604c-4ab0-ba3f-89fb7eeeb478&sourcetime=1715157845081`

////////////////////////////////////////////////////////////////////////////////////////////////////////

let sessions = require("express-session");

router.use(sessions({
  secret : "secretcode" ,
  saveUninitialized : true ,
  cookie : { maxAge : 100 * 60 * 24 * 30 } , // 100 * 60 * 24 * 30 = 30 วัน
  resave : false
}))

router.use( function( req , res , next ){
  res.locals.session = req.session;
  next();
} )

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// const sql = require('mssql')

// let dbConfig = {
//   server : "" , 
//   database : "" , 
//   user : "" , 
//   password : "" , 
//   port : ""
// }

// getEmp()

// function getEmp(){
//   let conn = new sql.connect(dbConfig);
//   let req = new sql.Request(conn);

//   conn.connect( function(err){
//     if(err){ 
//       console.log("err") 
//       console.log(err)
//       return; 
//     }
//     req.query("SELECT * FROM emp" , function(err , result){
//       if(err){throw err}
//       console.log(result)
//       conn.close();
//     })
//   } )
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
router.get( "home" , function (req , res){
  res.send("Page Home")
} )

module.exports = router;
